/**
 * Shared utilities for MCP tool handlers.
 */

import { FrihetApiError } from "../client.js";
import type { PaginatedResponse } from "../types.js";

/**
 * Maps an error to a user-friendly MCP tool response.
 */
export function handleToolError(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  if (error instanceof FrihetApiError) {
    const messages: Record<number, string> = {
      400: "Bad request. Check your input parameters. / Solicitud incorrecta. Revisa los parametros.",
      401: "Authentication failed. Check your API key. / Autenticacion fallida. Revisa tu API key.",
      403: "Access denied. Your API key does not have permission for this action. / Acceso denegado.",
      404: "Resource not found. / Recurso no encontrado.",
      405: "Method not allowed. / Metodo no permitido.",
      413: "Request body too large (max 1MB). / Cuerpo de la solicitud demasiado grande (max 1MB).",
      429: "Rate limit exceeded. Try again later. / Limite de peticiones excedido. Intenta mas tarde.",
      500: "Internal server error. Try again later. / Error interno del servidor.",
    };

    const friendlyMessage =
      messages[error.statusCode] ?? `API error ${error.statusCode}: ${error.message}`;

    return {
      content: [
        {
          type: "text",
          text: `Error: ${friendlyMessage}${error.message ? `\nDetails: ${error.message}` : ""}`,
        },
      ],
      isError: true,
    };
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Formats a paginated API response into readable text.
 */
export function formatPaginatedResponse(
  resourceName: string,
  response: PaginatedResponse<Record<string, unknown>>,
): string {
  const lines: string[] = [
    `Found ${response.total} ${resourceName} (showing ${response.data.length}, offset ${response.offset}):`,
    "",
  ];

  for (const item of response.data) {
    lines.push(JSON.stringify(item, null, 2));
    lines.push("---");
  }

  if (response.total > response.offset + response.data.length) {
    lines.push(
      `More results available. Use offset=${response.offset + response.data.length} to see the next page.`,
    );
  }

  return lines.join("\n");
}

/**
 * Formats a single record for display.
 */
export function formatRecord(
  label: string,
  record: Record<string, unknown>,
): string {
  return `${label}:\n${JSON.stringify(record, null, 2)}`;
}
