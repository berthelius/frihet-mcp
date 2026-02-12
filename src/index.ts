#!/usr/bin/env node

/**
 * Frihet MCP Server
 *
 * Model Context Protocol server for Frihet ERP.
 * Provides AI-powered access to invoices, expenses, clients, products, quotes, and webhooks.
 *
 * Authentication: Set the FRIHET_API_KEY environment variable with your Frihet API key.
 * Transport: stdio (designed for CLI tools like Claude Code, Cursor, Windsurf).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { FrihetClient } from "./client.js";
import { registerAllTools } from "./tools/register-all.js";

function main(): void {
  const apiKey = process.env.FRIHET_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: FRIHET_API_KEY environment variable is required.\n" +
        "Set it in your MCP configuration or export it in your shell.\n\n" +
        "Example:\n" +
        '  export FRIHET_API_KEY="fri_your_api_key_here"\n',
    );
    process.exit(1);
  }

  const baseUrl = process.env.FRIHET_API_URL;
  const client = new FrihetClient(apiKey, baseUrl);

  const server = new McpServer({
    name: "frihet-erp",
    version: "1.0.0",
  });

  // Register all 31 tools
  registerAllTools(server, client);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error("Frihet MCP server running on stdio");
  }).catch((error: unknown) => {
    console.error("Failed to start Frihet MCP server:", error);
    process.exit(1);
  });
}

main();
