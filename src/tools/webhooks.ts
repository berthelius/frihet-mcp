/**
 * Webhook management tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { FrihetClient } from "../client.js";
import { handleToolError, formatPaginatedResponse, formatRecord } from "./shared.js";

export function registerWebhookTools(server: McpServer, client: FrihetClient): void {
  // -- list_webhooks --

  server.registerTool(
    "list_webhooks",
    {
      title: "List Webhooks",
      description:
        "List all configured webhooks. Webhooks send HTTP POST notifications when events occur in Frihet. " +
        "/ Lista todos los webhooks configurados. Los webhooks envian notificaciones HTTP POST cuando ocurren eventos en Frihet.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listWebhooks({ limit, offset });
        return {
          content: [{ type: "text", text: formatPaginatedResponse("webhooks", result) }],
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
      inputSchema: {
        id: z.string().describe("Webhook ID / ID del webhook"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getWebhook(id);
        return {
          content: [{ type: "text", text: formatRecord("Webhook", result) }],
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
    },
    async (input) => {
      try {
        const result = await client.createWebhook(input);
        return {
          content: [{ type: "text", text: formatRecord("Webhook created", result) }],
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
      inputSchema: {
        id: z.string().describe("Webhook ID / ID del webhook"),
        url: z.string().url().optional().describe("Endpoint URL / URL"),
        events: z.array(z.string()).min(1).optional().describe("Events / Eventos"),
        active: z.boolean().optional().describe("Active / Activo"),
        secret: z.string().optional().describe("Signing secret / Secreto"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateWebhook(id, data);
        return {
          content: [{ type: "text", text: formatRecord("Webhook updated", result) }],
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
      inputSchema: {
        id: z.string().describe("Webhook ID / ID del webhook"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteWebhook(id);
        return {
          content: [{ type: "text", text: `Webhook ${id} deleted successfully. / Webhook ${id} eliminado correctamente.` }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
