/**
 * All 31 MCP tools for Frihet ERP.
 * Inlined for Cloudflare Workers (mirrors the stdio server's tool registrations).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FrihetClient, FrihetApiError, type PaginatedResponse } from "./client.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function handleToolError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (error instanceof FrihetApiError) {
    const messages: Record<number, string> = {
      400: "Bad request. Check your input parameters.",
      401: "Authentication failed. Check your API key.",
      403: "Access denied. Your API key does not have permission.",
      404: "Resource not found.",
      429: "Rate limit exceeded. Try again later.",
      500: "Internal server error. Try again later.",
    };
    const friendly = messages[error.statusCode] ?? `API error ${error.statusCode}: ${error.message}`;
    return {
      content: [{ type: "text", text: `Error: ${friendly}${error.message ? `\nDetails: ${error.message}` : ""}` }],
      isError: true,
    };
  }
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

function formatPaginated(name: string, res: PaginatedResponse<Record<string, unknown>>): string {
  const lines = [`Found ${res.total} ${name} (showing ${res.data.length}, offset ${res.offset}):\n`];
  for (const item of res.data) {
    lines.push(JSON.stringify(item, null, 2), "---");
  }
  if (res.total > res.offset + res.data.length) {
    lines.push(`More results available. Use offset=${res.offset + res.data.length} to see the next page.`);
  }
  return lines.join("\n");
}

function formatRecord(label: string, record: Record<string, unknown>): string {
  return `${label}:\n${JSON.stringify(record, null, 2)}`;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const invoiceItemSchema = z.object({
  description: z.string().describe("Description of the line item"),
  quantity: z.number().describe("Quantity"),
  unitPrice: z.number().describe("Unit price in EUR"),
});

const quoteItemSchema = z.object({
  description: z.string().describe("Description of the line item"),
  quantity: z.number().describe("Quantity"),
  unitPrice: z.number().describe("Unit price in EUR"),
});

const addressSchema = z
  .object({
    street: z.string().optional().describe("Street address"),
    city: z.string().optional().describe("City"),
    postalCode: z.string().optional().describe("Postal code"),
    country: z.string().optional().describe("Country ISO code"),
  })
  .optional()
  .describe("Client address");

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerAllTools(server: McpServer, client: FrihetClient): void {
  // ===== INVOICES (6 tools) =====

  server.registerTool(
    "list_invoices",
    {
      title: "List Invoices",
      description: "List all invoices with optional pagination. Returns a paginated list sorted by creation date.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results per page (1-100, default 50)"),
        offset: z.number().int().min(0).optional().describe("Number of results to skip"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listInvoices({ limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated("invoices", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get Invoice",
      description: "Get a single invoice by its ID. Returns the full invoice including line items, totals, and status.",
      inputSchema: {
        id: z.string().describe("Invoice ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getInvoice(id);
        return { content: [{ type: "text" as const, text: formatRecord("Invoice", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "create_invoice",
    {
      title: "Create Invoice",
      description: "Create a new invoice. Requires client name and at least one line item. Invoice number is auto-generated.",
      inputSchema: {
        clientName: z.string().describe("Client/customer name"),
        items: z.array(invoiceItemSchema).min(1).describe("Line items"),
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().describe("Invoice status (default: draft)"),
        dueDate: z.string().optional().describe("Due date ISO 8601 (YYYY-MM-DD)"),
        notes: z.string().optional().describe("Additional notes"),
        taxRate: z.number().min(0).max(100).optional().describe("Tax rate % (e.g. 21 for 21% IVA)"),
      },
    },
    async (input) => {
      try {
        const result = await client.createInvoice(input);
        return { content: [{ type: "text" as const, text: formatRecord("Invoice created", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "update_invoice",
    {
      title: "Update Invoice",
      description: "Update an existing invoice. Only the provided fields will be changed.",
      inputSchema: {
        id: z.string().describe("Invoice ID"),
        clientName: z.string().optional().describe("Client name"),
        items: z.array(invoiceItemSchema).min(1).optional().describe("Line items"),
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().describe("Invoice status"),
        dueDate: z.string().optional().describe("Due date (YYYY-MM-DD)"),
        notes: z.string().optional().describe("Notes"),
        taxRate: z.number().min(0).max(100).optional().describe("Tax rate %"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateInvoice(id, data);
        return { content: [{ type: "text" as const, text: formatRecord("Invoice updated", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_invoice",
    {
      title: "Delete Invoice",
      description: "Permanently delete an invoice by its ID. This action cannot be undone.",
      inputSchema: {
        id: z.string().describe("Invoice ID"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteInvoice(id);
        return { content: [{ type: "text" as const, text: `Invoice ${id} deleted successfully.` }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "search_invoices",
    {
      title: "Search Invoices",
      description: "Search invoices by client name. Useful for finding all invoices for a specific client.",
      inputSchema: {
        clientName: z.string().describe("Client name to search for"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results"),
        offset: z.number().int().min(0).optional().describe("Offset"),
      },
    },
    async ({ clientName, limit, offset }) => {
      try {
        const result = await client.searchInvoices(clientName, { limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated(`invoices matching "${clientName}"`, result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // ===== EXPENSES (5 tools) =====

  server.registerTool(
    "list_expenses",
    {
      title: "List Expenses",
      description: "List all expenses with optional pagination.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100)"),
        offset: z.number().int().min(0).optional().describe("Offset"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listExpenses({ limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated("expenses", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "get_expense",
    {
      title: "Get Expense",
      description: "Get a single expense by its ID.",
      inputSchema: {
        id: z.string().describe("Expense ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getExpense(id);
        return { content: [{ type: "text" as const, text: formatRecord("Expense", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "create_expense",
    {
      title: "Create Expense",
      description: "Record a new expense. Requires a description and amount. Useful for tracking business costs.",
      inputSchema: {
        description: z.string().describe("Expense description"),
        amount: z.number().describe("Amount in EUR"),
        category: z.string().optional().describe("Category (e.g. 'office', 'travel', 'software')"),
        date: z.string().optional().describe("Expense date ISO 8601 (YYYY-MM-DD)"),
        vendor: z.string().optional().describe("Vendor/supplier name"),
        taxDeductible: z.boolean().optional().describe("Whether the expense is tax deductible"),
      },
    },
    async (input) => {
      try {
        const result = await client.createExpense(input);
        return { content: [{ type: "text" as const, text: formatRecord("Expense created", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "update_expense",
    {
      title: "Update Expense",
      description: "Update an existing expense. Only the provided fields will be changed.",
      inputSchema: {
        id: z.string().describe("Expense ID"),
        description: z.string().optional().describe("Description"),
        amount: z.number().optional().describe("Amount in EUR"),
        category: z.string().optional().describe("Category"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        vendor: z.string().optional().describe("Vendor"),
        taxDeductible: z.boolean().optional().describe("Tax deductible"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateExpense(id, data);
        return { content: [{ type: "text" as const, text: formatRecord("Expense updated", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_expense",
    {
      title: "Delete Expense",
      description: "Permanently delete an expense by its ID. This action cannot be undone.",
      inputSchema: {
        id: z.string().describe("Expense ID"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteExpense(id);
        return { content: [{ type: "text" as const, text: `Expense ${id} deleted successfully.` }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // ===== CLIENTS (5 tools) =====

  server.registerTool(
    "list_clients",
    {
      title: "List Clients",
      description: "List all clients/customers with optional pagination. Returns contact info, tax IDs, and addresses.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100)"),
        offset: z.number().int().min(0).optional().describe("Offset"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listClients({ limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated("clients", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "get_client",
    {
      title: "Get Client",
      description: "Get a single client by their ID. Returns full contact details.",
      inputSchema: {
        id: z.string().describe("Client ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getClient(id);
        return { content: [{ type: "text" as const, text: formatRecord("Client", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "create_client",
    {
      title: "Create Client",
      description: "Create a new client/customer. Requires at minimum a name. Clients are used when creating invoices and quotes.",
      inputSchema: {
        name: z.string().describe("Client/company name"),
        email: z.string().optional().describe("Email address"),
        phone: z.string().optional().describe("Phone number"),
        taxId: z.string().optional().describe("Tax ID (NIF/CIF/VAT)"),
        address: addressSchema,
      },
    },
    async (input) => {
      try {
        const result = await client.createClient(input);
        return { content: [{ type: "text" as const, text: formatRecord("Client created", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "update_client",
    {
      title: "Update Client",
      description: "Update an existing client. Only the provided fields will be changed.",
      inputSchema: {
        id: z.string().describe("Client ID"),
        name: z.string().optional().describe("Name"),
        email: z.string().optional().describe("Email"),
        phone: z.string().optional().describe("Phone"),
        taxId: z.string().optional().describe("Tax ID"),
        address: addressSchema,
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateClient(id, data);
        return { content: [{ type: "text" as const, text: formatRecord("Client updated", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_client",
    {
      title: "Delete Client",
      description: "Permanently delete a client by their ID. This action cannot be undone. Warning: may affect existing invoices and quotes.",
      inputSchema: {
        id: z.string().describe("Client ID"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteClient(id);
        return { content: [{ type: "text" as const, text: `Client ${id} deleted successfully.` }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // ===== PRODUCTS (5 tools) =====

  server.registerTool(
    "list_products",
    {
      title: "List Products",
      description: "List all products/services with optional pagination. Products are reusable items for invoices and quotes.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100)"),
        offset: z.number().int().min(0).optional().describe("Offset"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listProducts({ limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated("products", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "get_product",
    {
      title: "Get Product",
      description: "Get a single product/service by its ID.",
      inputSchema: {
        id: z.string().describe("Product ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getProduct(id);
        return { content: [{ type: "text" as const, text: formatRecord("Product", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "create_product",
    {
      title: "Create Product",
      description: "Create a new product or service. Requires a name and unit price. Products can be referenced in invoices and quotes.",
      inputSchema: {
        name: z.string().describe("Product/service name"),
        unitPrice: z.number().describe("Unit price in EUR"),
        description: z.string().optional().describe("Product description"),
        unit: z.string().optional().describe("Unit of measurement (e.g. 'hour', 'unit', 'kg')"),
        taxRate: z.number().min(0).max(100).optional().describe("Default tax rate % (e.g. 21 for 21% IVA)"),
        sku: z.string().optional().describe("SKU / Reference code"),
      },
    },
    async (input) => {
      try {
        const result = await client.createProduct(input);
        return { content: [{ type: "text" as const, text: formatRecord("Product created", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "update_product",
    {
      title: "Update Product",
      description: "Update an existing product. Only the provided fields will be changed.",
      inputSchema: {
        id: z.string().describe("Product ID"),
        name: z.string().optional().describe("Name"),
        unitPrice: z.number().optional().describe("Unit price"),
        description: z.string().optional().describe("Description"),
        unit: z.string().optional().describe("Unit"),
        taxRate: z.number().min(0).max(100).optional().describe("Tax rate %"),
        sku: z.string().optional().describe("SKU"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateProduct(id, data);
        return { content: [{ type: "text" as const, text: formatRecord("Product updated", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_product",
    {
      title: "Delete Product",
      description: "Permanently delete a product by its ID. This action cannot be undone.",
      inputSchema: {
        id: z.string().describe("Product ID"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteProduct(id);
        return { content: [{ type: "text" as const, text: `Product ${id} deleted successfully.` }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // ===== QUOTES (5 tools) =====

  server.registerTool(
    "list_quotes",
    {
      title: "List Quotes",
      description: "List all quotes/estimates with optional pagination. Quotes are proposals sent to clients before invoicing.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100)"),
        offset: z.number().int().min(0).optional().describe("Offset"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listQuotes({ limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated("quotes", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "get_quote",
    {
      title: "Get Quote",
      description: "Get a single quote/estimate by its ID. Returns the full quote with line items and totals.",
      inputSchema: {
        id: z.string().describe("Quote ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getQuote(id);
        return { content: [{ type: "text" as const, text: formatRecord("Quote", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "create_quote",
    {
      title: "Create Quote",
      description: "Create a new quote/estimate for a client. Requires client name and at least one line item. Quotes can later be converted to invoices.",
      inputSchema: {
        clientName: z.string().describe("Client name"),
        items: z.array(quoteItemSchema).min(1).describe("Line items"),
        validUntil: z.string().optional().describe("Expiry date ISO 8601 (YYYY-MM-DD)"),
        notes: z.string().optional().describe("Additional notes"),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional().describe("Quote status (default: draft)"),
      },
    },
    async (input) => {
      try {
        const result = await client.createQuote(input);
        return { content: [{ type: "text" as const, text: formatRecord("Quote created", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "update_quote",
    {
      title: "Update Quote",
      description: "Update an existing quote. Only the provided fields will be changed.",
      inputSchema: {
        id: z.string().describe("Quote ID"),
        clientName: z.string().optional().describe("Client name"),
        items: z.array(quoteItemSchema).min(1).optional().describe("Line items"),
        validUntil: z.string().optional().describe("Expiry date"),
        notes: z.string().optional().describe("Notes"),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional().describe("Status"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateQuote(id, data);
        return { content: [{ type: "text" as const, text: formatRecord("Quote updated", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_quote",
    {
      title: "Delete Quote",
      description: "Permanently delete a quote by its ID. This action cannot be undone.",
      inputSchema: {
        id: z.string().describe("Quote ID"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteQuote(id);
        return { content: [{ type: "text" as const, text: `Quote ${id} deleted successfully.` }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // ===== WEBHOOKS (5 tools) =====

  server.registerTool(
    "list_webhooks",
    {
      title: "List Webhooks",
      description: "List all configured webhooks. Webhooks send HTTP POST notifications when events occur in Frihet.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100)"),
        offset: z.number().int().min(0).optional().describe("Offset"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listWebhooks({ limit, offset });
        return { content: [{ type: "text" as const, text: formatPaginated("webhooks", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "get_webhook",
    {
      title: "Get Webhook",
      description: "Get a single webhook configuration by its ID.",
      inputSchema: {
        id: z.string().describe("Webhook ID"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getWebhook(id);
        return { content: [{ type: "text" as const, text: formatRecord("Webhook", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "create_webhook",
    {
      title: "Create Webhook",
      description: "Register a new webhook endpoint. Specify the URL and which events to subscribe to (e.g. 'invoice.created', 'invoice.paid').",
      inputSchema: {
        url: z.string().url().describe("Webhook endpoint URL"),
        events: z.array(z.string()).min(1).describe("Events to subscribe to (e.g. ['invoice.created', 'invoice.paid'])"),
        active: z.boolean().optional().describe("Whether the webhook is active (default: true)"),
        secret: z.string().optional().describe("Signing secret for payload verification"),
      },
    },
    async (input) => {
      try {
        const result = await client.createWebhook(input);
        return { content: [{ type: "text" as const, text: formatRecord("Webhook created", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "update_webhook",
    {
      title: "Update Webhook",
      description: "Update an existing webhook configuration. Only the provided fields will be changed.",
      inputSchema: {
        id: z.string().describe("Webhook ID"),
        url: z.string().url().optional().describe("Endpoint URL"),
        events: z.array(z.string()).min(1).optional().describe("Events"),
        active: z.boolean().optional().describe("Active"),
        secret: z.string().optional().describe("Signing secret"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateWebhook(id, data);
        return { content: [{ type: "text" as const, text: formatRecord("Webhook updated", result) }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_webhook",
    {
      title: "Delete Webhook",
      description: "Permanently delete a webhook by its ID. Notifications will stop immediately.",
      inputSchema: {
        id: z.string().describe("Webhook ID"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteWebhook(id);
        return { content: [{ type: "text" as const, text: `Webhook ${id} deleted successfully.` }] };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
