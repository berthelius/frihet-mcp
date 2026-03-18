/**
 * HTTP client wrapping the Frihet ERP REST API.
 *
 * Handles authentication, pagination, rate-limit retries, and error mapping.
 */

import type { PaginatedResponse, ApiError } from "./types.js";
import { logApiCall, logRetry } from "./logger.js";

const BASE_URL = "https://api.frihet.io/v1";

const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

export class FrihetApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message?: string,
  ) {
    super(message ?? errorCode);
    this.name = "FrihetApiError";
  }
}

export class FrihetClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error(
        "FRIHET_API_KEY is required. Set it as an environment variable or pass it to the constructor.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? BASE_URL;
  }

  // ------------------------------------------------------------------ HTTP
  // ------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
    retryCount = 0,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const startTime = Date.now();
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      const durationMs = Math.round(Date.now() - startTime);
      if (error instanceof Error && error.name === "AbortError") {
        logApiCall(method, path, 408, durationMs);
        throw new FrihetApiError(
          408,
          "request_timeout",
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        );
      }
      logApiCall(method, path, 0, durationMs);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const durationMs = Math.round(Date.now() - startTime);

    // Rate limit handling
    if (response.status === 429) {
      logApiCall(method, path, 429, durationMs);

      if (retryCount >= MAX_RETRIES) {
        throw new FrihetApiError(
          429,
          "rate_limit_exceeded",
          "Rate limit exceeded after multiple retries. Please try again later.",
        );
      }

      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : DEFAULT_RETRY_DELAY_MS * Math.pow(2, retryCount);

      logRetry(method, path, retryCount, delayMs);
      await this.sleep(delayMs);
      return this.request<T>(method, path, body, query, retryCount + 1);
    }

    // Error responses
    if (!response.ok) {
      logApiCall(method, path, response.status, durationMs);
      let errorBody: ApiError;
      try {
        errorBody = (await response.json()) as ApiError;
      } catch {
        errorBody = {
          error: `http_${response.status}`,
          message: response.statusText,
        };
      }
      throw new FrihetApiError(
        response.status,
        errorBody.error,
        errorBody.message ?? errorBody.error,
      );
    }

    logApiCall(method, path, response.status, durationMs);

    // 204 No Content (e.g. DELETE)
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    // Basic response validation
    if (data === null || data === undefined) {
      throw new FrihetApiError(
        response.status,
        'invalid_response',
        'API returned empty response',
      );
    }

    return data as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Wrapper for paginated endpoints — validates response shape has `data` array. */
  private async requestPaginated<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<PaginatedResponse<T>> {
    const result = await this.request<PaginatedResponse<T>>(method, path, body, query);

    if (!result || !Array.isArray(result.data)) {
      throw new FrihetApiError(
        200,
        'invalid_response',
        'API returned invalid paginated response',
      );
    }

    return result;
  }

  // ---------------------------------------------------------------- Public
  // ----------------------------------------------------------------

  // ---------------------------------------------------------------- Invoices
  // ----------------------------------------------------------------

  async listInvoices(
    params?: { limit?: number; offset?: number; status?: string; from?: string; to?: string },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/invoices", undefined, {
      limit: params?.limit,
      offset: params?.offset,
      status: params?.status,
      from: params?.from,
      to: params?.to,
    });
  }

  async getInvoice(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/invoices/${encodeURIComponent(id)}`);
  }

  async createInvoice(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/invoices", data);
  }

  async updateInvoice(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request("PATCH", `/invoices/${encodeURIComponent(id)}`, data);
  }

  async deleteInvoice(id: string): Promise<void> {
    return this.request("DELETE", `/invoices/${encodeURIComponent(id)}`);
  }

  async searchInvoices(
    query: string,
    params?: { limit?: number; offset?: number; status?: string; from?: string; to?: string },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/invoices", undefined, {
      q: query,
      limit: params?.limit,
      offset: params?.offset,
      status: params?.status,
      from: params?.from,
      to: params?.to,
    });
  }

  // ---------------------------------------------------------------- Expenses
  // ----------------------------------------------------------------

  async listExpenses(
    params?: { limit?: number; offset?: number; from?: string; to?: string },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/expenses", undefined, {
      limit: params?.limit,
      offset: params?.offset,
      from: params?.from,
      to: params?.to,
    });
  }

  async getExpense(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/expenses/${encodeURIComponent(id)}`);
  }

  async createExpense(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/expenses", data);
  }

  async updateExpense(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request("PATCH", `/expenses/${encodeURIComponent(id)}`, data);
  }

  async deleteExpense(id: string): Promise<void> {
    return this.request("DELETE", `/expenses/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------- Clients
  // ----------------------------------------------------------------

  async listClients(
    params?: { limit?: number; offset?: number },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/clients", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async getClient(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/clients/${encodeURIComponent(id)}`);
  }

  async createClient(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/clients", data);
  }

  async updateClient(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request("PATCH", `/clients/${encodeURIComponent(id)}`, data);
  }

  async deleteClient(id: string): Promise<void> {
    return this.request("DELETE", `/clients/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------- Products
  // ----------------------------------------------------------------

  async listProducts(
    params?: { limit?: number; offset?: number },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/products", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async getProduct(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/products/${encodeURIComponent(id)}`);
  }

  async createProduct(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/products", data);
  }

  async updateProduct(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request("PATCH", `/products/${encodeURIComponent(id)}`, data);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request("DELETE", `/products/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------- Quotes
  // ----------------------------------------------------------------

  async listQuotes(
    params?: { limit?: number; offset?: number; status?: string; from?: string; to?: string },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/quotes", undefined, {
      limit: params?.limit,
      offset: params?.offset,
      status: params?.status,
      from: params?.from,
      to: params?.to,
    });
  }

  async getQuote(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/quotes/${encodeURIComponent(id)}`);
  }

  async createQuote(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/quotes", data);
  }

  async updateQuote(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request("PATCH", `/quotes/${encodeURIComponent(id)}`, data);
  }

  async deleteQuote(id: string): Promise<void> {
    return this.request("DELETE", `/quotes/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------- Webhooks
  // ----------------------------------------------------------------

  async listWebhooks(
    params?: { limit?: number; offset?: number },
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    return this.requestPaginated("GET", "/webhooks", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async getWebhook(id: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/webhooks/${encodeURIComponent(id)}`);
  }

  async createWebhook(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/webhooks", data);
  }

  async updateWebhook(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request("PATCH", `/webhooks/${encodeURIComponent(id)}`, data);
  }

  async deleteWebhook(id: string): Promise<void> {
    return this.request("DELETE", `/webhooks/${encodeURIComponent(id)}`);
  }
}
