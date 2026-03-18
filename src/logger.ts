/**
 * Structured logging utility for the Frihet MCP server.
 *
 * Outputs JSON to stderr (MCP protocol uses stdout for messages).
 * Works in both Node.js (stdio) and Cloudflare Workers (fetch handler) environments.
 *
 * Set FRIHET_MCP_DEBUG=1 to enable debug-level logs.
 */

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service: "frihet-mcp";
  timestamp: string;
  tool?: string;
  operation?: string;
  durationMs?: number;
  error?: { message: string; code?: string; statusCode?: number };
  metadata?: Record<string, unknown>;
}

type LogInput = Omit<LogEntry, "service" | "timestamp">;

// Declared to avoid TS errors in Workers environment where `process` is not typed
declare const process: { env?: Record<string, string | undefined>; on?: unknown } | undefined;

/**
 * Returns true if debug logging is enabled.
 * Checks env var in Node.js; always false in Workers unless overridden.
 */
function isDebugEnabled(): boolean {
  // Node.js environment
  if (typeof process !== "undefined" && process?.env) {
    return process.env.FRIHET_MCP_DEBUG === "1" || process.env.FRIHET_MCP_DEBUG === "true";
  }
  return false;
}

/**
 * Emit a structured log entry as JSON to stderr.
 * In Cloudflare Workers, console.error automatically routes to Workers Logs.
 */
export function log(entry: LogInput): void {
  if (entry.level === "debug" && !isDebugEnabled()) {
    return;
  }

  const full: LogEntry = {
    ...entry,
    service: "frihet-mcp",
    timestamp: new Date().toISOString(),
  };

  // Remove undefined fields for cleaner output
  const cleaned = JSON.stringify(full, (_key, value) =>
    value === undefined ? undefined : value,
  );

  console.error(cleaned);
}

/**
 * Log the result of a tool call with timing.
 */
export function logToolCall(
  tool: string,
  startTime: number,
  success: boolean,
  error?: Error & { statusCode?: number; errorCode?: string },
): void {
  const durationMs = Math.round(Date.now() - startTime);

  if (!success && error) {
    log({
      level: "error",
      message: `Tool ${tool} failed`,
      tool,
      operation: "tool_call",
      durationMs,
      error: {
        message: error.message,
        code: error.errorCode ?? error.name,
        statusCode: error.statusCode,
      },
    });
  } else {
    log({
      level: "info",
      message: `Tool ${tool} completed`,
      tool,
      operation: "tool_call",
      durationMs,
    });
  }
}

/**
 * Log an outbound API call with timing.
 */
export function logApiCall(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
): void {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

  log({
    level,
    message: `${method} ${path} ${statusCode} ${durationMs}ms`,
    operation: "api_call",
    durationMs,
    metadata: { method, path, statusCode },
  });
}

/**
 * Log a rate-limit retry.
 */
export function logRetry(
  method: string,
  path: string,
  retryCount: number,
  delayMs: number,
): void {
  log({
    level: "warn",
    message: `Rate limited, retrying ${method} ${path} (attempt ${retryCount + 1}, delay ${delayMs}ms)`,
    operation: "api_retry",
    metadata: { method, path, retryCount: retryCount + 1, delayMs },
  });
}
