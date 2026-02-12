# Frihet MCP Server & AI Tools Distribution Roadmap

**Date:** February 2026
**Goal:** Be the FIRST Spanish ERP with AI-native developer tools. Maximum visibility, minimum spend.

---

## Competitive Analysis: Spanish ERP AI Landscape

### Current state of competitors

| Competitor | MCP Server | Zapier | Make | AI Features | Developer API |
|-----------|-----------|--------|------|-------------|---------------|
| **Holded** | YES (third-party, basic, [github.com/p3rs0n3/holded-mcp-server](https://github.com/p3rs0n3/holded-mcp-server)) + Zapier MCP wrapper | YES | YES | None native | REST API |
| **Billin** | NO | NO | NO | None | Limited API |
| **Quipu** | NO | YES (basic) | NO | None | REST API ([quipuapp.github.io](https://quipuapp.github.io/api-v1-docs/)) |
| **Anfix** | NO | NO | NO | None | No public API |
| **Declarando** | NO | NO | NO | None | No public API |
| **Contasimple** | NO | YES (basic) | NO | None | No public API |

### Verdict

Holded has a third-party MCP server (not official, limited to bookings), plus a Zapier-generated MCP wrapper. **No Spanish ERP has an official, first-party MCP server.** Frihet would be the first with a purpose-built, AI-native MCP server. This is a significant first-mover advantage.

None of them have Claude Skills, Vercel AI SDK tools, Docker MCP images, or n8n community nodes. The entire AI-native developer tools space for Spanish ERPs is wide open.

---

## Tier 1: Do Immediately (High ROI, Free, <1 week total)

### 1.1 Official MCP Registry

- **URL:** [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)
- **What:** Register `io.github.berthelius/frihet-erp` as an official MCP server
- **Process:**
  1. Publish the MCP server package to npm first (registry only hosts metadata)
  2. Install `mcp-publisher` CLI (`brew install mcp-publisher`)
  3. Run `mcp-publisher init` to generate `server.json`
  4. Authenticate via GitHub (namespace: `io.github.berthelius`)
  5. Run `mcp-publisher publish`
- **Requirements:** npm package published, GitHub account, server.json with metadata
- **Effort:** 2-3 hours
- **Cost:** Free
- **Impact:** HIGH. This is the canonical source of truth. All sub-registries (Glama, Smithery, etc.) pull from here. Being listed here means automatic propagation to the ecosystem.
- **Status:** Registry is in preview but accepting submissions

### 1.2 npm Package

- **URL:** [npmjs.com](https://www.npmjs.com/)
- **What:** Publish `@frihet/mcp-server` (or `frihet-mcp-server`)
- **Process:** Standard `npm publish` workflow. Ensure package.json has proper metadata, README, keywords (mcp, erp, invoicing, spain, facturacion)
- **Requirements:** npm account, clean package
- **Effort:** 1-2 hours (likely already almost ready given the repo structure)
- **Cost:** Free
- **Impact:** HIGH. Required for Official MCP Registry. Also makes `npx frihet-mcp-server` work directly.

### 1.3 Smithery.ai

- **URL:** [smithery.ai](https://smithery.ai/)
- **What:** List Frihet MCP server on the largest MCP discovery platform (7,300+ servers)
- **Process:**
  1. Go to [smithery.ai/new](https://smithery.ai/new)
  2. Sign in with GitHub
  3. Either link your npm package or point to your deployed Streamable HTTP endpoint
  4. Fill in metadata, description, screenshots
- **Requirements:** Published server (npm or deployed URL)
- **Effort:** 1 hour
- **Cost:** Free
- **Impact:** HIGH. Smithery is the #1 discovery platform for MCP servers. Developers actively search here. Gets analytics on tool calls and usage patterns.

### 1.4 Glama.ai / mcpservers.org

- **URL:** [glama.ai/mcp/servers](https://glama.ai/mcp/servers) (also powers [mcpservers.org](https://mcpservers.org/))
- **What:** List on Glama's MCP directory (indexes, scans, and ranks servers)
- **Process:**
  1. Submit at [mcpservers.org/submit](https://mcpservers.org/submit)
  2. Claim the server on Glama for enhanced listing
- **Requirements:** Published GitHub repo or npm package
- **Effort:** 30 minutes
- **Cost:** Free
- **Impact:** HIGH. Glama indexes and ranks by security/compatibility. Good ranking = organic discovery.

### 1.5 PulseMCP

- **URL:** [pulsemcp.com/servers](https://www.pulsemcp.com/servers)
- **What:** List on PulseMCP's daily-updated directory (8,240+ servers)
- **Process:** Submit via their website or API
- **Requirements:** Published MCP server
- **Effort:** 30 minutes
- **Cost:** Free
- **Impact:** MEDIUM-HIGH. Growing directory, updated daily.

### 1.6 awesome-mcp-servers (GitHub)

- **URL (punkpeye):** [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- **URL (wong2):** Submit via [mcpservers.org/submit](https://mcpservers.org/submit) (no direct PRs)
- **URL (appcypher):** [github.com/appcypher/awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers)
- **What:** PR to add Frihet to curated awesome-lists under "Finance / ERP" category
- **Process:** Fork, add entry with description + badges (TypeScript, cloud/local, cross-platform), submit PR
- **Requirements:** Public GitHub repo
- **Effort:** 1 hour (for all three lists)
- **Cost:** Free
- **Impact:** HIGH. These lists are the top organic search results for "MCP servers." Thousands of stars.

### 1.7 mcp.so

- **URL:** [mcp.so](https://mcp.so/)
- **What:** List on mcp.so directory (17,600+ servers collected)
- **Process:** Submit via website
- **Requirements:** Published MCP server
- **Effort:** 30 minutes
- **Cost:** Free
- **Impact:** MEDIUM. Large directory, good for SEO.

### 1.8 LobeHub MCP Marketplace

- **URL:** [lobehub.com/mcp](https://lobehub.com/mcp)
- **What:** List in LobeHub's marketplace (29,171 servers, "Business Services" category has 1,701)
- **Process:** Use the "Submit MCP" feature on the marketplace
- **Requirements:** Published MCP server
- **Effort:** 30 minutes
- **Cost:** Free
- **Impact:** MEDIUM. Large audience, especially in the LobeChat ecosystem.

### 1.9 MCPMarket

- **URL:** [mcpmarket.com](https://mcpmarket.com/)
- **What:** Directory listing
- **Process:** Submit via website
- **Requirements:** Published MCP server
- **Effort:** 20 minutes
- **Cost:** Free
- **Impact:** MEDIUM. Growing directory.

### 1.10 GitHub README & Documentation

- **What:** Ensure the GitHub repo README has:
  - One-click install badges for Claude Desktop, Cursor, Windsurf, Cline
  - `npx` install command
  - Docker run command
  - Smithery install button
  - MCP config JSON snippets for each IDE
- **Effort:** 2-3 hours
- **Cost:** Free
- **Impact:** HIGH. This is where developers land. Good README = conversions.

**Tier 1 Total Effort:** ~2-3 days
**Tier 1 Total Cost:** $0

---

## Tier 2: Do Within 1 Month (More work, worth it)

### 2.1 Docker Hub MCP Catalog

- **URL:** [hub.docker.com/mcp](https://hub.docker.com/mcp)
- **What:** Submit Frihet MCP server to Docker's official MCP Catalog
- **Process:**
  1. Create PR at [github.com/docker/mcp-registry](https://github.com/docker/mcp-registry)
  2. Choose "Docker-built" tier (Docker handles build, signing, SBOMs, security scanning) OR "Community-built" (maintain your own image)
  3. PR reviewed, listed within 24 hours of approval
- **Requirements:** Dockerfile, working MCP server, GitHub repo
- **Effort:** 4-6 hours (Dockerfile + PR + testing)
- **Cost:** Free
- **Impact:** HIGH. Docker MCP Catalog is becoming the trusted distribution channel. "Docker-built" tier adds cryptographic signatures and automatic security updates. Integrates directly into Docker Desktop MCP Toolkit.

### 2.2 Claude Skills (Anthropic Ecosystem)

- **URL:** [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **What:** Create a `frihet-erp` Claude Skill (SKILL.md) that helps users interact with Frihet
- **How it works:** Skill = folder with SKILL.md containing YAML frontmatter + instructions. Claude loads it dynamically. Users install via Claude Code or Claude.ai Settings > Skills.
- **Distribution channels:**
  1. PR to `anthropics/skills` official repo (high visibility, curated)
  2. Auto-indexed by [SkillsMP](https://skillsmp.com/) (87,000+ skills, aggregates from GitHub)
  3. Auto-indexed by [SkillHub](https://www.skillhub.club/) (7,000+ skills)
  4. Listed on [mcpservers.org/claude-skills](https://mcpservers.org/claude-skills)
- **Requirements:** SKILL.md file, public GitHub repo
- **Effort:** 4-6 hours (write skill instructions, test with Claude Code)
- **Cost:** Free
- **Impact:** HIGH. Claude Code + Claude.ai have millions of users. The skill can reference the MCP server for actual API calls. This is a unique distribution channel that no Spanish ERP has touched.

### 2.3 Vercel AI SDK Tool

- **URL:** [ai-tools-registry.vercel.app](https://ai-tools-registry.vercel.app/) and [ai-sdk-agents.vercel.app](https://ai-sdk-agents.vercel.app/)
- **What:** Create a Frihet tool for the Vercel AI SDK Tools Registry
- **Process:**
  1. Create the tool as a TypeScript file compatible with AI SDK 6 tool format
  2. Submit PR to the registry GitHub repo ([github.com/xn1cklas/ai-tools-registry](https://github.com/xn1cklas/ai-tools-registry))
  3. Users install via: `npx shadcn@latest add @ai-tools/frihet-erp`
- **Requirements:** TypeScript tool implementation, follows AI SDK tool interface
- **Effort:** 1-2 days
- **Cost:** Free
- **Impact:** MEDIUM-HIGH. AI SDK has 20M+ monthly downloads. Vercel/Next.js developers building AI apps can add Frihet tools instantly. Unique positioning as the only Spanish ERP in this ecosystem.

### 2.4 Cline MCP Marketplace

- **URL:** [cline.bot](https://cline.bot/) (VS Code extension)
- **What:** List Frihet MCP server in Cline's built-in MCP Marketplace
- **Process:** Cline's marketplace curates MCP servers from the ecosystem. Ensure the server is properly listed in the major directories (Tier 1) and has good documentation. Cline may auto-discover it, or you can submit directly.
- **Requirements:** Published MCP server with good docs
- **Effort:** 1-2 hours (verification + submission)
- **Cost:** Free
- **Impact:** MEDIUM-HIGH. Cline has 4M+ developer installs. MCP marketplace is an "app store" inside VS Code.

### 2.5 Cursor Directory

- **URL:** [cursor.directory/mcp](https://cursor.directory/mcp) and [mcpcursor.com](https://mcpcursor.com/)
- **What:** List Frihet MCP server for Cursor IDE users
- **Process:** Submit to cursor.directory and MCPCursor
- **Requirements:** Working MCP config JSON for `.cursor/mcp.json`
- **Effort:** 1 hour
- **Cost:** Free
- **Impact:** MEDIUM-HIGH. Cursor is one of the most popular AI IDEs. Developers can discover and install MCP servers through the directory.

### 2.6 OpenAI Codex CLI Compatibility

- **URL:** [developers.openai.com/codex/mcp/](https://developers.openai.com/codex/mcp/)
- **What:** Ensure Frihet MCP server works with Codex CLI
- **Process:** Codex supports STDIO and Streamable HTTP MCP servers. Add config instructions for `~/.codex/config.toml`. Test with `codex mcp add`.
- **Requirements:** Standard MCP server (already compatible if following spec)
- **Effort:** 2-3 hours (testing + documentation)
- **Cost:** Free
- **Impact:** MEDIUM. OpenAI's Codex CLI adopted MCP. Being compatible means Frihet works with both Claude AND ChatGPT ecosystems.

### 2.7 Homebrew Tap

- **URL:** Create `berthelius/homebrew-frihet` on GitHub
- **What:** `brew install berthelius/frihet/frihet-mcp` for macOS/Linux developers
- **Process:**
  1. Create GitHub repo `homebrew-frihet`
  2. Add `Formula/frihet-mcp.rb` with Ruby formula
  3. Point to npm package or binary release
- **Requirements:** GitHub repo, formula file
- **Effort:** 2-3 hours
- **Cost:** Free
- **Impact:** MEDIUM. Developer convenience. Good for the "install in 1 command" marketing story.

### 2.8 Remote MCP Server (Cloudflare Workers)

- **URL:** [developers.cloudflare.com/agents/guides/remote-mcp-server/](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- **What:** Deploy Frihet MCP server as a remote Streamable HTTP endpoint on Cloudflare Workers
- **Why:** Remote MCP means users don't need to install anything locally. Just paste a URL. Claude.ai supports remote MCP connectors. Cursor, Windsurf, and others support remote servers.
- **Process:** Adapt the existing MCP server to use Streamable HTTP transport, deploy to Cloudflare Workers
- **Requirements:** Cloudflare account (already have one), adapted server code
- **Effort:** 1-2 days
- **Cost:** Free tier likely sufficient (Cloudflare Workers free tier: 100K requests/day)
- **Impact:** HIGH. This is the future of MCP distribution. Zero-install experience. Also enables listing on [awesome-remote-mcp-servers](https://github.com/jaw9c/awesome-remote-mcp-servers).

### 2.9 Product Hunt Launch

- **URL:** [producthunt.com](https://www.producthunt.com/)
- **What:** Launch "Frihet MCP - The first AI-native Spanish ERP" on Product Hunt
- **Angle:** Developer tools, MCP, AI-first invoicing. The "first Spanish ERP with MCP" narrative is strong.
- **Process:**
  1. Prepare assets (logo, screenshots, demo GIF, tagline)
  2. Write compelling description focused on the AI-native angle
  3. Schedule launch for a Tuesday-Thursday (best days)
  4. Prepare a demo video showing Claude/Cursor creating invoices via MCP
- **Requirements:** Polish the landing page, prepare assets
- **Effort:** 1-2 days preparation
- **Cost:** Free
- **Impact:** HIGH for awareness. Product Hunt is excellent for developer tools. MCP-related launches have been getting good traction (MCP Playground got 170 upvotes).

**Tier 2 Total Effort:** ~2-3 weeks
**Tier 2 Total Cost:** $0

---

## Tier 3: Strategic (2-3 months, dev investment required)

### 3.1 Zapier Integration

- **URL:** [zapier.com/developer-platform](https://zapier.com/developer-platform)
- **What:** Official Frihet app on Zapier (triggers: new invoice, new client, payment received; actions: create invoice, create client, mark as paid)
- **Process:**
  1. Use [Zapier Platform UI](https://zapier.com/developer-platform/integrations) (low-code) or Platform CLI
  2. Define authentication (API key or OAuth)
  3. Build triggers and actions against Frihet API
  4. Test with Zap editor
  5. Submit for review (PublishBot assists)
- **Requirements:** Stable REST API, OAuth or API key auth, good API docs
- **Effort:** 2-3 weeks
- **Cost:** FREE to build and publish. No fees.
- **Impact:** VERY HIGH. Zapier has millions of users. Being on Zapier legitimizes Frihet as a "real" product. Enables "connect Frihet to 8,000+ apps" marketing.
- **Note:** Zapier also auto-generates MCP wrappers for listed apps, so this gives you a Zapier MCP for free.

### 3.2 Make (Integromat) App

- **URL:** [make.com](https://www.make.com/)
- **What:** Official Frihet app on Make
- **Process:**
  1. Use Make's Custom App framework
  2. Define modules (triggers, actions, searches) against Frihet API
  3. Submit for listing in Make's app directory
- **Requirements:** REST API, API key/OAuth auth
- **Effort:** 2-3 weeks
- **Cost:** Free to develop
- **Impact:** HIGH. Make is strong in Europe (good for Spanish market). Visual workflow builder appeals to non-developers (gestorias, asesores).

### 3.3 n8n Community Node

- **URL:** [docs.n8n.io/integrations/creating-nodes/](https://docs.n8n.io/integrations/creating-nodes/)
- **What:** Publish `n8n-nodes-frihet` to npm
- **Process:**
  1. Use `npm create @n8n/node` or clone `n8n-nodes-starter`
  2. Implement triggers (webhooks) and actions (CRUD operations)
  3. Package name must start with `n8n-nodes-`
  4. Publish to npm with `n8n-node release`
  5. Submit for verification via [n8n Creator Portal](https://portal.n8n.io/)
- **Requirements:** npm package following n8n conventions, documentation
- **Effort:** 1-2 weeks
- **Cost:** Free
- **Impact:** HIGH. n8n is the open-source automation tool of choice for developers and self-hosters. Strong in the European/Spanish tech community. Self-hosted n8n users are exactly Frihet's target audience.
- **Note:** n8n may reject nodes that compete with their paid features (unlikely for an ERP integration).

### 3.4 Pipedream Integration

- **URL:** [pipedream.com/developer-platform](https://pipedream.com/developer-platform)
- **What:** Frihet as a Pipedream app with managed auth and pre-built actions
- **Process:**
  1. Via [Pipedream App Partners](https://pipedream.com/docs/apps/app-partners) program, Pipedream handles the development
  2. Or contribute directly to [PipedreamHQ/pipedream](https://github.com/PipedreamHQ/pipedream) open-source repo
- **Requirements:** REST API, clear documentation
- **Effort:** 1 week (if self-building) or less (if Pipedream builds it)
- **Cost:** Free
- **Impact:** MEDIUM. Pipedream is developer-focused. Good for the technical audience. Pipedream Connect provides MCP servers automatically for listed apps.

### 3.5 Activepieces Integration

- **URL:** [activepieces.com](https://www.activepieces.com/) | [github.com/activepieces/activepieces](https://github.com/activepieces/activepieces)
- **What:** Create a Frihet "Piece" (TypeScript npm package)
- **Process:**
  1. Fork the Activepieces repo
  2. Create piece in TypeScript following their framework
  3. Submit PR (60% of pieces are community-contributed)
  4. **Bonus:** Published pieces automatically become MCP servers usable in Claude Desktop, Cursor, Windsurf
- **Requirements:** TypeScript, follows Activepieces piece interface
- **Effort:** 1 week
- **Cost:** Free
- **Impact:** MEDIUM-HIGH. Open source, growing fast (YC backed). The automatic MCP server generation is a unique multiplier.

### 3.6 RapidAPI Listing

- **URL:** [rapidapi.com](https://rapidapi.com/)
- **What:** List Frihet REST API on the world's largest API marketplace
- **Process:**
  1. Create API listing on RapidAPI Hub
  2. Configure endpoints, authentication, pricing tiers
  3. Add documentation, examples, icon (500x500px)
  4. Choose category (Business / Invoicing)
- **Requirements:** REST API with good documentation
- **Effort:** 1 day
- **Cost:** Free to list (RapidAPI takes a cut if you monetize)
- **Impact:** MEDIUM. Good for API discovery. Can offer a freemium tier to drive signups.

### 3.7 GitHub Copilot Extension

- **URL:** [docs.github.com/en/copilot/concepts/context/mcp](https://docs.github.com/en/copilot/concepts/context/mcp)
- **What:** Since GitHub Copilot supports MCP, ensure Frihet MCP server works with VS Code + Copilot
- **Process:** Copilot supports remote MCP servers via Streamable HTTP. If Tier 2.8 (remote deployment) is done, this is automatic.
- **Requirements:** Remote MCP server deployed
- **Effort:** 2-3 hours (testing + docs)
- **Cost:** Free
- **Impact:** MEDIUM-HIGH. GitHub Copilot has the largest market share among AI coding tools.

### 3.8 G2 / Capterra Listing

- **URL:** [g2.com](https://www.g2.com/) / [capterra.com](https://www.capterra.com/)
- **What:** List Frihet as a product with emphasis on AI/MCP capabilities
- **Process:** Create vendor profile, submit product for review
- **Requirements:** Live product, company information
- **Effort:** 1 day
- **Cost:** Free for basic listing (paid for enhanced visibility)
- **Impact:** MEDIUM. Good for SEO and credibility. "AI-native ERP" category positioning.

---

## Tier 4: Enterprise / Long-term (3-6 months)

### 4.1 Tray.io / Workato Connectors

- **What:** Enterprise iPaaS platforms
- **Why later:** Enterprise pricing ($2,500+/mo), limited SDK, overkill for early stage
- **When:** Only pursue when Frihet has enterprise clients requesting it
- **Effort:** 3-4 weeks each
- **Cost:** Free to build, but targets enterprise-only audience

### 4.2 AWS Marketplace

- **What:** List MCP server on AWS Marketplace
- **When:** When you have a hosted/managed version
- **Effort:** 2-3 weeks (compliance, listing process)

### 4.3 Microsoft Azure / Copilot Studio

- **What:** Azure Marketplace + Copilot Studio connector
- **When:** When enterprise demand exists

---

## Execution Checklist

### Week 1 (Tier 1 Blitz)

- [ ] Publish npm package (`@frihet/mcp-server` or `frihet-mcp-server`)
- [ ] Register on Official MCP Registry via `mcp-publisher`
- [ ] Submit to Smithery.ai
- [ ] Submit to Glama.ai / mcpservers.org
- [ ] Submit to PulseMCP
- [ ] Submit to mcp.so
- [ ] Submit to LobeHub MCP Marketplace
- [ ] Submit to MCPMarket
- [ ] PR to punkpeye/awesome-mcp-servers
- [ ] PR to appcypher/awesome-mcp-servers
- [ ] Submit to wong2 via mcpservers.org/submit
- [ ] Polish GitHub README with install badges for all IDEs

### Week 2-3 (Tier 2 Quick Wins)

- [ ] Create Dockerfile, submit to Docker MCP Catalog
- [ ] Write Claude Skill (SKILL.md), PR to anthropics/skills
- [ ] Create Vercel AI SDK tool, submit to registry
- [ ] Submit to Cline MCP Marketplace
- [ ] Submit to cursor.directory and MCPCursor
- [ ] Test with Codex CLI, add docs
- [ ] Create Homebrew tap

### Week 3-4 (Tier 2 Bigger Items)

- [ ] Deploy remote MCP server on Cloudflare Workers
- [ ] Submit to awesome-remote-mcp-servers
- [ ] Prepare Product Hunt launch materials
- [ ] Launch on Product Hunt

### Month 2-3 (Tier 3)

- [ ] Build and submit Zapier integration
- [ ] Build and submit Make app
- [ ] Build and publish n8n community node
- [ ] Build Activepieces piece
- [ ] Submit to Pipedream
- [ ] List on RapidAPI
- [ ] List on G2 / Capterra

---

## Key Narrative for All Listings

Use this positioning consistently across all platforms:

> **Frihet MCP Server** - The first AI-native Spanish ERP. Create invoices, manage clients, track payments, and handle Spanish tax compliance (Verifactu, SII) through any AI assistant. Works with Claude, ChatGPT, Cursor, Windsurf, Cline, and any MCP-compatible tool.

### Keywords to use everywhere

`mcp`, `erp`, `invoicing`, `facturacion`, `spain`, `spanish`, `verifactu`, `sii`, `autonomos`, `pymes`, `ai-native`, `model-context-protocol`, `claude`, `billing`

### Differentiators to highlight

1. **First official MCP server for a Spanish ERP** (Holded's is third-party)
2. **Verifactu & SII compliance via AI** (unique in the market)
3. **Works with every major AI tool** (Claude, ChatGPT, Cursor, Copilot, Cline)
4. **Open source MCP server** (trust + community contributions)
5. **Zero-install remote option** (Cloudflare Workers, just paste a URL)

---

## Estimated Total Impact

| Metric | Conservative | Optimistic |
|--------|-------------|------------|
| Total platforms listed | 15-20 | 25+ |
| Monthly developer impressions | 10K-50K | 100K+ |
| Monthly installs/trials | 100-500 | 1,000+ |
| Time to full Tier 1+2 | 4 weeks | 3 weeks |
| Total cost | $0 | $0 |

---

## Sources

### MCP Registries & Directories
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)
- [MCP Registry Blog Post](http://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/)
- [Smithery.ai](https://smithery.ai/)
- [Smithery Publish Page](https://smithery.ai/new)
- [Glama.ai MCP Directory](https://glama.ai/mcp/servers)
- [PulseMCP Directory](https://www.pulsemcp.com/servers)
- [mcp.so](https://mcp.so/)
- [MCPMarket](https://mcpmarket.com/)
- [LobeHub MCP Marketplace](https://lobehub.com/mcp)
- [awesome-mcp-servers (punkpeye)](https://github.com/punkpeye/awesome-mcp-servers)
- [awesome-mcp-servers (wong2)](https://github.com/wong2/awesome-mcp-servers)
- [awesome-mcp-servers (appcypher)](https://github.com/appcypher/awesome-mcp-servers)
- [awesome-remote-mcp-servers](https://github.com/jaw9c/awesome-remote-mcp-servers)

### AI IDE/Tool Integration
- [Cursor MCP Setup](https://cursor.directory/mcp)
- [MCPCursor](https://mcpcursor.com/)
- [Windsurf MCP](https://windsurf.com/)
- [GitHub Copilot MCP](https://docs.github.com/en/copilot/concepts/context/mcp)
- [Cline MCP Marketplace](https://cline.bot/)
- [OpenAI Codex CLI MCP](https://developers.openai.com/codex/mcp/)

### Vercel AI SDK
- [AI SDK](https://ai-sdk.dev/)
- [AI SDK Tools Registry](https://ai-tools-registry.vercel.app/)
- [AI SDK Agents Tools](https://ai-sdk-agents.vercel.app/)
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6)

### Automation Platforms
- [Zapier Developer Platform](https://zapier.com/developer-platform)
- [Zapier Public Integration Guide](https://docs.zapier.com/platform/publish/public-integration)
- [Make Custom Apps](https://www.make.com/en/webinars/webinar-discover-integromat-custom-apps)
- [n8n Community Nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)
- [n8n Node Builder](https://docs.n8n.io/integrations/creating-nodes/build/n8n-node/)
- [Pipedream App Partners](https://pipedream.com/docs/apps/app-partners)
- [Activepieces GitHub](https://github.com/activepieces/activepieces)

### Docker & Packaging
- [Docker MCP Catalog](https://hub.docker.com/mcp)
- [Docker MCP Registry (Submit PR)](https://github.com/docker/mcp-registry)
- [Docker MCP Best Practices](https://www.docker.com/blog/mcp-server-best-practices/)
- [Homebrew Tap Guide](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
- [MCP Publisher Homebrew Formula](https://formulae.brew.sh/formula/mcp-publisher)

### Claude Skills Ecosystem
- [Anthropic Skills Repo](https://github.com/anthropics/skills)
- [Claude Skills Documentation](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [Claude Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [SkillsMP](https://skillsmp.com/)
- [SkillHub](https://www.skillhub.club)
- [awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)

### Remote MCP Hosting
- [Cloudflare Remote MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [MCPHosting.io](https://www.mcphosting.io/)
- [Google Cloud Run MCP](https://docs.google.com/run/docs/host-mcp-servers)

### Product Hunt & Marketing
- [Product Hunt Launch Guide 2026](https://hackmamba.io/developer-marketing/how-to-launch-on-product-hunt/)
- [RapidAPI Hub](https://rapidapi.com/)

### Competitive Intelligence
- [Holded MCP Server (third-party)](https://github.com/p3rs0n3/holded-mcp-server)
- [Holded Zapier MCP](https://zapier.com/mcp/holded)
- [Quipu API](https://quipuapp.github.io/api-v1-docs/)
