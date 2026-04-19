/**
 * Langfuse observability for Frihet MCP server.
 *
 * Uses direct HTTP POST to the Langfuse ingestion API (no SDK dependency)
 * so it works identically in Node.js (stdio) and Cloudflare Workers (edge).
 *
 * Design:
 *   - Fail-open: any Langfuse error logs a warning and lets the tool proceed.
 *   - PII: tool input content is passed as-is (business data is fine to trace).
 *     userId / apiKey metadata are hashed with a simple SHA-256 fingerprint.
 *   - Fire-and-forget: traces are sent via waitUntil (Workers) or unref'd promise
 *     (Node.js) so they never block tool responses.
 *
 * Environment variables (both Node.js stdio and Cloudflare Worker):
 *   LANGFUSE_PUBLIC_KEY   — pk-lf-...
 *   LANGFUSE_SECRET_KEY   — sk-lf-...
 *   LANGFUSE_BASE_URL     — https://langfuse.frihet.io (no trailing slash)
 *
 * Docs: https://langfuse.com/docs/api/reference/overview
 */

// Declared to avoid TS errors in Workers environment where `process` is not typed
declare const process: { env?: Record<string, string | undefined> } | undefined;

// ── Config resolution ────────────────────────────────────────────────────────

interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

function getConfig(): LangfuseConfig | null {
  let publicKey: string | undefined;
  let secretKey: string | undefined;
  let baseUrl: string | undefined;

  // Node.js
  if (typeof process !== "undefined" && process?.env) {
    publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    secretKey = process.env.LANGFUSE_SECRET_KEY;
    baseUrl = process.env.LANGFUSE_BASE_URL;
  }

  if (!publicKey || !secretKey || !baseUrl) return null;

  return { publicKey, secretKey, baseUrl: baseUrl.replace(/\/$/, "") };
}

// ── Worker env injection (for Cloudflare Workers) ───────────────────────────

let workerEnv: LangfuseConfig | null = null;

/**
 * Called once from FrihetMCP.init() in the Worker to inject env vars.
 * Not needed in Node.js stdio mode (reads from process.env directly).
 */
export function initLangfuse(config: {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
}): void {
  if (config.publicKey && config.secretKey && config.baseUrl) {
    workerEnv = {
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl.replace(/\/$/, ""),
    };
  }
}

function resolveConfig(): LangfuseConfig | null {
  return workerEnv ?? getConfig();
}

// ── PII helpers ──────────────────────────────────────────────────────────────

/**
 * One-way fingerprint for PII values (apiKey, userId, email).
 * Uses Web Crypto API (available in both Node.js ≥18 and Workers).
 */
async function hashPii(value: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch {
    return "[hash-error]";
  }
}

// ── Langfuse ingestion types ─────────────────────────────────────────────────

// Minimal Langfuse batch ingestion payload
interface LangfuseSpanBody {
  id: string;
  traceId: string;
  name: string;
  startTime: string;
  endTime: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  level?: "DEFAULT" | "DEBUG" | "WARNING" | "ERROR";
  statusMessage?: string;
}

interface LangfuseTraceBody {
  id: string;
  name: string;
  timestamp: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  tags?: string[];
  userId?: string;
}

interface IngestionBatch {
  batch: Array<{ type: string; id: string; timestamp: string; body: LangfuseTraceBody | LangfuseSpanBody }>;
}

// ── ID generation ────────────────────────────────────────────────────────────

function newId(): string {
  // crypto.randomUUID() available in Node.js ≥18 and all Workers
  return crypto.randomUUID();
}

// ── HTTP send ────────────────────────────────────────────────────────────────

async function sendBatch(config: LangfuseConfig, batch: IngestionBatch): Promise<void> {
  const credentials = btoa(`${config.publicKey}:${config.secretKey}`);

  const resp = await fetch(`${config.baseUrl}/api/public/ingestion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify(batch),
    signal: AbortSignal.timeout(5000),
  });

  if (!resp.ok) {
    // Log but don't throw — fail-open
    const body = await resp.text().catch(() => "");
    console.error(
      JSON.stringify({
        service: "frihet-mcp",
        level: "warn",
        message: `Langfuse ingestion failed: ${resp.status} ${body.slice(0, 200)}`,
        operation: "langfuse_send",
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

// ── Main trace function ──────────────────────────────────────────────────────

interface TraceContext {
  /** User-Agent from MCP client or other client identifier */
  clientName?: string;
  /** MCP protocol version */
  mcpVersion?: string;
  /** Frihet workspace/user ID — will be hashed */
  userId?: string;
}

// Module-level context set once per session (Workers: per DO init, Node.js: startup)
let _sessionContext: TraceContext = {};

/**
 * Set session-level context (client identity, MCP version).
 * Call once from server init; applies to all subsequent traces.
 */
export function setTraceContext(ctx: TraceContext): void {
  _sessionContext = { ..._sessionContext, ...ctx };
}

/**
 * Wraps a tool handler fn and sends a Langfuse trace+span for the call.
 *
 * Fail-open: if Langfuse is not configured or errors, fn runs unchanged.
 * Fire-and-forget: Langfuse POST never blocks the tool response.
 *
 * @param toolName  Tool name (e.g. "create_invoice")
 * @param input     Raw tool input args
 * @param fn        Async tool handler to wrap
 * @returns         Result of fn
 */
export async function traceMCPTool<T>(
  toolName: string,
  input: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const config = resolveConfig();

  // No config — pass through silently
  if (!config) {
    return fn();
  }

  const traceId = newId();
  const spanId = newId();
  const startTime = new Date();

  let result: T;
  let isError = false;
  let errorMessage: string | undefined;
  let output: unknown;

  try {
    result = await fn();
    output = result;
    return result;
  } catch (err) {
    isError = true;
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const endTime = new Date();

    // Fire-and-forget — build and send async, never awaited
    void (async () => {
      try {
        // Hash PII fields
        const userIdRaw = _sessionContext.userId;
        const userIdHashed = userIdRaw ? await hashPii(userIdRaw) : undefined;

        const traceBody: LangfuseTraceBody = {
          id: traceId,
          name: "mcp_request",
          timestamp: startTime.toISOString(),
          input: { tool: toolName, args: input },
          output: isError ? { error: errorMessage } : output,
          metadata: {
            tool: toolName,
            clientName: _sessionContext.clientName,
            mcpVersion: _sessionContext.mcpVersion,
            success: !isError,
          },
          tags: [`mcp.tool.${toolName}`],
          ...(userIdHashed ? { userId: userIdHashed } : {}),
        };

        const spanBody: LangfuseSpanBody = {
          id: spanId,
          traceId,
          name: `tool.${toolName}`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          input,
          output: isError ? { error: errorMessage } : output,
          metadata: {
            durationMs: endTime.getTime() - startTime.getTime(),
            clientName: _sessionContext.clientName,
            mcpVersion: _sessionContext.mcpVersion,
          },
          level: isError ? "ERROR" : "DEFAULT",
          ...(isError && errorMessage ? { statusMessage: errorMessage } : {}),
        };

        const batch: IngestionBatch = {
          batch: [
            {
              type: "trace-create",
              id: newId(),
              timestamp: startTime.toISOString(),
              body: traceBody,
            },
            {
              type: "span-create",
              id: newId(),
              timestamp: startTime.toISOString(),
              body: spanBody,
            },
          ],
        };

        await sendBatch(config, batch);
      } catch (langfuseErr) {
        // Fail-open: log warn only
        console.error(
          JSON.stringify({
            service: "frihet-mcp",
            level: "warn",
            message: `Langfuse trace failed (non-blocking): ${langfuseErr instanceof Error ? langfuseErr.message : String(langfuseErr)}`,
            operation: "langfuse_trace",
            timestamp: new Date().toISOString(),
          }),
        );
      }
    })();
  }
}
