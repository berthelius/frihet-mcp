/**
 * Quote tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import { withToolLogging, formatPaginatedResponse, formatRecord, listContent, getContent, mutateContent, READ_ONLY_ANNOTATIONS, CREATE_ANNOTATIONS, UPDATE_ANNOTATIONS, DELETE_ANNOTATIONS, paginatedOutput, deleteResultOutput, quoteItemOutput } from "./shared.js";

const quoteItemSchema = z.object({
  description: z.string().describe("Description of the line item / Descripcion del concepto"),
  quantity: z.number().describe("Quantity / Cantidad"),
  unitPrice: z.number().describe("Unit price in EUR / Precio unitario en EUR"),
});

export function registerQuoteTools(server: McpServer, client: IFrihetClient): void {
  // -- list_quotes --

  server.registerTool(
    "list_quotes",
    {
      title: "List Quotes",
      description:
        "List all quotes/estimates with optional pagination and filters. " +
        "Quotes are proposals sent to clients before they become invoices. " +
        "Supports filtering by status (draft/sent/accepted/rejected/expired) and date range. " +
        "Example: status='sent', from='2026-01-01', limit=20 " +
        "/ Lista todos los presupuestos con paginacion y filtros opcionales. " +
        "Soporta filtrado por estado y rango de fechas.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional()
          .describe("Filter by quote status / Filtrar por estado"),
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
      outputSchema: paginatedOutput(quoteItemOutput),
    },
    async ({ status, from, to, limit, offset }) => withToolLogging("list_quotes", async () => {
      const result = await client.listQuotes({ limit, offset, status, from, to });
      return {
        content: [listContent(formatPaginatedResponse("quotes", result))],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- get_quote --

  server.registerTool(
    "get_quote",
    {
      title: "Get Quote",
      description:
        "Get a single quote/estimate by its ID. Returns the full quote with line items and totals. " +
        "/ Obtiene un presupuesto por su ID. Devuelve el presupuesto completo con conceptos y totales.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Quote ID / ID del presupuesto"),
      },
      outputSchema: quoteItemOutput,
    },
    async ({ id }) => withToolLogging("get_quote", async () => {
      const result = await client.getQuote(id);
      return {
        content: [getContent(formatRecord("Quote", result))],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- create_quote --

  server.registerTool(
    "create_quote",
    {
      title: "Create Quote",
      description:
        "Create a new quote/estimate for a client. Requires client name and at least one line item. " +
        "Quotes can later be converted to invoices. Defaults to draft status. " +
        "Example: clientName='Acme Corp', items=[{description:'Design', quantity:1, unitPrice:3000}], validUntil='2026-04-30' " +
        "/ Crea un nuevo presupuesto. Requiere nombre del cliente y al menos un concepto. " +
        "Los presupuestos se pueden convertir en facturas despues.",
      annotations: CREATE_ANNOTATIONS,
      inputSchema: {
        clientName: z.string().describe("Client name / Nombre del cliente"),
        items: z
          .array(quoteItemSchema)
          .min(1)
          .describe("Line items (each with description, quantity, unitPrice) / Conceptos del presupuesto"),
        validUntil: z
          .string()
          .optional()
          .describe("Expiry date in ISO 8601 (YYYY-MM-DD) / Fecha de validez"),
        notes: z.string().optional().describe("Additional notes shown on the quote / Notas adicionales"),
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional()
          .describe("Quote status (default: draft) / Estado del presupuesto"),
      },
      outputSchema: quoteItemOutput,
    },
    async (input) => withToolLogging("create_quote", async () => {
      const result = await client.createQuote(input);
      return {
        content: [mutateContent(formatRecord("Quote created", result))],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- update_quote --

  server.registerTool(
    "update_quote",
    {
      title: "Update Quote",
      description:
        "Update an existing quote using PATCH semantics. Only the provided fields will be changed. " +
        "Example: id='abc123', status='accepted' to mark a quote as accepted. " +
        "/ Actualiza un presupuesto existente. Solo se modifican los campos proporcionados.",
      annotations: UPDATE_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Quote ID / ID del presupuesto"),
        clientName: z.string().optional().describe("Client name / Nombre del cliente"),
        items: z.array(quoteItemSchema).min(1).optional().describe("Line items / Conceptos"),
        validUntil: z.string().optional().describe("Expiry date (YYYY-MM-DD) / Fecha de validez"),
        notes: z.string().optional().describe("Notes / Notas"),
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional()
          .describe("Status / Estado"),
      },
      outputSchema: quoteItemOutput,
    },
    async ({ id, ...data }) => withToolLogging("update_quote", async () => {
      const result = await client.updateQuote(id, data);
      return {
        content: [mutateContent(formatRecord("Quote updated", result))],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }),
  );

  // -- delete_quote --

  server.registerTool(
    "delete_quote",
    {
      title: "Delete Quote",
      description:
        "Permanently delete a quote by its ID. This action cannot be undone. " +
        "/ Elimina permanentemente un presupuesto por su ID. Esta accion no se puede deshacer.",
      annotations: DELETE_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Quote ID / ID del presupuesto"),
      },
      outputSchema: deleteResultOutput,
    },
    async ({ id }) => withToolLogging("delete_quote", async () => {
      await client.deleteQuote(id);
      return {
        content: [mutateContent(`Quote ${id} deleted successfully. / Presupuesto ${id} eliminado correctamente.`)],
        structuredContent: { success: true, id } as unknown as Record<string, unknown>,
      };
    }),
  );
}
