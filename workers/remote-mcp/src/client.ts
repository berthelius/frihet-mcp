/**
 * HTTP client wrapping the Frihet ERP REST API.
 * Inlined for Cloudflare Workers runtime (no Node.js dependencies).
 */

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  message?: string;
}

const BASE_URL = "https://api.frihet.io/v1";
const MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 25000; // Workers have 30s limit, leave margin

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
      throw new Error("API key is required.");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? BASE_URL;
  }

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

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new FrihetApiError(
          408,
          "request_timeout",
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Rate limit handling
    if (response.status === 429) {
      if (retryCount >= MAX_RETRIES) {
        throw new FrihetApiError(
          429,
          "rate_limit_exceeded",
          "Rate limit exceeded after multiple retries.",
        );
      }
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : DEFAULT_RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.request<T>(method, path, body, query, retryCount + 1);
    }

    // Error responses
    if (!response.ok) {
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

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  // Invoices
  async listInvoices(params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/invoices", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }
  async getInvoice(id: string) {
    return this.request<Record<string, unknown>>("GET", `/invoices/${encodeURIComponent(id)}`);
  }
  async createInvoice(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("POST", "/invoices", data);
  }
  async updateInvoice(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("PUT", `/invoices/${encodeURIComponent(id)}`, data);
  }
  async deleteInvoice(id: string) {
    return this.request<void>("DELETE", `/invoices/${encodeURIComponent(id)}`);
  }
  async searchInvoices(clientName: string, params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/invoices", undefined, {
      clientName,
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  // Expenses
  async listExpenses(params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/expenses", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }
  async getExpense(id: string) {
    return this.request<Record<string, unknown>>("GET", `/expenses/${encodeURIComponent(id)}`);
  }
  async createExpense(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("POST", "/expenses", data);
  }
  async updateExpense(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("PUT", `/expenses/${encodeURIComponent(id)}`, data);
  }
  async deleteExpense(id: string) {
    return this.request<void>("DELETE", `/expenses/${encodeURIComponent(id)}`);
  }

  // Clients
  async listClients(params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/clients", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }
  async getClient(id: string) {
    return this.request<Record<string, unknown>>("GET", `/clients/${encodeURIComponent(id)}`);
  }
  async createClient(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("POST", "/clients", data);
  }
  async updateClient(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("PUT", `/clients/${encodeURIComponent(id)}`, data);
  }
  async deleteClient(id: string) {
    return this.request<void>("DELETE", `/clients/${encodeURIComponent(id)}`);
  }

  // Products
  async listProducts(params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/products", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }
  async getProduct(id: string) {
    return this.request<Record<string, unknown>>("GET", `/products/${encodeURIComponent(id)}`);
  }
  async createProduct(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("POST", "/products", data);
  }
  async updateProduct(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("PUT", `/products/${encodeURIComponent(id)}`, data);
  }
  async deleteProduct(id: string) {
    return this.request<void>("DELETE", `/products/${encodeURIComponent(id)}`);
  }

  // Quotes
  async listQuotes(params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/quotes", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }
  async getQuote(id: string) {
    return this.request<Record<string, unknown>>("GET", `/quotes/${encodeURIComponent(id)}`);
  }
  async createQuote(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("POST", "/quotes", data);
  }
  async updateQuote(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("PUT", `/quotes/${encodeURIComponent(id)}`, data);
  }
  async deleteQuote(id: string) {
    return this.request<void>("DELETE", `/quotes/${encodeURIComponent(id)}`);
  }

  // Webhooks
  async listWebhooks(params?: { limit?: number; offset?: number }) {
    return this.request<PaginatedResponse<Record<string, unknown>>>("GET", "/webhooks", undefined, {
      limit: params?.limit,
      offset: params?.offset,
    });
  }
  async getWebhook(id: string) {
    return this.request<Record<string, unknown>>("GET", `/webhooks/${encodeURIComponent(id)}`);
  }
  async createWebhook(data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("POST", "/webhooks", data);
  }
  async updateWebhook(id: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>("PUT", `/webhooks/${encodeURIComponent(id)}`, data);
  }
  async deleteWebhook(id: string) {
    return this.request<void>("DELETE", `/webhooks/${encodeURIComponent(id)}`);
  }
}
