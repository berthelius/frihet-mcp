/**
 * Invoice tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import { withToolLogging, formatPaginatedResponse, formatRecord, listContent, getContent, mutateContent, READ_ONLY_ANNOTATIONS, CREATE_ANNOTATIONS, UPDATE_ANNOTATIONS, DELETE_ANNOTATIONS, paginatedOutput, deleteResultOutput, invoiceItemOutput } from "./shared.js";

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
        "List all invoices with optional pagination. " +
        "Returns a paginated list of invoices sorted by creation date. " +
        "/ Lista todas las facturas con paginacion opcional. " +
        "Devuelve una lista paginada de facturas ordenadas por fecha de creacion.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
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
    async ({ limit, offset }) => withToolLogging("list_invoices", async () => {
      const result = await client.listInvoices({ limit, offset });
      return {
        content: [listContent(formatPaginatedResponse("invoices", result))],
        structuredContent: result as unknown as Record<string, unknown>,
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
        "The invoice number is auto-generated. " +
        "/ Crea una nueva factura. Requiere nombre del cliente y al menos un concepto. " +
        "El numero de factura se genera automaticamente.",
      annotations: CREATE_ANNOTATIONS,
      inputSchema: {
        clientName: z.string().describe("Client/customer name / Nombre del cliente"),
        items: z
          .array(invoiceItemSchema)
          .min(1)
          .describe("Line items / Conceptos de la factura"),
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Invoice status (default: draft) / Estado de la factura"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in ISO 8601 format (YYYY-MM-DD) / Fecha de vencimiento"),
        notes: z
          .string()
          .optional()
          .describe("Additional notes / Notas adicionales"),
        taxRate: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Tax rate percentage (e.g. 21 for 21% IVA) / Porcentaje de impuesto"),
      },
      outputSchema: invoiceItemOutput,
    },
    async (input) => withToolLogging("create_invoice", async () => {
      const result = await client.createInvoice(input);
      return {
        content: [mutateContent(formatRecord("Invoice created", result))],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- update_invoice --

  server.registerTool(
    "update_invoice",
    {
      title: "Update Invoice",
      description:
        "Update an existing invoice. Only the provided fields will be changed. " +
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
        status: z
          .enum(["draft", "sent", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Invoice status / Estado"),
        dueDate: z.string().optional().describe("Due date (YYYY-MM-DD) / Fecha de vencimiento"),
        notes: z.string().optional().describe("Notes / Notas"),
        taxRate: z.number().min(0).max(100).optional().describe("Tax rate % / IVA %"),
      },
      outputSchema: invoiceItemOutput,
    },
    async ({ id, ...data }) => withToolLogging("update_invoice", async () => {
      const result = await client.updateInvoice(id, data);
      return {
        content: [mutateContent(formatRecord("Invoice updated", result))],
        structuredContent: result as unknown as Record<string, unknown>,
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
      return {
        content: [mutateContent(`Invoice ${id} deleted successfully. / Factura ${id} eliminada correctamente.`)],
        structuredContent: { success: true, id } as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- search_invoices --

  server.registerTool(
    "search_invoices",
    {
      title: "Search Invoices",
      description:
        "Search invoices by client name. Useful for finding all invoices for a specific client. " +
        "/ Busca facturas por nombre de cliente. Util para encontrar todas las facturas de un cliente concreto.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        clientName: z.string().describe("Client name to search for / Nombre del cliente a buscar"),
        limit: z.number().int().min(1).max(100).optional().describe("Max results / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
      outputSchema: paginatedOutput(invoiceItemOutput),
    },
    async ({ clientName, limit, offset }) => withToolLogging("search_invoices", async () => {
      const result = await client.searchInvoices(clientName, { limit, offset });
      return {
        content: [
          listContent(formatPaginatedResponse(`invoices matching "${clientName}"`, result)),
        ],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );
}
