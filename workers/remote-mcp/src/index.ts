/**
 * Frihet ERP — Remote MCP Server on Cloudflare Workers
 *
 * OAuth 2.0 + PKCE via @cloudflare/workers-oauth-provider
 * McpAgent (Durable Objects) for per-session MCP servers.
 *
 * Backward compatible: existing fri_* API key auth continues to work
 * via resolveExternalToken (Bearer, X-API-Key, query param).
 *
 * Endpoint: https://mcp.frihet.io/mcp
 * OAuth metadata: https://mcp.frihet.io/.well-known/oauth-authorization-server
 */

import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { registerAllTools } from "../../../src/tools/register-all.js";
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
    version: "1.1.0",
  });

  async init(): Promise<void> {
    const apiKey = this.props?.apiKey;
    if (!apiKey) {
      throw new Error("No API key in auth context");
    }
    const client = new FrihetClient(apiKey);
    // The worker and root project both use @modelcontextprotocol/sdk 1.26.0 but
    // TypeScript sees them as separate types due to different node_modules paths.
    // The private property mismatch prevents direct cast, so we bridge via unknown.
    // Structurally identical at runtime — this is safe.
    registerAllTools(
      this.server as unknown as Parameters<typeof registerAllTools>[0],
      client,
    );
  }
}

// ---------------------------------------------------------------------------
// OAuthProvider wraps the Worker — handles OAuth 2.0 + PKCE flow
// ---------------------------------------------------------------------------

export default new OAuthProvider({
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

    // Query param (deprecated)
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("api_key");
    if (queryKey?.startsWith("fri_")) {
      return {
        props: { apiKey: queryKey, locale: "es" } as AuthProps,
      };
    }

    return null;
  },
});
