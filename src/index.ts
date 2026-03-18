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
import { registerAllResources } from "./resources/register-all.js";
import { registerAllPrompts } from "./prompts/register-all.js";
import { log } from "./logger.js";
import { registerShutdownHook } from "./metrics.js";

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

  if (baseUrl !== undefined) {
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      console.error(
        `Error: FRIHET_API_URL is not a valid URL: "${baseUrl}"\n` +
          "It must be a valid https:// URL with a frihet.io hostname.\n",
      );
      process.exit(1);
    }

    if (parsed.protocol !== "https:") {
      console.error(
        `Error: FRIHET_API_URL must use https:// (got "${parsed.protocol}").\n`,
      );
      process.exit(1);
    }

    if (!parsed.hostname.endsWith("frihet.io")) {
      console.error(
        `Error: FRIHET_API_URL hostname must be under frihet.io (got "${parsed.hostname}").\n` +
          "This prevents redirection to untrusted servers.\n",
      );
      process.exit(1);
    }
  }

  const client = new FrihetClient(apiKey, baseUrl);

  const server = new McpServer({
    name: "frihet-erp",
    version: "1.3.1",
    description:
      "AI-native MCP server for Frihet ERP — invoices, expenses, clients, products, quotes, and webhooks. " +
      "Provides 31 tools, 5 resources (tax rates, calendar, expense categories, invoice statuses, API schema), " +
      "and 5 workflow prompts for business management with full Spanish tax compliance (IVA, IGIC, IPSI).",
  });

  // Register all 31 tools
  registerAllTools(server, client);

  // Register 5 static resources (tax rates, calendar, categories, statuses, API schema)
  registerAllResources(server);

  // Register 5 workflow prompts (monthly close, onboard client, tax prep, overdue follow-up, expense batch)
  registerAllPrompts(server);

  // Register shutdown hook to log final metrics summary
  registerShutdownHook();

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error("[frihet-mcp] v1.3.1 | 31 tools | https://github.com/Frihet-io/frihet-mcp");
    log({
      level: "info",
      message: "Frihet MCP server running on stdio",
      operation: "startup",
      metadata: { version: "1.3.1", transport: "stdio" },
    });
  }).catch((error: unknown) => {
    log({
      level: "error",
      message: "Failed to start Frihet MCP server",
      operation: "startup",
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    process.exit(1);
  });
}

main();
