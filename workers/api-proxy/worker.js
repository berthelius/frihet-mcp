/**
 * Frihet API Proxy
 *
 * Proxies requests from api.frihet.io/v1/* to Firebase Cloud Functions.
 * Handles CORS, passes all headers, and returns responses as-is.
 */

const DEFAULT_UPSTREAM = "https://us-central1-frihet-app.cloudfunctions.net/publicApi/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env) {
    const UPSTREAM = env.FRIHET_UPSTREAM_URL || DEFAULT_UPSTREAM;
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // Proxy to upstream
    const upstream = new URL(path, UPSTREAM);
    // Rewrite: api.frihet.io/v1/invoices → upstream/publicApi/api/v1/invoices
    upstream.pathname = "/publicApi/api" + url.pathname;
    upstream.search = url.search;

    const headers = new Headers(request.headers);
    headers.set("Host", "us-central1-frihet-app.cloudfunctions.net");

    const response = await fetch(upstream.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    });

    // Clone response and add CORS headers
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
