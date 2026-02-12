/**
 * Barrel module that registers all 31 Frihet ERP tools on an McpServer.
 *
 * Used by both the local (stdio) and remote (Cloudflare Workers) servers
 * so tool definitions stay in sync — one source of truth.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IFrihetClient } from "../client-interface.js";
import { registerInvoiceTools } from "./invoices.js";
import { registerExpenseTools } from "./expenses.js";
import { registerClientTools } from "./clients.js";
import { registerProductTools } from "./products.js";
import { registerQuoteTools } from "./quotes.js";
import { registerWebhookTools } from "./webhooks.js";

export function registerAllTools(server: McpServer, client: IFrihetClient): void {
  registerInvoiceTools(server, client);
  registerExpenseTools(server, client);
  registerClientTools(server, client);
  registerProductTools(server, client);
  registerQuoteTools(server, client);
  registerWebhookTools(server, client);
}
