/**
 * Frihet ERP — Remote MCP Server on Cloudflare Workers
 *
 * OAuth 2.0 + PKCE via @cloudflare/workers-oauth-provider
 * McpAgent (Durable Objects) for per-session MCP servers.
 *
 * Backward compatible: existing fri_* API key auth continues to work
 * via resolveExternalToken (Bearer, X-API-Key header).
 *
 * Endpoint: https://mcp.frihet.io/mcp
 * OAuth metadata: https://mcp.frihet.io/.well-known/oauth-authorization-server
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { registerAllTools } from "../../../src/tools/register-all.js";
import { registerAllResources } from "../../../src/resources/register-all.js";
import { registerAllPrompts } from "../../../src/prompts/register-all.js";
import { applyOpenAIProfile, OPENAI_EXCLUDED_COUNT, OPENAI_CSP } from "../../../src/openai-profile.js";
import { log } from "../../../src/logger.js";
import { initLangfuse, setTraceContext } from "../../../src/observability.js";
import { FrihetClient } from "./client.js";
import { authHandler } from "./auth-handler.js";

// ---------------------------------------------------------------------------
// Auth props — stored in OAuth token, available via this.props in McpAgent
// ---------------------------------------------------------------------------

export type AuthProps = {
  apiKey: string;
  locale: string;
  userId?: string;
  email?: string;
  name?: string;
};

// ---------------------------------------------------------------------------
// McpAgent — one Durable Object per authenticated session
// ---------------------------------------------------------------------------

export class FrihetMCP extends McpAgent<Env, Record<string, never>, AuthProps> {
  server = new McpServer({
    name: "Frihet",
    version: "1.5.2",
  });

  async init(): Promise<void> {
    const apiKey = this.props?.apiKey;
    if (!apiKey) {
      throw new Error("No API key in auth context");
    }
    log({
      level: "info",
      message: "MCP session initialized",
      operation: "session_init",
      metadata: {
        userId: this.props?.userId,
        email: this.props?.email,
        locale: this.props?.locale,
      },
    });

    // Inject Langfuse config from Worker env vars and set per-session trace context.
    // Uses env bindings (not process.env) since Workers don't have a process object.
    initLangfuse({
      publicKey: this.env.LANGFUSE_PUBLIC_KEY,
      secretKey: this.env.LANGFUSE_SECRET_KEY,
      baseUrl: this.env.LANGFUSE_BASE_URL,
    });
    setTraceContext({
      userId: this.props?.userId ?? this.props?.email,
      mcpVersion: "mcp/1.0",
    });

    const client = new FrihetClient(apiKey);

    // The worker and root project both use @modelcontextprotocol/sdk 1.26.0 but
    // TypeScript sees them as separate types due to different node_modules paths.
    // The private property mismatch prevents direct cast, so we bridge via unknown.
    // Structurally identical at runtime — this is safe.
    const server = this.server as unknown as Parameters<typeof registerAllTools>[0];

    // Apply OpenAI-safe profile if this worker is deployed in OpenAI mode
    const openaiMode = this.env.FRIHET_OPENAI_MODE === "true";
    if (openaiMode) {
      applyOpenAIProfile(server);
      log({
        level: "info",
        message: `OpenAI safety profile active — ${OPENAI_EXCLUDED_COUNT} tools excluded`,
        operation: "session_init",
      });
    }

    registerAllTools(server, client);
    registerAllResources(server);
    registerAllPrompts(server);
  }
}

// ---------------------------------------------------------------------------
// OAuthProvider wraps the Worker — handles OAuth 2.0 + PKCE flow
// ---------------------------------------------------------------------------

const oauthProvider = new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: FrihetMCP.serve("/mcp"),
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: ["read", "write"],
  accessTokenTTL: 3600,
  refreshTokenTTL: 2592000,
  allowPlainPKCE: false,

  // Backward compat: accept fri_* API keys directly without OAuth flow
  resolveExternalToken: async ({
    token,
    request,
  }: {
    token?: string;
    request: Request;
  }) => {
    // Bearer fri_xxx
    if (token?.startsWith("fri_")) {
      return {
        props: { apiKey: token, locale: "es" } as AuthProps,
      };
    }

    // X-API-Key header (existing pattern)
    const xApiKey = request.headers.get("x-api-key");
    if (xApiKey?.startsWith("fri_")) {
      return {
        props: { apiKey: xApiKey, locale: "es" } as AuthProps,
      };
    }

    return null;
  },
});

// Frihet favicon — black circle (#171717)
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><circle cx="250" cy="250" r="230" fill="#171717"/></svg>`;

/** Security headers applied to every response */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Build security headers — adds CSP in OpenAI mode */
function getSecurityHeaders(env: Env): Record<string, string> {
  const headers = { ...BASE_SECURITY_HEADERS };
  if (env.FRIHET_OPENAI_MODE === "true") {
    headers["Content-Security-Policy"] = OPENAI_CSP;
  }
  return headers;
}

/** Clone a response adding security headers (immutable Response workaround) */
function withSecurityHeaders(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(getSecurityHeaders(env))) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Wrap OAuthProvider to handle HEAD + favicon before OAuth routing
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const startTime = Date.now();

    // HEAD requests -> 200 (required by Anthropic)
    if (request.method === "HEAD") {
      return withSecurityHeaders(new Response(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }), env);
    }

    // OpenAI domain verification
    if (url.pathname === "/.well-known/openai-apps-challenge") {
      return new Response("giPs9CNX4aJdxwXd1eeMzHIQm2FvFrJ4RkSlWs_bLEE", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Favicon: .ico redirects to main site's real ICO, .svg served inline
    if (url.pathname === "/favicon.ico") {
      return Response.redirect("https://frihet.io/favicon.ico", 301);
    }
    if (url.pathname === "/favicon.svg") {
      return new Response(FAVICON_SVG, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Health check — checks MCP server + upstream API (direct to Firebase, not via proxy)
    if (url.pathname === "/health") {
      const checks: Record<string, { status: string; latencyMs?: number; statusCode?: number }> = {};

      // Check upstream API directly (bypass api.frihet.io proxy — same-zone Worker fetch returns 522)
      const UPSTREAM_HEALTH = "https://us-central1-gen-lang-client-0335716041.cloudfunctions.net/publicApi/health";
      try {
        const apiStart = Date.now();
        const apiRes = await fetch(UPSTREAM_HEALTH, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        checks.api = {
          status: apiRes.status < 500 ? "ok" : "degraded",
          latencyMs: Math.round(Date.now() - apiStart),
          statusCode: apiRes.status,
        };
      } catch {
        checks.api = { status: "unreachable" };
      }

      // MCP Durable Object is always healthy if this Worker is responding
      checks.mcp = { status: "ok" };

      const overallStatus = Object.values(checks).every((c) => c.status === "ok")
        ? "ok"
        : "degraded";

      return new Response(
        JSON.stringify({
          status: overallStatus,
          checks,
          version: "1.5.2",
          timestamp: new Date().toISOString(),
        }),
        {
          status: overallStatus === "ok" ? 200 : 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const response = await oauthProvider.fetch(request, env, ctx);

    // Log all non-trivial requests (skip favicons, static assets)
    const durationMs = Math.round(Date.now() - startTime);
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    log({
      level: response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info",
      message: `${request.method} ${url.pathname} ${response.status} ${durationMs}ms`,
      operation: "http_request",
      durationMs,
      metadata: {
        method: request.method,
        path: url.pathname,
        statusCode: response.status,
        userAgent,
      },
    });

    return withSecurityHeaders(response, env);
  },
} satisfies ExportedHandler<Env>;
