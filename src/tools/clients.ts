/**
 * Client tools for the Frihet MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { FrihetClient } from "../client.js";
import { handleToolError, formatPaginatedResponse, formatRecord } from "./shared.js";

const addressSchema = z
  .object({
    street: z.string().optional().describe("Street address / Direccion"),
    city: z.string().optional().describe("City / Ciudad"),
    postalCode: z.string().optional().describe("Postal code / Codigo postal"),
    country: z.string().optional().describe("Country (ISO code) / Pais"),
  })
  .optional()
  .describe("Client address / Direccion del cliente");

export function registerClientTools(server: McpServer, client: FrihetClient): void {
  // -- list_clients --

  server.registerTool(
    "list_clients",
    {
      title: "List Clients",
      description:
        "List all clients/customers with optional pagination. " +
        "Returns contact info, tax IDs, and addresses. " +
        "/ Lista todos los clientes con paginacion opcional. " +
        "Devuelve informacion de contacto, NIF/CIF y direcciones.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional().describe("Max results (1-100) / Resultados maximos"),
        offset: z.number().int().min(0).optional().describe("Offset / Desplazamiento"),
      },
    },
    async ({ limit, offset }) => {
      try {
        const result = await client.listClients({ limit, offset });
        return {
          content: [{ type: "text", text: formatPaginatedResponse("clients", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- get_client --

  server.registerTool(
    "get_client",
    {
      title: "Get Client",
      description:
        "Get a single client by their ID. Returns full contact details. " +
        "/ Obtiene un cliente por su ID. Devuelve todos los datos de contacto.",
      inputSchema: {
        id: z.string().describe("Client ID / ID del cliente"),
      },
    },
    async ({ id }) => {
      try {
        const result = await client.getClient(id);
        return {
          content: [{ type: "text", text: formatRecord("Client", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- create_client --

  server.registerTool(
    "create_client",
    {
      title: "Create Client",
      description:
        "Create a new client/customer. Requires at minimum a name. " +
        "Clients are used when creating invoices and quotes. " +
        "/ Crea un nuevo cliente. Requiere como minimo un nombre. " +
        "Los clientes se usan al crear facturas y presupuestos.",
      inputSchema: {
        name: z.string().describe("Client/company name / Nombre del cliente o empresa"),
        email: z.string().optional().describe("Email address / Correo electronico"),
        phone: z.string().optional().describe("Phone number / Telefono"),
        taxId: z.string().optional().describe("Tax ID (NIF/CIF/VAT) / NIF o CIF"),
        address: addressSchema,
      },
    },
    async (input) => {
      try {
        const result = await client.createClient(input);
        return {
          content: [{ type: "text", text: formatRecord("Client created", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- update_client --

  server.registerTool(
    "update_client",
    {
      title: "Update Client",
      description:
        "Update an existing client. Only the provided fields will be changed. " +
        "/ Actualiza un cliente existente. Solo se modifican los campos proporcionados.",
      inputSchema: {
        id: z.string().describe("Client ID / ID del cliente"),
        name: z.string().optional().describe("Name / Nombre"),
        email: z.string().optional().describe("Email / Correo"),
        phone: z.string().optional().describe("Phone / Telefono"),
        taxId: z.string().optional().describe("Tax ID / NIF/CIF"),
        address: addressSchema,
      },
    },
    async ({ id, ...data }) => {
      try {
        const result = await client.updateClient(id, data);
        return {
          content: [{ type: "text", text: formatRecord("Client updated", result) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );

  // -- delete_client --

  server.registerTool(
    "delete_client",
    {
      title: "Delete Client",
      description:
        "Permanently delete a client by their ID. This action cannot be undone. " +
        "Warning: this may affect existing invoices and quotes referencing this client. " +
        "/ Elimina permanentemente un cliente por su ID. Esta accion no se puede deshacer. " +
        "Advertencia: puede afectar a facturas y presupuestos existentes.",
      inputSchema: {
        id: z.string().describe("Client ID / ID del cliente"),
      },
    },
    async ({ id }) => {
      try {
        await client.deleteClient(id);
        return {
          content: [{ type: "text", text: `Client ${id} deleted successfully. / Cliente ${id} eliminado correctamente.` }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    },
  );
}
