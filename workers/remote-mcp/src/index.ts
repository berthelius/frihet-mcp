/**
 * Frihet ERP — Remote MCP Server on Cloudflare Workers
 *
 * Streamable HTTP transport via @modelcontextprotocol/sdk WebStandard transport.
 * No local install needed — connect from any MCP client.
 *
 * Endpoint: https://mcp.frihet.io/mcp  (POST for tool calls, GET for SSE, DELETE to end session)
 *
 * Auth: pass your Frihet API key via:
 *   - Authorization: Bearer fri_xxx
 *   - X-API-Key: fri_xxx
 *   - ?api_key=fri_xxx query param (deprecated — use headers instead)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { FrihetClient } from "./client.js";
import { registerAllTools } from "../../../src/tools/register-all.js";

// ---------------------------------------------------------------------------
// Auth extraction
// ---------------------------------------------------------------------------

function extractApiKey(request: Request): { key: string | null; method: 'bearer' | 'header' | 'query' | null } {
  // 1. Authorization: Bearer fri_xxx
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return { key: token, method: 'bearer' };
  }

  // 2. X-API-Key: fri_xxx
  const xApiKey = request.headers.get("X-API-Key");
  if (xApiKey) return { key: xApiKey, method: 'header' };

  // 3. ?api_key=fri_xxx query param (deprecated — use headers instead)
  const url = new URL(request.url);
  const paramKey = url.searchParams.get("api_key");
  if (paramKey) return { key: paramKey, method: 'query' };

  return { key: null, method: null };
}

/** Add deprecation headers when query param auth was used. */
function addDeprecationHeaders(headers: Headers, authMethod: string | null): void {
  if (authMethod === 'query') {
    headers.set('Deprecation', 'true');
    headers.set('X-Frihet-Warning', 'Query parameter authentication is deprecated. Use Authorization: Bearer or X-API-Key headers instead.');
  }
}

// ---------------------------------------------------------------------------
// Server factory — fresh per request (stateless Workers)
// ---------------------------------------------------------------------------

function createServerForKey(apiKey: string): McpServer {
  const client = new FrihetClient(apiKey);
  const server = new McpServer({
    name: "frihet-erp",
    version: "1.0.0",
  });
  registerAllTools(server, client);
  return server;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://claude.ai',
  'https://app.frihet.io',
  'https://frihet.io',
  'https://cursor.sh',
  'https://www.cursor.sh',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  // For non-browser clients (stdio MCP, curl, etc.) — no Origin header
  // Return first allowed origin as default (browsers will reject mismatch)
  return ALLOWED_ORIGINS[0];
}

function getCorsHeaders(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, mcp-session-id, MCP-Protocol-Version",
    "Access-Control-Expose-Headers": "mcp-session-id, Deprecation, X-Frihet-Warning",
  };
}

function withCors(response: Response, request: Request, authMethod?: string | null): Response {
  const corsHeaders = getCorsHeaders(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  if (authMethod) addDeprecationHeaders(headers, authMethod);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body: unknown, status = 200, request?: Request, authMethod?: string | null): Response {
  const corsHeaders = request ? getCorsHeaders(request) : getCorsHeaders(new Request('https://mcp.frihet.io'));
  const headers: Record<string, string> = { "Content-Type": "application/json", ...corsHeaders };
  const response = new Response(JSON.stringify(body), { status, headers });
  if (authMethod) addDeprecationHeaders(response.headers, authMethod);
  return response;
}

// ---------------------------------------------------------------------------
// Worker entry
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    // Health check / info endpoint
    if (url.pathname === "/" || url.pathname === "/health") {
      return jsonResponse({
        name: "frihet-erp",
        version: "1.0.0",
        transport: "streamable-http",
        description: "Frihet ERP MCP Server — Remote (Cloudflare Workers)",
        tools: 31,
        resources: ["invoices", "expenses", "clients", "products", "quotes", "webhooks"],
        auth: {
          methods: [
            "Authorization: Bearer <api_key>",
            "X-API-Key: <api_key>",
            "?api_key=<api_key>",
          ],
        },
        endpoints: {
          mcp: "https://mcp.frihet.io/mcp",
          health: "https://mcp.frihet.io/health",
        },
      }, 200, request);
    }

    // Only /mcp path handles MCP protocol
    if (url.pathname !== "/mcp") {
      return jsonResponse(
        { error: "not_found", message: "Use /mcp for MCP protocol, / for server info." },
        404,
        request,
      );
    }

    // Extract API key
    const { key: apiKey, method: authMethod } = extractApiKey(request);
    if (!apiKey) {
      return jsonResponse(
        {
          error: "authentication_required",
          message:
            "Frihet API key is required. Pass via Authorization: Bearer <key>, X-API-Key header, or ?api_key= query param.",
        },
        401,
        request,
      );
    }

    try {
      // Create fresh MCP server + transport per request (stateless)
      const server = createServerForKey(apiKey);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode — no sessions
      });

      // Connect and handle
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      return withCors(response, request, authMethod);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return jsonResponse({ error: "server_error", message }, 500, request, authMethod);
    }
  },
};
