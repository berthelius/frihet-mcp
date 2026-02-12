/**
 * Shared interface for the Frihet ERP API client.
 *
 * Both the local (Node.js) and remote (Cloudflare Workers) FrihetClient
 * classes satisfy this interface via structural typing. Tool registration
 * functions depend on this interface so they can work with either client.
 */

import type { PaginatedResponse } from "./types.js";

export interface IFrihetClient {
  // Invoices
  listInvoices(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getInvoice(id: string): Promise<Record<string, unknown>>;
  createInvoice(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateInvoice(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteInvoice(id: string): Promise<void>;
  searchInvoices(clientName: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;

  // Expenses
  listExpenses(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getExpense(id: string): Promise<Record<string, unknown>>;
  createExpense(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateExpense(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteExpense(id: string): Promise<void>;

  // Clients
  listClients(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getClient(id: string): Promise<Record<string, unknown>>;
  createClient(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateClient(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteClient(id: string): Promise<void>;

  // Products
  listProducts(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getProduct(id: string): Promise<Record<string, unknown>>;
  createProduct(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateProduct(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteProduct(id: string): Promise<void>;

  // Quotes
  listQuotes(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getQuote(id: string): Promise<Record<string, unknown>>;
  createQuote(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateQuote(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteQuote(id: string): Promise<void>;

  // Webhooks
  listWebhooks(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getWebhook(id: string): Promise<Record<string, unknown>>;
  createWebhook(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateWebhook(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteWebhook(id: string): Promise<void>;
}
