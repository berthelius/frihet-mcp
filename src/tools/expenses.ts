/**
 * Expense tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import { handleToolError, formatPaginatedResponse, formatRecord } from "./shared.js";

export function registerExpenseTools(server: McpServer, client: IFrihetClient): void {
  // -- list_expenses --

  server.registerTool(
    "list_expenses",
    {
      title: "List Expenses",
      description:
        "List all expenses with optional pagination. " +
        "/ Lista todos los gastos con paginacion opcional.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listExpenses({ limit, offset });
        return {
          content: [{ type: "text", text: formatPaginatedResponse("expenses", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- get_expense --

  server.registerTool(
    "get_expense",
    {
      title: "Get Expense",
      description:
        "Get a single expense by its ID. " +
        "/ Obtiene un gasto por su ID.",
      inputSchema: {
        id: z.string().describe("Expense ID / ID del gasto"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getExpense(id);
        return {
          content: [{ type: "text", text: formatRecord("Expense", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- create_expense --

  server.registerTool(
    "create_expense",
    {
      title: "Create Expense",
      description:
        "Record a new expense. Requires a description and amount. " +
        "Useful for tracking business costs, deductible expenses, and vendor payments. " +
        "/ Registra un nuevo gasto. Requiere descripcion e importe. " +
        "Util para seguimiento de costes, gastos deducibles y pagos a proveedores.",
      inputSchema: {
        description: z.string().describe("Expense description / Descripcion del gasto"),
        amount: z.number().describe("Amount in EUR / Importe en EUR"),
        category: z
          .string()
          .optional()
          .describe("Expense category (e.g. 'office', 'travel', 'software') / Categoria"),
        date: z
          .string()
          .optional()
          .describe("Expense date in ISO 8601 (YYYY-MM-DD) / Fecha del gasto"),
        vendor: z.string().optional().describe("Vendor/supplier name / Nombre del proveedor"),
        taxDeductible: z
          .boolean()
          .optional()
          .describe("Whether the expense is tax deductible / Si el gasto es deducible fiscalmente"),
      },
    },
    async (input) => {
      try {
        const result = await client.createExpense(input);
        return {
          content: [{ type: "text", text: formatRecord("Expense created", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- update_expense --

  server.registerTool(
    "update_expense",
    {
      title: "Update Expense",
      description:
        "Update an existing expense. Only the provided fields will be changed. " +
        "/ Actualiza un gasto existente. Solo se modifican los campos proporcionados.",
      inputSchema: {
        id: z.string().describe("Expense ID / ID del gasto"),
        description: z.string().optional().describe("Description / Descripcion"),
        amount: z.number().optional().describe("Amount in EUR / Importe"),
        category: z.string().optional().describe("Category / Categoria"),
        date: z.string().optional().describe("Date (YYYY-MM-DD) / Fecha"),
        vendor: z.string().optional().describe("Vendor / Proveedor"),
        taxDeductible: z.boolean().optional().describe("Tax deductible / Deducible"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateExpense(id, data);
        return {
          content: [{ type: "text", text: formatRecord("Expense updated", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- delete_expense --

  server.registerTool(
    "delete_expense",
    {
      title: "Delete Expense",
      description:
        "Permanently delete an expense by its ID. This action cannot be undone. " +
        "/ Elimina permanentemente un gasto por su ID. Esta accion no se puede deshacer.",
      inputSchema: {
        id: z.string().describe("Expense ID / ID del gasto"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteExpense(id);
        return {
          content: [{ type: "text", text: `Expense ${id} deleted successfully. / Gasto ${id} eliminado correctamente.` }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
