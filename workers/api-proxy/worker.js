/**
 * Frihet API Proxy
 *
 * Proxies requests from api.frihet.io/v1/* to Firebase Cloud Functions.
 * Handles CORS, whitelists request/response headers, and returns responses.
 */

const DEFAULT_UPSTREAM = "https://us-central1-gen-lang-client-0335716041.cloudfunctions.net/publicApi/api";

const ALLOWED_ORIGINS = [
  'https://app.frihet.io',
  'https://frihet.io',
  'https://www.frihet.io',
  'https://frihet-erp.vercel.app',
];

/** Request headers allowed to pass through to upstream */
const ALLOWED_REQUEST_HEADERS = [
  'x-api-key',
  'content-type',
  'accept',
  'authorization',
  'user-agent',
  'accept-language',
];

/** Response headers allowed to pass through to client */
const ALLOWED_RESPONSE_HEADERS = [
  'content-type',
  'content-length',
  'cache-control',
  'etag',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
];

/**
 * Build filtered request headers from whitelist only.
 * Always sets Host to the upstream hostname.
 */
function buildUpstreamHeaders(request) {
  const headers = new Headers();
  for (const name of ALLOWED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  headers.set('Host', 'us-central1-gen-lang-client-0335716041.cloudfunctions.net');
  return headers;
}

/**
 * Build filtered response headers from whitelist only.
 * Adds CORS headers when the origin is recognized.
 */
function buildResponseHeaders(upstreamResponse, request) {
  const headers = new Headers();
  for (const name of ALLOWED_RESPONSE_HEADERS) {
    const value = upstreamResponse.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  const corsHeaders = getCorsHeaders(request);
  if (corsHeaders) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
  }
  return headers;
}

/**
 * Returns CORS headers only if the Origin is in the whitelist.
 * Returns null for missing or unrecognized origins.
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return null;
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const UPSTREAM = env.FRIHET_UPSTREAM_URL || DEFAULT_UPSTREAM;
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      const corsHeaders = getCorsHeaders(request);
      if (!corsHeaders) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Public routes: forward to /publicApi/ (no /api/ prefix) for root-level endpoints
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/openapi.yaml")) {
      const upstream = new URL(url.pathname, UPSTREAM);
      upstream.pathname = "/publicApi" + url.pathname;
      upstream.search = url.search;
      const headers = buildUpstreamHeaders(request);
      const response = await fetch(upstream.toString(), { method: "GET", headers });
      const responseHeaders = buildResponseHeaders(response, request);
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    }

    const path = url.pathname + url.search;

    // Proxy to upstream
    const upstream = new URL(path, UPSTREAM);
    // Rewrite: api.frihet.io/v1/invoices → upstream/publicApi/api/v1/invoices
    upstream.pathname = "/publicApi/api" + url.pathname;
    upstream.search = url.search;

    const headers = buildUpstreamHeaders(request);

    // Abort before the Worker's 30s limit to fail cleanly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(upstream.toString(), {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.method !== "HEAD"
          ? request.body
          : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseHeaders = buildResponseHeaders(response, request);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      const errorHeaders = { 'Content-Type': 'application/json' };
      const corsHeaders = getCorsHeaders(request);
      if (corsHeaders) {
        Object.assign(errorHeaders, corsHeaders);
      }

      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        {
          status: 502,
          headers: errorHeaders,
        }
      );
    }
  },
};
