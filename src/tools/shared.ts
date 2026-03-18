/**
 * Shared utilities for MCP tool handlers.
 *
 * This module is used by both the local (stdio) and remote (Cloudflare Workers)
 * MCP servers. It must NOT import concrete classes from either client — error
 * detection uses duck-typing (checking for `statusCode`/`errorCode` properties)
 * so it works regardless of which FrihetApiError class threw the error.
 */

import type { ToolAnnotations, Annotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v4";
import type { PaginatedResponse } from "../types.js";
import { log, logToolCall } from "../logger.js";
import { recordToolCall } from "../metrics.js";

/* ------------------------------------------------------------------ */
/*  Safety annotations for MCP tool registrations                      */
/* ------------------------------------------------------------------ */

export const READ_ONLY_ANNOTATIONS: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
export const CREATE_ANNOTATIONS: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
export const UPDATE_ANNOTATIONS: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
export const DELETE_ANNOTATIONS: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false } as const;

/* ------------------------------------------------------------------ */
/*  Content annotations for tool responses                             */
/* ------------------------------------------------------------------ */

/** List operations: useful to both user and assistant for navigation, medium priority. */
export const LIST_CONTENT_ANNOTATIONS: Annotations = {
  audience: ["user", "assistant"],
  priority: 0.5,
} as const;

/** Get/read operations: useful to both, higher priority as specifically requested data. */
export const GET_CONTENT_ANNOTATIONS: Annotations = {
  audience: ["user", "assistant"],
  priority: 0.7,
} as const;

/** Mutating operations (create/update/delete): primarily for the user, highest priority. */
export const MUTATE_CONTENT_ANNOTATIONS: Annotations = {
  audience: ["user"],
  priority: 1.0,
} as const;

/** Error responses: always high priority, always for the user. */
export const ERROR_CONTENT_ANNOTATIONS: Annotations = {
  audience: ["user"],
  priority: 1.0,
} as const;

/* ------------------------------------------------------------------ */
/*  Content block type                                                 */
/* ------------------------------------------------------------------ */

export interface AnnotatedTextContent {
  type: "text";
  text: string;
  annotations?: Annotations;
}

/* ------------------------------------------------------------------ */
/*  Response size guard                                                */
/* ------------------------------------------------------------------ */

const MAX_RESPONSE_CHARS = 80_000; // ~20,000 tokens safety margin

export function truncateResponse(text: string): string {
  if (text.length <= MAX_RESPONSE_CHARS) return text;
  return text.slice(0, MAX_RESPONSE_CHARS) +
    '\n\n[Response truncated. Use pagination (limit/offset) to retrieve smaller result sets.]';
}

/** Shape of errors thrown by any FrihetClient implementation. */
interface FrihetApiErrorLike {
  statusCode: number;
  errorCode: string;
  message: string;
}

function isFrihetApiError(error: unknown): error is FrihetApiErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "errorCode" in error &&
    typeof (error as FrihetApiErrorLike).statusCode === "number"
  );
}

/**
 * Maps an error to a user-friendly MCP tool response with error annotations.
 * Emits structured log entries for all errors.
 */
export function handleToolError(error: unknown, toolName?: string): {
  content: AnnotatedTextContent[];
  isError: true;
} {
  if (isFrihetApiError(error)) {
    log({
      level: "error",
      message: `API error: ${error.statusCode} ${error.errorCode}: ${error.message}`,
      tool: toolName,
      operation: "tool_error",
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
      },
    });

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
      messages[error.statusCode] ?? `API error ${error.statusCode}. Contact support if this persists.`;

    return {
      content: [
        {
          type: "text",
          text: `Error: ${friendlyMessage}`,
          annotations: ERROR_CONTENT_ANNOTATIONS,
        },
      ],
      isError: true,
    };
  }

  const errMsg = error instanceof Error ? error.stack ?? error.message : String(error);
  log({
    level: "error",
    message: `Unexpected error: ${errMsg}`,
    tool: toolName,
    operation: "tool_error",
    error: {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error ? error.name : "unknown",
    },
  });

  return {
    content: [{ type: "text", text: "Error: An unexpected error occurred. Contact support if this persists.", annotations: ERROR_CONTENT_ANNOTATIONS }],
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

  return truncateResponse(lines.join("\n"));
}

/**
 * Formats a single record for display.
 */
export function formatRecord(
  label: string,
  record: Record<string, unknown>,
): string {
  return truncateResponse(`${label}:\n${JSON.stringify(record, null, 2)}`);
}

/**
 * Builds an annotated content block for list/search responses.
 */
export function listContent(text: string): AnnotatedTextContent {
  return { type: "text", text, annotations: LIST_CONTENT_ANNOTATIONS };
}

/**
 * Builds an annotated content block for get/read responses.
 */
export function getContent(text: string): AnnotatedTextContent {
  return { type: "text", text, annotations: GET_CONTENT_ANNOTATIONS };
}

/**
 * Builds an annotated content block for create/update/delete responses.
 */
export function mutateContent(text: string): AnnotatedTextContent {
  return { type: "text", text, annotations: MUTATE_CONTENT_ANNOTATIONS };
}

/* ------------------------------------------------------------------ */
/*  Output schemas (MCP spec 2025-11-25: outputSchema + structuredContent) */
/* ------------------------------------------------------------------ */

/**
 * Wraps an item schema in a paginated envelope for list/search tools.
 */
export function paginatedOutput<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });
}

/** Schema for delete operation results. */
export const deleteResultOutput = z.object({
  success: z.boolean(),
  id: z.string(),
});

/* --- Per-resource item schemas ------------------------------------ */

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const invoiceItemOutput = z.object({
  id: z.string(),
  clientName: z.string(),
  items: z.array(lineItemSchema),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().optional(),
  total: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const expenseItemOutput = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  category: z.string().optional(),
  date: z.string().optional(),
  vendor: z.string().optional(),
  taxDeductible: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const addressOutputSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
}).optional();

export const clientItemOutput = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  address: addressOutputSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const productItemOutput = z.object({
  id: z.string(),
  name: z.string(),
  unitPrice: z.number(),
  description: z.string().optional(),
  taxRate: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const quoteItemOutput = z.object({
  id: z.string(),
  clientName: z.string(),
  items: z.array(lineItemSchema),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  total: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const webhookItemOutput = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  active: z.boolean().optional(),
  secret: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

/* ------------------------------------------------------------------ */
/*  Tool execution wrapper with logging + metrics                      */
/* ------------------------------------------------------------------ */

/** Return type of a tool handler — index signature required by MCP SDK */
interface ToolResult {
  [x: string]: unknown;
  content: AnnotatedTextContent[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/**
 * Wraps a tool handler to automatically log execution time, success/failure,
 * and record metrics. Catches errors and routes them through handleToolError.
 *
 * Usage in tool registration files:
 * ```ts
 * async ({ id }) => withToolLogging("get_invoice", async () => {
 *   const result = await client.getInvoice(id);
 *   return { content: [getContent(formatRecord("Invoice", result))], structuredContent: result };
 * })
 * ```
 */
export async function withToolLogging(
  toolName: string,
  fn: () => Promise<ToolResult>,
): Promise<ToolResult> {
  const startTime = Date.now();
  try {
    const result = await fn();
    const durationMs = Math.round(Date.now() - startTime);
    logToolCall(toolName, startTime, true);
    recordToolCall(toolName, durationMs, true);
    return result;
  } catch (error) {
    const durationMs = Math.round(Date.now() - startTime);
    logToolCall(toolName, startTime, false, error instanceof Error ? error as Error & { statusCode?: number; errorCode?: string } : new Error(String(error)));
    recordToolCall(toolName, durationMs, false);
    return handleToolError(error, toolName);
  }
}
