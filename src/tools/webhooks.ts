/**
 * Webhook management tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import { handleToolError, formatPaginatedResponse, formatRecord, listContent, getContent, mutateContent, READ_ONLY_ANNOTATIONS, CREATE_ANNOTATIONS, UPDATE_ANNOTATIONS, DELETE_ANNOTATIONS, paginatedOutput, deleteResultOutput, webhookItemOutput } from "./shared.js";

export function registerWebhookTools(server: McpServer, client: IFrihetClient): void {
  // -- list_webhooks --

  server.registerTool(
    "list_webhooks",
    {
      title: "List Webhooks",
      description:
        "List all configured webhooks. Webhooks send HTTP POST notifications when events occur in Frihet. " +
        "/ Lista todos los webhooks configurados. Los webhooks envian notificaciones HTTP POST cuando ocurren eventos en Frihet.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
      outputSchema: paginatedOutput(webhookItemOutput),
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listWebhooks({ limit, offset });
        return {
          content: [listContent(formatPaginatedResponse("webhooks", result))],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- get_webhook --

  server.registerTool(
    "get_webhook",
    {
      title: "Get Webhook",
      description:
        "Get a single webhook configuration by its ID. " +
        "/ Obtiene la configuracion de un webhook por su ID.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Webhook ID / ID del webhook"),
      },
      outputSchema: webhookItemOutput,
    },
    async ({ id }) => {
      try {
        const result = await client.getWebhook(id);
        return {
          content: [getContent(formatRecord("Webhook", result))],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- create_webhook --

  server.registerTool(
    "create_webhook",
    {
      title: "Create Webhook",
      description:
        "Register a new webhook endpoint. You must specify the URL to receive notifications " +
        "and which events to subscribe to (e.g. 'invoice.created', 'invoice.paid', 'expense.created'). " +
        "/ Registra un nuevo endpoint de webhook. Debes especificar la URL y los eventos " +
        "a los que suscribirte (ej. 'invoice.created', 'invoice.paid', 'expense.created').",
      annotations: CREATE_ANNOTATIONS,
      inputSchema: {
        url: z.string().url().describe("Webhook endpoint URL / URL del endpoint del webhook"),
        events: z
          .array(z.string())
          .min(1)
          .describe(
            "Events to subscribe to (e.g. ['invoice.created', 'invoice.paid']) " +
            "/ Eventos a suscribir",
          ),
        active: z
          .boolean()
          .optional()
          .describe("Whether the webhook is active (default: true) / Si el webhook esta activo"),
        secret: z
          .string()
          .optional()
          .describe(
            "Signing secret for payload verification / Secreto para verificar las notificaciones",
          ),
      },
      outputSchema: webhookItemOutput,
    },
    async (input) => {
      try {
        const result = await client.createWebhook(input);
        return {
          content: [mutateContent(formatRecord("Webhook created", result))],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- update_webhook --

  server.registerTool(
    "update_webhook",
    {
      title: "Update Webhook",
      description:
        "Update an existing webhook configuration. Only the provided fields will be changed. " +
        "/ Actualiza la configuracion de un webhook. Solo se modifican los campos proporcionados.",
      annotations: UPDATE_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Webhook ID / ID del webhook"),
        url: z.string().url().optional().describe("Endpoint URL / URL"),
        events: z.array(z.string()).min(1).optional().describe("Events / Eventos"),
        active: z.boolean().optional().describe("Active / Activo"),
        secret: z.string().optional().describe("Signing secret / Secreto"),
      },
      outputSchema: webhookItemOutput,
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateWebhook(id, data);
        return {
          content: [mutateContent(formatRecord("Webhook updated", result))],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- delete_webhook --

  server.registerTool(
    "delete_webhook",
    {
      title: "Delete Webhook",
      description:
        "Permanently delete a webhook by its ID. Notifications will stop immediately. " +
        "/ Elimina permanentemente un webhook por su ID. Las notificaciones se detendran inmediatamente.",
      annotations: DELETE_ANNOTATIONS,
      inputSchema: {
        id: z.string().describe("Webhook ID / ID del webhook"),
      },
      outputSchema: deleteResultOutput,
    },
    async ({ id }) => {
      try {
        await client.deleteWebhook(id);
        return {
          content: [mutateContent(`Webhook ${id} deleted successfully. / Webhook ${id} eliminado correctamente.`)],
          structuredContent: { success: true, id } as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
