# Frihet MCP Server

Open-source MCP server for Frihet ERP. TypeScript, Node >= 18, MIT license. Distributed via npm + Cloudflare Worker (mcp.frihet.io) + Smithery + Anthropic registry.

## Build & Test

```bash
npm install                      # Install deps
npm run build                    # tsc → dist/
npm test                         # Run native node test suite
npm start                        # Run server via stdio (local debug)
npm publish --tag beta           # Publish beta release
npm publish                      # Publish stable release
```

**Pre-commit**: `npm run build` must succeed. `npm test` must pass.

## Code Style

- TypeScript strict mode (`strict: true`)
- ES2022 target, NodeNext module resolution
- Tools follow `frihet.<resource>.<action>` naming
- Structured output (JSON) on every tool, NOT prose
- Zod schemas on `inputSchema` (strict)
- Errors: throw `McpError` with cause + suggestion
- One tool per logical operation — no batching unless explicit
- Async/await throughout, no callbacks
- Logger from `src/logger.ts` — never `console.log` in tool code
- Observability: every tool wrapped via `src/observability.ts` (Langfuse)

## Conventions

- Commit messages: `feat(tools): add <family> CRUD` / `fix(invoices): handle null totals`
- Branch names: `feat/<descriptive-slug>`
- Atomic commits — one tool family per commit minimum
- Update README.md tool count badge when adding tools
- Update CHANGELOG.md on every release
- Bump version semver: feat=minor, fix=patch, breaking=major
- Tool descriptions in English (LLM understanding)
- Test fixtures in `src/__tests__/fixtures/`

## Gotchas

- **NEVER mutate `process.env`** — read once into config object
- **API client must respect `Idempotency-Key`** — propagate from tool input when present
- **Don't log full request bodies** — PII (NIF/IBAN/email). Use `mask()` from logger
- **Cloudflare Worker is separate** — `mcp.frihet.io` deployment is in a different repo. Pinging Worker is not a substitute for testing the npm package locally
- **Smithery rebuilds on push** — verify Smithery config (`smithery.yaml`) when changing entry points
- **MCP SDK breaking changes** — pin `@modelcontextprotocol/sdk` minor; major bumps require manual review
- **Beta tag rules** — `1.x.x-beta.N` for prerelease, `1.x.x` for stable. NEVER publish stable from a `feat/*` branch
- **Postinstall script** — `node scripts/postinstall.js || true` runs harmlessly. Do not make required

## Security

- API key (`FRIHET_API_KEY`) read from env at server start, never logged
- Bearer token sent only to `https://api.frihet.io/v1`
- No third-party HTTP outside Frihet API + Langfuse
- Worker (mcp.frihet.io) handles OAuth + key exchange separately
- Errors include cause but never echo full Authorization header

---

## Multi-agent dispatch + LiteLLM cost rules

For tool-batch tasks (adding 8 tools in one family, refactoring across 13 files), dispatch parallel Sonnet workers in worktrees.

### Worker prompt template

```
Sonnet worker, worktree, repo Frihet-io/frihet-mcp.

Files in scope (verified):
  - src/tools/<family>.ts (new file)
  - src/tools/register-all.ts (add registration)
  - src/__tests__/<family>.test.ts (new file)
  - README.md (bump tool count badge)
  - CHANGELOG.md (add entry)

Task: Add <N> tools for <family>: <list>. Each tool follows frihet.<family>.<action>
naming, structured JSON output, Zod inputSchema strict, McpError on failure,
Idempotency-Key support on mutations.

Constraints:
  - Pre-commit: npm run build && npm test
  - Branch: feat/<family>-tools
  - Commits: 1 per tool minimum, semantic messages
  - Use ~/.claude/bin/llm --code for tool scaffolding from existing patterns
    (see src/tools/invoices.ts as canonical example)
  - Use ~/.claude/bin/llm --grunt for JSDoc comments + test scaffolds
  - DO NOT use llm router for: error handling logic, idempotency,
    auth/scope, anything touching real customer money

Trust Area: YES (this repo is Trust Area — tool errors propagate to agents
acting on user data). Spend final 10% as adversarial reviewer.

Report: branch, PR URL, build + test output.
```

### LiteLLM router (cost-optim)

CLI: `~/.claude/bin/llm --grunt|--code|--pro|--reason "<prompt>"`. Use for:

- Tool boilerplate from existing pattern (input schema, registration, output shaping)
- JSDoc comments
- README badge updates
- CHANGELOG entries (Conventional Commits style)
- OpenAPI fragment generation (matching API V1)
- Test scaffolds with mocked client

NEVER use LiteLLM for:
- Auth/scope logic
- Idempotency implementation
- Error handling (must be hand-written for predictability)
- Worker (mcp.frihet.io) routing logic
- Any tool that touches real customer money

### Trust Area gates (MCP-specific)

- Every mutating tool must have at least 1 idempotency test
- Every tool must have at least 1 schema rejection test (bad input)
- Every tool must have at least 1 happy path test
- Coverage target: > 80% lines, 100% on auth/scope branches
- Pre-publish: smoke install from npm tarball + run against staging API

### Worker-side static surface (Cloudflare Worker, separate repo)

The Cloudflare Worker serving `mcp.frihet.io` MUST also serve:
- `/llms.txt` (200, plain text, brief overview)
- `/llms-full.txt` (200, plain text, full reference)
- `/robots.txt` (200, allow AI crawlers explicit)
- `/sitemap.xml` (200, single URL or full)
- `/openapi.json` (200, mirror of api.frihet.io v1)
- `/mcp.json` (200, MCP server manifest)
- `/.well-known/mcp` (200, well-known endpoint discovery)
- `/.well-known/ai-plugin.json` (200, ChatGPT plugin spec)

Wave 1 sprint includes this fix. Audit table in CLAUDE.md.
