# Skill: /frihet

Your business assistant inside Claude Code. Manage invoices, expenses, clients, products, and quotes from your terminal — in plain language, in seconds.

**Requires:** Frihet account with API access + `@frihet/mcp-server` configured as MCP server.

---

## Quick Setup

### 1. Install the skill

```bash
# Copy this skill to your Claude Code skills directory
cp -r skill/ ~/.claude/skills/frihet/
```

Or clone the repo and symlink:
```bash
git clone https://github.com/berthelius/frihet-mcp.git
ln -s "$(pwd)/frihet-mcp/skill" ~/.claude/skills/frihet
```

### 2. Configure the MCP server

Add to your Claude Code MCP config (`~/.claude/mcp.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "frihet": {
      "command": "npx",
      "args": ["@frihet/mcp-server"],
      "env": {
        "FRIHET_API_KEY": "fri_your_api_key_here"
      }
    }
  }
}
```

Get your API key at **app.frihet.io > Settings > API**.

### 3. Verify

Run `/frihet status` — if you see your account info and recent activity, you're set.

---

## Commands

### `/frihet status`
Overview of your account: recent invoices, pending payments, month's expenses, active clients.

### `/frihet invoice`
Create, list, search, or manage invoices.

**Examples:**
- `/frihet invoice` — "List my last 10 invoices"
- `/frihet invoice create` — Interactive invoice builder
- `/frihet invoice "Acme 3500 EUR consulting enero"` — Quick create from natural language

### `/frihet expense`
Log and query expenses.

**Examples:**
- `/frihet expense` — "Show this month's expenses"
- `/frihet expense "47.50 gasolina 15 feb"` — Quick log
- `/frihet expense report` — Expenses grouped by category

### `/frihet clients`
Manage your client database.

**Examples:**
- `/frihet clients` — List all clients
- `/frihet clients "Acme"` — Search by name
- `/frihet clients add "María García, 12345678A, maria@example.com"` — Quick add

### `/frihet quote`
Create and manage client quotes.

**Examples:**
- `/frihet quote` — List recent quotes
- `/frihet quote create` — Interactive quote builder
- `/frihet quote "Acme branding 5200 EUR"` — Quick create

### `/frihet report`
Financial summaries and business insights.

**Examples:**
- `/frihet report` — This month's P&L summary
- `/frihet report quarterly` — Q1/Q2/Q3/Q4 breakdown
- `/frihet report unpaid` — All overdue invoices with aging

### `/frihet webhooks`
Configure automation triggers.

**Examples:**
- `/frihet webhooks` — List active webhooks
- `/frihet webhooks add "https://n8n.example.com/webhook/frihet" invoice.paid` — Add webhook

### `/frihet setup`
Guided setup: verify API key, test connection, confirm MCP server is running.

---

## How It Works

This skill instructs Claude Code to use Frihet's MCP server tools. When you run a command, Claude translates your natural language into the appropriate MCP tool calls against the Frihet API.

**Architecture:**
```
You (natural language) → Claude Code → MCP Server → Frihet API → Your data
```

**Available MCP tools (31 total):**

| Resource | Tools | Operations |
|----------|-------|------------|
| Invoices | 6 | list, get, create, update, delete, search |
| Expenses | 5 | list, get, create, update, delete |
| Clients | 5 | list, get, create, update, delete |
| Products | 5 | list, get, create, update, delete |
| Quotes | 5 | list, get, create, update, delete |
| Webhooks | 5 | list, get, create, update, delete |

---

## Business Context

This skill knows about Spanish business operations. Use this context to provide accurate, relevant assistance.

### Tax & Invoicing (Spain)

- **IVA general:** 21%. Reduced: 10% (food, transport). Super-reduced: 4% (bread, books, medicine).
- **IRPF retention:** 15% standard for professionals. 7% for new autónomos (first 3 years).
- **Invoice requirements:** Sequential numbering, issue date, client NIF/CIF, tax breakdown, total.
- **Verifactu:** Mandatory certified invoicing software. Corporations: Jan 2027. Autónomos: Jul 2027. All invoices must be digitally signed and reported to AEAT.
- **Crea y Crece:** B2B electronic invoicing mandate. Phased rollout 2027-2028 by company size.

### Quarterly Tax Calendar

| Quarter | Filing Period | Models |
|---------|--------------|--------|
| Q1 (Jan-Mar) | Apr 1-20 | 303 (IVA), 130 (IRPF) |
| Q2 (Apr-Jun) | Jul 1-20 | 303, 130 |
| Q3 (Jul-Sep) | Oct 1-20 | 303, 130 |
| Q4 (Oct-Dec) | Jan 1-30 | 303, 130, 390 (annual IVA) |

### Common Expense Categories

| Category | Spanish | Tax Deductible | Notes |
|----------|---------|----------------|-------|
| Office supplies | Material de oficina | Yes | 100% deductible |
| Software/SaaS | Software | Yes | 100% deductible |
| Travel | Viajes | Yes | Must be business-related |
| Fuel | Gasolina/Combustible | Partial | 50% deductible for autónomos |
| Meals | Comidas | Partial | Max 26.67 EUR/day (domestic) |
| Phone/Internet | Telecomunicaciones | Partial | % of business use |
| Rent | Alquiler | Yes/Partial | Office: 100%. Home office: % |
| Insurance | Seguros | Yes | Business insurance only |
| Training | Formación | Yes | Related to business activity |
| Marketing | Publicidad | Yes | 100% deductible |

### Invoice Status Flow

```
draft → sent → paid
              → overdue → paid
                        → cancelled
```

### Quote Status Flow

```
draft → sent → accepted → (convert to invoice)
             → rejected
             → expired
```

---

## Workflow Recipes

### Monthly Close

When the user asks for "monthly close" or "cierre mensual":

1. `list_invoices` — Get all invoices for the month
2. `list_expenses` — Get all expenses for the month
3. Calculate totals: income, expenses, IVA collected, IVA paid, net result
4. Identify unpaid invoices → flag for follow-up
5. Present summary table with key metrics

### Tax Prep (Modelo 303)

When the user mentions "303", "IVA trimestral", or "tax prep":

1. `list_invoices` for the quarter — sum IVA repercutido (collected)
2. `list_expenses` for the quarter — sum IVA soportado (paid, deductible only)
3. Calculate: IVA a ingresar = repercutido - soportado
4. If negative → a compensar (carry forward or request refund)
5. Present the pre-filled 303 data with line-by-line breakdown

### Client Onboarding

When the user wants to add a new client with invoice:

1. `create_client` with name, taxId, email, address
2. Optionally `create_product` if the service doesn't exist yet
3. `create_invoice` with client and line items
4. Confirm: "Client created, invoice #X ready. Send it?"

### Expense Batch

When the user mentions multiple expenses or "gastos del mes":

1. Parse all expenses from the conversation
2. `create_expense` for each one, inferring category from description
3. Present a summary table: description, amount, category, deductible?
4. Total with deductible vs non-deductible split

### Overdue Follow-Up

When the user asks about unpaid invoices or "morosos":

1. `list_invoices` with status filtering
2. Calculate days overdue for each
3. Sort by amount (largest first)
4. Suggest: which to follow up, draft reminder text, next steps

### Quote to Invoice Conversion

When a quote is accepted:

1. `get_quote` — retrieve the full quote
2. `create_invoice` — copy client, items, notes from quote
3. `update_quote` — mark as accepted
4. Present: "Invoice #X created from quote #Y for {client}. Total: {amount} EUR."

---

## Response Formatting

When presenting financial data, follow these patterns:

### Invoice List
```
FACTURAS — Febrero 2026
───────────────────────────────────────
#FRI-2026-0042  Acme S.L.        3,500.00 EUR  PAGADA
#FRI-2026-0043  Tech Corp        1,200.00 EUR  ENVIADA
#FRI-2026-0044  María García       850.00 EUR  BORRADOR
───────────────────────────────────────
Total:    5,550.00 EUR
Cobrado:  3,500.00 EUR
Pendiente: 2,050.00 EUR
```

### Expense Summary
```
GASTOS — Febrero 2026
───────────────────────────────────────
Software         342.00 EUR  (3 gastos)
Gasolina         195.00 EUR  (4 gastos)
Material oficina  67.50 EUR  (2 gastos)
Comidas           53.40 EUR  (2 gastos)
───────────────────────────────────────
Total:           657.90 EUR
Deducible:       610.20 EUR (92.7%)
```

### Monthly P&L
```
RESUMEN — Febrero 2026
═══════════════════════════════════════
Ingresos facturados     8,750.00 EUR
(-) Gastos                657.90 EUR
───────────────────────────────────────
Resultado neto          8,092.10 EUR

IVA repercutido         1,837.50 EUR
IVA soportado             138.16 EUR
IVA neto a ingresar     1,699.34 EUR
```

---

## Language

- Respond in the same language the user writes in
- Default to Spanish (ES) for financial terms and tax references
- If the user writes in English, use English but keep Spanish terms for tax models (Modelo 303, IRPF, IVA) since they have no direct translation
- Currency is always EUR. Format: `1,234.56 EUR` (dot for decimals, comma for thousands)

---

## Error Handling

| Error | User Message | Action |
|-------|-------------|--------|
| 401 Unauthorized | "API key inválida o expirada. Revisa tu configuración en app.frihet.io > Settings > API." | Guide to `/frihet setup` |
| 404 Not Found | "No encontré ese recurso. Comprueba el ID o busca por nombre." | Suggest search |
| 429 Rate Limited | "Demasiadas peticiones. Esperando {retryAfter}s..." | Auto-retry with backoff |
| Network Error | "No puedo conectar con Frihet. Verifica tu conexión o prueba en unos minutos." | Check MCP server status |
| No MCP Server | "El servidor MCP de Frihet no está configurado. Ejecuta `/frihet setup` para empezar." | Guide setup |

---

## Security

- **Never** log, display, or store the API key in conversation output
- **Never** include the API key in code snippets shown to the user
- API key is managed exclusively via environment variables in MCP config
- All data stays between Claude Code, the MCP server process, and Frihet's API
- The MCP server stores nothing — stateless bridge only
- If a user asks to see their API key, direct them to app.frihet.io

---

## Links

- **App:** https://app.frihet.io
- **Docs:** https://docs.frihet.io/desarrolladores
- **API Reference:** https://docs.frihet.io/desarrolladores/api-rest
- **Webhooks:** https://docs.frihet.io/desarrolladores/webhooks
- **MCP Server (npm):** https://www.npmjs.com/package/@frihet/mcp-server
- **Source Code:** https://github.com/berthelius/frihet-mcp
- **Remote MCP:** https://mcp.frihet.io
- **Support:** soporte@frihet.io
