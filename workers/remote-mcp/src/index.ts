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
import { log } from "../../../src/logger.js";
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
    version: "1.2.3",
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
    const client = new FrihetClient(apiKey);

    // The worker and root project both use @modelcontextprotocol/sdk 1.26.0 but
    // TypeScript sees them as separate types due to different node_modules paths.
    // The private property mismatch prevents direct cast, so we bridge via unknown.
    // Structurally identical at runtime — this is safe.
    const server = this.server as unknown as Parameters<typeof registerAllTools>[0];

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

// Wrap OAuthProvider to handle HEAD + favicon before OAuth routing
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const startTime = Date.now();

    // HEAD requests -> 200 (required by Anthropic)
    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // OpenAI domain verification
    if (url.pathname === "/.well-known/openai-apps-challenge") {
      return new Response("n1HADESagZNO49wuoz8r9exBEq9GODR5bcno1DFveT4", {
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

    // Health check with real API connectivity test
    if (url.pathname === "/health") {
      const checks: Record<string, { status: string; latencyMs?: number }> = {};

      try {
        const apiStart = Date.now();
        const apiRes = await fetch("https://api.frihet.io/v1/health", {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        checks.api = {
          status: apiRes.ok ? "ok" : "degraded",
          latencyMs: Math.round(Date.now() - apiStart),
        };
      } catch {
        checks.api = { status: "unreachable" };
      }

      const overallStatus = Object.values(checks).every((c) => c.status === "ok")
        ? "ok"
        : "degraded";

      return new Response(
        JSON.stringify({
          status: overallStatus,
          checks,
          version: "1.2.4",
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

    return response;
  },
} satisfies ExportedHandler<Env>;
