/**
 * Frihet API Proxy
 *
 * Proxies requests from api.frihet.io/v1/* to Firebase Cloud Functions.
 * Handles CORS, passes all headers, and returns responses as-is.
 */

const DEFAULT_UPSTREAM = "https://us-central1-gen-lang-client-0335716041.cloudfunctions.net/publicApi/api";

const ALLOWED_ORIGINS = [
  'https://app.frihet.io',
  'https://frihet.io',
  'https://www.frihet.io',
  'https://frihet-erp.vercel.app',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
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
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // Proxy to upstream
    const upstream = new URL(path, UPSTREAM);
    // Rewrite: api.frihet.io/v1/invoices → upstream/publicApi/api/v1/invoices
    upstream.pathname = "/publicApi/api" + url.pathname;
    upstream.search = url.search;

    const headers = new Headers(request.headers);
    headers.set("Host", "us-central1-gen-lang-client-0335716041.cloudfunctions.net");

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

      // Clone response and add CORS headers
      const corsHeaders = getCorsHeaders(request);
      const responseHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request),
          },
        }
      );
    }
  },
};
