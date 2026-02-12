/**
 * Quote tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { FrihetClient } from "../client.js";
import { handleToolError, formatPaginatedResponse, formatRecord } from "./shared.js";

const quoteItemSchema = z.object({
  description: z.string().describe("Description of the line item / Descripcion del concepto"),
  quantity: z.number().describe("Quantity / Cantidad"),
  unitPrice: z.number().describe("Unit price in EUR / Precio unitario en EUR"),
});

export function registerQuoteTools(server: McpServer, client: FrihetClient): void {
  // -- list_quotes --

  server.registerTool(
    "list_quotes",
    {
      title: "List Quotes",
      description:
        "List all quotes/estimates with optional pagination. " +
        "Quotes are proposals sent to clients before they become invoices. " +
        "/ Lista todos los presupuestos con paginacion opcional. " +
        "Los presupuestos son propuestas enviadas a clientes antes de facturar.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listQuotes({ limit, offset });
        return {
          content: [{ type: "text", text: formatPaginatedResponse("quotes", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- get_quote --

  server.registerTool(
    "get_quote",
    {
      title: "Get Quote",
      description:
        "Get a single quote/estimate by its ID. Returns the full quote with line items and totals. " +
        "/ Obtiene un presupuesto por su ID. Devuelve el presupuesto completo con conceptos y totales.",
      inputSchema: {
        id: z.string().describe("Quote ID / ID del presupuesto"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getQuote(id);
        return {
          content: [{ type: "text", text: formatRecord("Quote", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- create_quote --

  server.registerTool(
    "create_quote",
    {
      title: "Create Quote",
      description:
        "Create a new quote/estimate for a client. Requires client name and at least one line item. " +
        "Quotes can later be converted to invoices. " +
        "/ Crea un nuevo presupuesto para un cliente. Requiere nombre del cliente y al menos un concepto. " +
        "Los presupuestos se pueden convertir en facturas despues.",
      inputSchema: {
        clientName: z.string().describe("Client name / Nombre del cliente"),
        items: z
          .array(quoteItemSchema)
          .min(1)
          .describe("Line items / Conceptos del presupuesto"),
        validUntil: z
          .string()
          .optional()
          .describe("Expiry date in ISO 8601 (YYYY-MM-DD) / Fecha de validez"),
        notes: z.string().optional().describe("Additional notes / Notas adicionales"),
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional()
          .describe("Quote status (default: draft) / Estado del presupuesto"),
      },
    },
    async (input) => {
      try {
        const result = await client.createQuote(input);
        return {
          content: [{ type: "text", text: formatRecord("Quote created", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- update_quote --

  server.registerTool(
    "update_quote",
    {
      title: "Update Quote",
      description:
        "Update an existing quote. Only the provided fields will be changed. " +
        "/ Actualiza un presupuesto existente. Solo se modifican los campos proporcionados.",
      inputSchema: {
        id: z.string().describe("Quote ID / ID del presupuesto"),
        clientName: z.string().optional().describe("Client name / Nombre del cliente"),
        items: z.array(quoteItemSchema).min(1).optional().describe("Line items / Conceptos"),
        validUntil: z.string().optional().describe("Expiry date / Fecha de validez"),
        notes: z.string().optional().describe("Notes / Notas"),
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional()
          .describe("Status / Estado"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateQuote(id, data);
        return {
          content: [{ type: "text", text: formatRecord("Quote updated", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- delete_quote --

  server.registerTool(
    "delete_quote",
    {
      title: "Delete Quote",
      description:
        "Permanently delete a quote by its ID. This action cannot be undone. " +
        "/ Elimina permanentemente un presupuesto por su ID. Esta accion no se puede deshacer.",
      inputSchema: {
        id: z.string().describe("Quote ID / ID del presupuesto"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteQuote(id);
        return {
          content: [{ type: "text", text: `Quote ${id} deleted successfully. / Presupuesto ${id} eliminado correctamente.` }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
