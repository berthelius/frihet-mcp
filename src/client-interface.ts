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
  listInvoices(params?: { limit?: number; offset?: number; after?: string; fields?: string; status?: string; from?: string; to?: string; clientId?: string; seriesId?: string }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getInvoice(id: string): Promise<Record<string, unknown>>;
  createInvoice(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateInvoice(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteInvoice(id: string): Promise<void>;
  searchInvoices(query: string, params?: { limit?: number; offset?: number; after?: string; fields?: string; status?: string; from?: string; to?: string }): Promise<PaginatedResponse<Record<string, unknown>>>;

  // Expenses
  listExpenses(params?: { limit?: number; offset?: number; after?: string; fields?: string; from?: string; to?: string; vendorId?: string; category?: string }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getExpense(id: string): Promise<Record<string, unknown>>;
  createExpense(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateExpense(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteExpense(id: string): Promise<void>;

  // Clients
  listClients(params?: { limit?: number; offset?: number; after?: string; fields?: string; q?: string; stage?: string }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getClient(id: string): Promise<Record<string, unknown>>;
  createClient(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateClient(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteClient(id: string): Promise<void>;

  // Products
  listProducts(params?: { limit?: number; offset?: number; after?: string; fields?: string; q?: string; isActive?: boolean }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getProduct(id: string): Promise<Record<string, unknown>>;
  createProduct(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateProduct(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteProduct(id: string): Promise<void>;

  // Quotes
  listQuotes(params?: { limit?: number; offset?: number; after?: string; fields?: string; status?: string; from?: string; to?: string; clientId?: string; seriesId?: string }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getQuote(id: string): Promise<Record<string, unknown>>;
  createQuote(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateQuote(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteQuote(id: string): Promise<void>;

  // Vendors
  listVendors(params?: { q?: string; limit?: number; offset?: number; after?: string; fields?: string }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getVendor(id: string): Promise<Record<string, unknown>>;
  createVendor(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateVendor(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteVendor(id: string): Promise<void>;

  // Invoice actions
  sendInvoice(id: string, to?: string): Promise<Record<string, unknown>>;
  markInvoicePaid(id: string, paidDate?: string): Promise<Record<string, unknown>>;
  getInvoicePdf(id: string): Promise<Record<string, unknown>>;
  getInvoiceEInvoice(invoiceId: string): Promise<any>;
  createCreditNote(invoiceId: string, data: { reason: string; reasonDescription?: string; fullCredit?: boolean; issueDate?: string }): Promise<Record<string, unknown>>;

  // Quote actions
  sendQuote(id: string, to?: string): Promise<Record<string, unknown>>;

  // Webhooks
  listWebhooks(params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  getWebhook(id: string): Promise<Record<string, unknown>>;
  createWebhook(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateWebhook(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteWebhook(id: string): Promise<void>;

  // CRM: Contacts (subcollection of clients)
  listClientContacts(clientId: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  createClientContact(clientId: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteClientContact(clientId: string, contactId: string): Promise<void>;

  // CRM: Activities (subcollection of clients)
  listClientActivities(clientId: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  logClientActivity(clientId: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;

  // CRM: Notes (subcollection of clients)
  listClientNotes(clientId: string, params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<Record<string, unknown>>>;
  createClientNote(clientId: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteClientNote(clientId: string, noteId: string): Promise<void>;

  // Intelligence endpoints
  getBusinessContext(): Promise<Record<string, unknown>>;
  getMonthlySummary(month?: string): Promise<Record<string, unknown>>;
  getQuarterlyTaxes(quarter?: string): Promise<Record<string, unknown>>;
}
