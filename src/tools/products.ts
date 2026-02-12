/**
 * Product tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import { handleToolError, formatPaginatedResponse, formatRecord } from "./shared.js";

export function registerProductTools(server: McpServer, client: IFrihetClient): void {
  // -- list_products --

  server.registerTool(
    "list_products",
    {
      title: "List Products",
      description:
        "List all products/services with optional pagination. " +
        "Products are reusable items that can be added to invoices and quotes. " +
        "/ Lista todos los productos/servicios con paginacion opcional. " +
        "Los productos son conceptos reutilizables para facturas y presupuestos.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listProducts({ limit, offset });
        return {
          content: [{ type: "text", text: formatPaginatedResponse("products", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- get_product --

  server.registerTool(
    "get_product",
    {
      title: "Get Product",
      description:
        "Get a single product/service by its ID. " +
        "/ Obtiene un producto/servicio por su ID.",
      inputSchema: {
        id: z.string().describe("Product ID / ID del producto"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getProduct(id);
        return {
          content: [{ type: "text", text: formatRecord("Product", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- create_product --

  server.registerTool(
    "create_product",
    {
      title: "Create Product",
      description:
        "Create a new product or service. Requires a name and unit price. " +
        "Products can be referenced when creating invoices and quotes for faster data entry. " +
        "/ Crea un nuevo producto o servicio. Requiere nombre y precio unitario. " +
        "Los productos se pueden usar al crear facturas y presupuestos.",
      inputSchema: {
        name: z.string().describe("Product/service name / Nombre del producto o servicio"),
        unitPrice: z.number().describe("Unit price in EUR / Precio unitario en EUR"),
        description: z.string().optional().describe("Product description / Descripcion"),
        unit: z
          .string()
          .optional()
          .describe("Unit of measurement (e.g. 'hour', 'unit', 'kg') / Unidad de medida"),
        taxRate: z
          .number()
          .min(0)
          .max(100)
          .optional()
          .describe("Default tax rate % (e.g. 21 for 21% IVA) / IVA por defecto"),
        sku: z.string().optional().describe("SKU / Reference code / Codigo de referencia"),
      },
    },
    async (input) => {
      try {
        const result = await client.createProduct(input);
        return {
          content: [{ type: "text", text: formatRecord("Product created", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- update_product --

  server.registerTool(
    "update_product",
    {
      title: "Update Product",
      description:
        "Update an existing product. Only the provided fields will be changed. " +
        "/ Actualiza un producto existente. Solo se modifican los campos proporcionados.",
      inputSchema: {
        id: z.string().describe("Product ID / ID del producto"),
        name: z.string().optional().describe("Name / Nombre"),
        unitPrice: z.number().optional().describe("Unit price / Precio unitario"),
        description: z.string().optional().describe("Description / Descripcion"),
        unit: z.string().optional().describe("Unit / Unidad"),
        taxRate: z.number().min(0).max(100).optional().describe("Tax rate % / IVA %"),
        sku: z.string().optional().describe("SKU / Referencia"),
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateProduct(id, data);
        return {
          content: [{ type: "text", text: formatRecord("Product updated", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- delete_product --

  server.registerTool(
    "delete_product",
    {
      title: "Delete Product",
      description:
        "Permanently delete a product by its ID. This action cannot be undone. " +
        "/ Elimina permanentemente un producto por su ID. Esta accion no se puede deshacer.",
      inputSchema: {
        id: z.string().describe("Product ID / ID del producto"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteProduct(id);
        return {
          content: [{ type: "text", text: `Product ${id} deleted successfully. / Producto ${id} eliminado correctamente.` }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
