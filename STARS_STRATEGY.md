# GitHub Stars Strategy — Frihet MCP Server

**Date:** 2026-03-18
**Problem:** 578 npm downloads/week, 0 GitHub stars. People install via `npx` and never visit the repo.

---

## 1. Quick Wins (This Week)

### 1.1 README: Add star CTA in badge row

Insert a GitHub stars badge + explicit CTA right after the existing badges. The badge row is the first thing visitors see.

```html
<a href="https://github.com/Frihet-io/frihet-mcp"><img src="https://img.shields.io/github/stars/Frihet-io/frihet-mcp?style=flat&color=18181b&labelColor=09090b" alt="GitHub stars"></a>
```

Add below the badge row, before the `---`:

```html
<p align="center">
  <sub>If this is useful, <a href="https://github.com/Frihet-io/frihet-mcp">star the repo</a> -- it helps others find it.</sub>
</p>
```

This works because showing "0 stars" creates a "be the first" effect with early adopters.

### 1.2 npm postinstall message

Add a `postinstall` script to `package.json`. Every `npx -y @frihet/mcp-server` or `npm install` prints this:

```json
"scripts": {
  "postinstall": "echo '\\n  Frihet MCP Server installed. 31 tools ready.\\n  Like it? Star us: https://github.com/Frihet-io/frihet-mcp\\n'"
}
```

This is the highest-leverage change. Every one of those 578 weekly installs will see the repo URL. Most npm users never visit the GitHub page otherwise.

**Risk:** Some people find postinstall messages annoying. Keep it to 2 lines, no ASCII art, no color. Information + ask.

### 1.3 Server startup stderr message

In `src/index.ts`, line 87 currently logs `"Frihet MCP server running on stdio"`. Change to:

```typescript
console.error("Frihet MCP server running on stdio (v1.2.4, 31 tools)");
console.error("Star us: https://github.com/Frihet-io/frihet-mcp");
```

This shows in the MCP client's logs (Claude Desktop, Cursor debug console). Not intrusive since it's stderr, not stdout.

### 1.4 Tool response metadata

In every tool's structured output, add a top-level `_meta` field (or use the existing envelope):

```json
{ "data": {...}, "_meta": { "server": "frihet-mcp", "repo": "https://github.com/Frihet-io/frihet-mcp" } }
```

AI assistants sometimes surface this to users. Low effort, zero downside.

### 1.5 Dev.to article + Show HN edit

Add a line at the bottom of the live Dev.to article: "If you found this useful, star the repo on GitHub." Same for the Show HN post text.

---

## 2. Community Tactics (This Month)

### 2.1 Where to post (specific targets)

| Platform | Where exactly | Angle |
|----------|--------------|-------|
| **Reddit** | r/ClaudeAI (125K), r/cursor (50K+), r/LocalLLaMA (450K) | "I built an MCP server that lets Claude manage your entire ERP" + demo GIF |
| **Reddit** | r/SideProject, r/selfhosted | "Open source MCP server for business management" |
| **Reddit** | r/spain or r/SpainEconomics | "First Spanish ERP with AI integration (VeriFactu/SII)" |
| **Hacker News** | Show HN (was planned Mar 17 -- post it) | "Show HN: Frihet MCP -- manage invoices from your AI assistant (31 tools)" |
| **Discord** | Claude Discord, Cursor Discord, MCP Discord (`#showcase`) | Short demo + link |
| **Twitter/X** | Tag @AnthropicAI, @cursor_ai, @anthropicclaude | Thread: "578 people use my MCP server but 0 stars, here's what I learned" (meta-angle gets engagement) |
| **LinkedIn** | Your 6,503 followers | Developer story angle, not product pitch |

**Key rule:** Every post must include the GitHub link `https://github.com/Frihet-io/frihet-mcp`, not the npm link. People star what they click.

### 2.2 Leverage directory listings

11 directories list frihet-mcp. Most link to the npm page or the directory's own detail page -- NOT to GitHub.

**Action:** For every directory where you can edit the listing (Smithery, Glama, PulseMCP, mcp.so, LobeHub, MCPMarket), ensure the primary link is the GitHub repo URL, not npm. Smithery and Glama dashboards allow this.

For the 11 pending PRs: make sure the PR description includes the GitHub repo URL prominently.

### 2.3 Cross-promotion from owned properties

| Property | Action |
|----------|--------|
| **docs.frihet.io/desarrolladores/mcp-server** | Add GitHub star badge + "Star on GitHub" button at the top |
| **docs.frihet.io/desarrolladores/resumen** | Same |
| **frihet.io** (developer/integration pages) | GitHub link in any MCP mention |
| **Frihet ERP Settings > API page** | When user creates an API key, show: "Using our MCP server? Star it on GitHub" |
| **Onboarding email #3** (developer-focused) | Mention the MCP repo with GitHub link |
| **Product Hunt page** | Edit the description to include GitHub link prominently |

---

## 3. README Optimization for Stars

### What makes people star repos (research-backed)

1. **Clear value in <5 seconds** -- current README is good here
2. **Social proof** -- star count badge (add it, even at 0)
3. **Demo/screenshot** -- a GIF of Claude creating an invoice via MCP is worth 1000 words
4. **Copy-paste install** -- already good (`npx` one-liner)
5. **Active maintenance signals** -- last commit date, version badge, changelog link

### Specific improvements

**Add a demo GIF.** Record a 15-second screen capture of:
1. User types "Create an invoice for 40h consulting at 75 EUR/h" in Claude
2. Claude responds with structured invoice data
3. Invoice appears in Frihet dashboard

Place it right after "What is this", before the code block. Use `<details>` for the text version:

```markdown
<p align="center">
  <img src="./assets/demo.gif" alt="Demo: creating an invoice with Claude" width="720"/>
</p>
```

**Add a "Why star this?" section** (optional, subtle). Some repos add a small section:

```markdown
## Support
If Frihet MCP saves you time, [star the repo](https://github.com/Frihet-io/frihet-mcp) -- it helps others discover it.
```

Place it before the Links section, after Contributing.

**Add "Used by" or "Listed on" badges** once you have a few known users or notable directory features. Social proof compounds.

---

## 4. Tracking

### Tools

| Tool | URL | What it shows |
|------|-----|--------------|
| **Star History** | `star-history.com/#Frihet-io/frihet-mcp` | Graph over time, embed in README later |
| **GitHub Traffic** | Repo > Insights > Traffic | Unique visitors, clones, referring sites (shows which channel drives visits) |
| **npm stats** | `npm-stat.com/charts.html?package=@frihet/mcp-server` | Download trends, correlate with star campaigns |
| **Umami** | Custom events on docs.frihet.io | Track clicks on "Star on GitHub" links |

### Metrics to watch

| Metric | Baseline (18 Mar) | Target (18 Apr) |
|--------|-------------------|-----------------|
| GitHub stars | 0 | 25-50 |
| GitHub unique visitors/week | ? (check Insights) | 200+ |
| npm downloads/week | 578 | 800+ |
| Top referring site | (unknown) | reddit.com or news.ycombinator.com |

### Weekly review

Every Monday, check:
1. GitHub Insights > Traffic (which referring sites drive visits vs. stars)
2. npm download trend (are installs converting to repo visits?)
3. Which Reddit/HN posts are still getting upvotes

Adjust channel focus based on what converts. If Reddit r/ClaudeAI drives 50 visits and 10 stars but HN drives 500 visits and 5 stars, double down on Reddit.

---

## Priority Order

1. **Today:** postinstall message + star badge in README + stderr line (30 min, publish v1.2.5)
2. **Today:** Post Show HN if not done yet
3. **Tomorrow:** Record demo GIF, add to README
4. **This week:** Reddit posts (r/ClaudeAI, r/cursor, r/SideProject)
5. **This week:** Update all directory listings to point to GitHub
6. **This week:** Add star CTA to docs.frihet.io MCP pages
7. **Next week:** "578 downloads, 0 stars" Twitter thread (meta-angle)
8. **Ongoing:** Every new blog post, changelog entry, or directory listing includes GitHub link
