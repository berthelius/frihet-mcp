/**
 * Invoice tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import { withToolLogging, formatPaginatedResponse, formatRecord, listContent, getContent, mutateContent, enrichResponse, READ_ONLY_ANNOTATIONS, CREATE_ANNOTATIONS, UPDATE_ANNOTATIONS, DELETE_ANNOTATIONS, paginatedOutput, deleteResultOutput, invoiceItemOutput } from "./shared.js";

const invoiceItemSchema = z.object({
  description: z.string().describe("Description of the line item / Descripcion del concepto"),
  quantity: z.number().describe("Quantity / Cantidad"),
  unitPrice: z.number().describe("Unit price in EUR / Precio unitario en EUR"),
});

export function registerInvoiceTools(server: McpServer, client: IFrihetClient): void {
  // -- list_invoices --

  server.registerTool(
    "list_invoices",
    {
      title: "List Invoices",
      description:
        "List all invoices with optional pagination and filters. " +
        "Returns a paginated list sorted by issue date (newest first). " +
        "Supports filtering by status (draft/sent/paid/overdue/cancelled) and date range. " +
        "Example: status='paid', from='2026-01-01', to='2026-03-31', limit=20 " +
        "/ Lista facturas con paginacion y filtros opcionales. " +
        "Soporta filtrado por estado y rango de fechas.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Filter by invoice status / Filtrar por estado"),
        from: z
          .string()
          .optional()
          .describe("Start date filter in ISO 8601 (YYYY-MM-DD) / Fecha inicio"),
        to: z
          .string()
          .optional()
          .describe("End date filter in ISO 8601 (YYYY-MM-DD) / Fecha fin"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max results per page (1-100, default 50) / Resultados por pagina"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Number of results to skip / Resultados a saltar"),
      },
      outputSchema: paginatedOutput(invoiceItemOutput),
    },
    async ({ status, from, to, limit, offset }) => withToolLogging("list_invoices", async () => {
      const result = await client.listInvoices({ limit, offset, status, from, to });
      const hints = enrichResponse("invoices", "list", result.data);
      return {
        content: [listContent(formatPaginatedResponse("invoices", result))],
        structuredContent: { ...result, ...hints } as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- get_invoice --

  server.registerTool(
    "get_invoice",
    {
      title: "Get Invoice",
      description:
        "Get a single invoice by its ID. Returns the full invoice including line items, totals, and status. " +
        "/ Obtiene una factura por su ID. Devuelve la factura completa con conceptos, totales y estado.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Invoice ID / ID de la factura"),
      },
      outputSchema: invoiceItemOutput,
    },
    async ({ id }) => withToolLogging("get_invoice", async () => {
      const result = await client.getInvoice(id);
      return {
        content: [getContent(formatRecord("Invoice", result))],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- create_invoice --

  server.registerTool(
    "create_invoice",
    {
      title: "Create Invoice",
      description:
        "Create a new invoice. Requires client name and at least one line item. " +
        "The invoice number is auto-generated. Defaults to draft status and today's date. " +
        "Example: clientName='Acme Corp', items=[{description:'Consulting', quantity:10, unitPrice:150}], taxRate=21 " +
        "/ Crea una nueva factura. Requiere nombre del cliente y al menos un concepto. " +
        "El numero se genera automaticamente. Por defecto estado borrador y fecha de hoy.",
      annotations: CREATE_ANNOTATIONS,
      inputSchema: {
        clientName: z.string().describe("Client/customer name / Nombre del cliente"),
        items: z
          .array(invoiceItemSchema)
          .min(1)
          .describe("Line items (each with description, quantity, unitPrice) / Conceptos de la factura"),
        issueDate: z
          .string()
          .optional()
          .describe("Issue date in ISO 8601 format (YYYY-MM-DD), defaults to today / Fecha de emision"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in ISO 8601 format (YYYY-MM-DD) / Fecha de vencimiento"),
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Invoice status (default: draft) / Estado de la factura"),
        notes: z
          .string()
          .optional()
          .describe("Additional notes shown on the invoice / Notas adicionales"),
        taxRate: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Tax rate percentage (e.g. 21 for 21% IVA, 7 for IGIC) / Porcentaje de impuesto"),
      },
      outputSchema: invoiceItemOutput,
    },
    async (input) => withToolLogging("create_invoice", async () => {
      const result = await client.createInvoice(input);
      const hints = enrichResponse("invoices", "create", result);
      return {
        content: [mutateContent(formatRecord("Invoice created", result))],
        structuredContent: { ...result, ...hints } as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- update_invoice --

  server.registerTool(
    "update_invoice",
    {
      title: "Update Invoice",
      description:
        "Update an existing invoice using PATCH semantics. Only the provided fields will be changed. " +
        "Example: id='abc123', status='paid' to mark an invoice as paid. " +
        "/ Actualiza una factura existente. Solo se modifican los campos proporcionados.",
      annotations: UPDATE_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Invoice ID / ID de la factura"),
        clientName: z.string().optional().describe("Client name / Nombre del cliente"),
        items: z
          .array(invoiceItemSchema)
          .min(1)
          .optional()
          .describe("Line items / Conceptos"),
        issueDate: z.string().optional().describe("Issue date (YYYY-MM-DD) / Fecha de emision"),
        dueDate: z.string().optional().describe("Due date (YYYY-MM-DD) / Fecha de vencimiento"),
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Invoice status / Estado"),
        notes: z.string().optional().describe("Notes / Notas"),
        taxRate: z.number().min(0).max(100).optional().describe("Tax rate % / IVA %"),
      },
      outputSchema: invoiceItemOutput,
    },
    async ({ id, ...data }) => withToolLogging("update_invoice", async () => {
      const result = await client.updateInvoice(id, data);
      const hints = enrichResponse("invoices", "update", result);
      return {
        content: [mutateContent(formatRecord("Invoice updated", result))],
        structuredContent: { ...result, ...hints } as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- delete_invoice --

  server.registerTool(
    "delete_invoice",
    {
      title: "Delete Invoice",
      description:
        "Permanently delete an invoice by its ID. This action cannot be undone. " +
        "/ Elimina permanentemente una factura por su ID. Esta accion no se puede deshacer.",
      annotations: DELETE_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Invoice ID / ID de la factura"),
      },
      outputSchema: deleteResultOutput,
    },
    async ({ id }) => withToolLogging("delete_invoice", async () => {
      await client.deleteInvoice(id);
      const hints = enrichResponse("invoices", "delete", { id });
      return {
        content: [mutateContent(`Invoice ${id} deleted successfully. / Factura ${id} eliminada correctamente.`)],
        structuredContent: { success: true, id, ...hints } as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- search_invoices --

  server.registerTool(
    "search_invoices",
    {
      title: "Search Invoices",
      description:
        "Search and filter invoices. Supports filtering by status and date range. " +
        "The query parameter searches across client names and invoice content. " +
        "Example: query='Acme', status='paid', from='2026-01-01', to='2026-03-31' " +
        "/ Busca y filtra facturas. Soporta filtrado por estado y rango de fechas. " +
        "El parametro query busca en nombres de clientes y contenido de facturas.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        query: z.string().optional().describe("Search text (client name, etc.) / Texto de busqueda"),
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Filter by status / Filtrar por estado"),
        from: z
          .string()
          .optional()
          .describe("Start date filter (YYYY-MM-DD) / Fecha inicio"),
        to: z
          .string()
          .optional()
          .describe("End date filter (YYYY-MM-DD) / Fecha fin"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
      outputSchema: paginatedOutput(invoiceItemOutput),
    },
    async ({ query, status, from, to, limit, offset }) => withToolLogging("search_invoices", async () => {
      const result = query
        ? await client.searchInvoices(query, { limit, offset, status, from, to })
        : await client.listInvoices({ limit, offset, status, from, to });
      const label = query ? `invoices matching "${query}"` : "invoices";
      const hints = enrichResponse("invoices", "list", result.data);
      return {
        content: [listContent(formatPaginatedResponse(label, result))],
        structuredContent: { ...result, ...hints } as unknown as Record<string, unknown>,
      };
    }),
  );
}
