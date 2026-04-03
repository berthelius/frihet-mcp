interface Env {
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
  COOKIE_ENCRYPTION_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FRIHET_API_BASE: string;
  FRIHET_OAUTH_API_KEY: string;
  PUBLIC_JWK_CACHE_KV: KVNamespace;
  /** Set to "true" to activate OpenAI-safe profile (strips gov IDs, fixes annotations) */
  FRIHET_OPENAI_MODE?: string;
}
