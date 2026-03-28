/**
 * Barrel module that registers all 53 Frihet ERP tools on an McpServer.
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
import { registerVendorTools } from "./vendors.js";
import { registerWebhookTools } from "./webhooks.js";
import { registerIntelligenceTools } from "./intelligence.js";
import { registerCrmTools } from "./crm.js";

export function registerAllTools(server: McpServer, client: IFrihetClient): void {
  registerIntelligenceTools(server, client);
  registerInvoiceTools(server, client);
  registerExpenseTools(server, client);
  registerClientTools(server, client);
  registerCrmTools(server, client);
  registerProductTools(server, client);
  registerQuoteTools(server, client);
  registerVendorTools(server, client);
  registerWebhookTools(server, client);
}
