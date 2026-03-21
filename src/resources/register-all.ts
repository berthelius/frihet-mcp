/**
 * Static MCP Resources for the Frihet ERP server.
 *
 * Resources are read-only reference data that LLMs can access without making
 * API calls. They encode domain knowledge (tax rates, deadlines, categories)
 * that would otherwise require the user to explain every time.
 *
 * All resources use the `frihet://` URI scheme.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IFrihetClient } from "../client-interface.js";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const API_SCHEMA_SUMMARY = `Frihet ERP REST API — OpenAPI 3.1
Base URL: https://api.frihet.io/v1
Docs: https://docs.frihet.io/desarrolladores/api-reference

Authentication:
  Header: X-API-Key
  Format: fri_<key>

Rate limits:
  100 requests/minute per API key
  Burst: 10 requests/second
  Response header: Retry-After (seconds) on 429

Endpoints:
  GET    /invoices          — List invoices (paginated)
  GET    /invoices/:id      — Get invoice by ID
  POST   /invoices          — Create invoice
  PATCH  /invoices/:id      — Update invoice
  DELETE /invoices/:id      — Delete invoice

  GET    /expenses          — List expenses (paginated)
  GET    /expenses/:id      — Get expense by ID
  POST   /expenses          — Create expense
  PATCH  /expenses/:id      — Update expense
  DELETE /expenses/:id      — Delete expense

  GET    /clients           — List clients (paginated)
  GET    /clients/:id       — Get client by ID
  POST   /clients          — Create client
  PATCH  /clients/:id       — Update client
  DELETE /clients/:id       — Delete client

  GET    /products          — List products (paginated)
  GET    /products/:id      — Get product by ID
  POST   /products          — Create product
  PATCH  /products/:id      — Update product
  DELETE /products/:id      — Delete product

  GET    /quotes            — List quotes (paginated)
  GET    /quotes/:id        — Get quote by ID
  POST   /quotes            — Create quote
  PATCH  /quotes/:id        — Update quote
  DELETE /quotes/:id        — Delete quote

  GET    /webhooks          — List webhooks (paginated)
  GET    /webhooks/:id      — Get webhook by ID
  POST   /webhooks          — Create webhook
  PATCH  /webhooks/:id      — Update webhook
  DELETE /webhooks/:id      — Delete webhook

Pagination:
  Query params: limit (1-100, default 50), offset (default 0)
  Response: { data: [...], total: number, limit: number, offset: number }

Error responses:
  400 — Bad request (validation error)
  401 — Invalid or missing API key
  403 — Insufficient permissions
  404 — Resource not found
  429 — Rate limit exceeded
  500 — Internal server error

Content-Type: application/json
All monetary values in EUR (cents not used — decimal euros).
Dates in ISO 8601 format (YYYY-MM-DD or full datetime).`;

const TAX_RATES = `Spanish Tax Rates by Fiscal Zone
================================

PENINSULA & BALEARIC ISLANDS — IVA (Impuesto sobre el Valor Añadido)
  General:    21%  — Most goods and services
  Reduced:    10%  — Food, transport, hospitality, renovation
  Super-reduced: 4%  — Bread, milk, eggs, fruit, vegetables, books, medicines, wheelchairs
  Exempt:      0%  — Education, healthcare, financial services, insurance, postal

CANARY ISLANDS — IGIC (Impuesto General Indirecto Canario)
  General:     7%  — Most goods and services
  Reduced:     3%  — Food, water, transport, hospitality
  Zero:        0%  — Basic food (bread, milk, eggs, fruit, vegetables), books, medicines
  Increased:   9.5% — Vehicles, jewelry, electronics >€1,000
  Special:    15%  — Tobacco
  Exempt:      0%  — Education, healthcare, financial services

CEUTA & MELILLA — IPSI (Impuesto sobre la Producción, los Servicios y la Importación)
  General:    10%  — Most goods and services
  Reduced:     2%  — Basic food, water
  Intermediate: 5%  — Other food, hospitality
  Increased:   8%  — Vehicles, electronics
  Special:    10%  — Tobacco, alcohol

EU INTRA-COMMUNITY — Reverse Charge
  B2B:         0%  — Buyer self-assesses VAT in their country (reverse charge / inversión del sujeto pasivo)
  B2C:       Destination country rate — Via OSS (One-Stop Shop) if >€10,000/year

INTERNATIONAL (outside EU)
  Exports:     0%  — Exempt with right to deduction (exención plena)
  Imports:   Destination country duties + VAT at border

WITHHOLDING TAX — IRPF (professionals / autónomos)
  Standard:   15%  — Retention on professional invoices
  New freelancer: 7%  — First 3 full calendar years of activity
  Applies to: Professional services invoiced to other businesses (B2B)

SPECIAL REGIMES
  Equivalence surcharge (recargo de equivalencia): +5.2% / +1.4% / +0.5% on IVA rates
    Applies to: Retail businesses (comercio minorista) buying from wholesalers
  Simplified regime: Fixed quarterly quotas based on activity modules
  Agriculture: 12% / 10.5% flat-rate compensation`;

const TAX_CALENDAR = `Spanish Quarterly Tax Calendar
===============================

All deadlines apply to the corresponding fiscal quarter unless noted.

Q1 (January–March) — File by April 20
  Modelo 303  — IVA quarterly return (autoliquidación trimestral IVA)
  Modelo 130  — IRPF quarterly advance payment (pago fraccionado IRPF)
  Modelo 349  — Intra-community operations summary (if applicable)
  Modelo 115  — Withholding on rental payments (if applicable)

Q2 (April–June) — File by July 20
  Modelo 303  — IVA quarterly return
  Modelo 130  — IRPF quarterly advance payment
  Modelo 349  — Intra-community operations (if applicable)
  Modelo 115  — Rental withholdings (if applicable)

Q3 (July–September) — File by October 20
  Modelo 303  — IVA quarterly return
  Modelo 130  — IRPF quarterly advance payment
  Modelo 349  — Intra-community operations (if applicable)
  Modelo 115  — Rental withholdings (if applicable)

Q4 (October–December) — File by January 30 (next year)
  Modelo 303  — IVA quarterly return
  Modelo 130  — IRPF quarterly advance payment
  Modelo 349  — Intra-community operations (if applicable)
  Modelo 115  — Rental withholdings (if applicable)

ANNUAL RETURNS — File by January 30
  Modelo 390  — Annual IVA summary (resumen anual IVA)
  Modelo 180  — Annual rental withholdings summary
  Modelo 190  — Annual professional withholdings summary (IRPF retenciones)

ANNUAL INCOME TAX — File April 1 – June 30
  Modelo 100  — Personal income tax return (Renta / IRPF)

CANARY ISLANDS (IGIC instead of IVA)
  Modelo 420  — IGIC quarterly return (same deadlines as Modelo 303)
  Modelo 425  — Annual IGIC summary (same deadline as Modelo 390)
  Filed with ATC (Administración Tributaria Canaria), NOT AEAT

VERIFACTU (mandatory e-invoicing, phased rollout)
  2026: Voluntary adoption
  2027: Mandatory for large companies
  2028: Mandatory for all businesses

KEY DATES SUMMARY
  Apr 20 — Q1 filings
  Jul 20 — Q2 filings
  Oct 20 — Q3 filings
  Jan 30 — Q4 filings + annual summaries (390, 180, 190)
  Apr 1–Jun 30 — Annual income tax (Modelo 100)`;

const EXPENSE_CATEGORIES = `Frihet Expense Categories & Deductibility Rules
=================================================

1. OFFICE (oficina)
   Examples: Rent, utilities, internet, phone, office supplies, cleaning
   Deductibility: 100% if exclusively for business use
   Mixed use: Proportional deduction (e.g., home office = % of m²)
   IVA deductible: Yes (with invoice)

2. TRAVEL (viajes)
   Examples: Flights, trains, taxis, hotel, car rental, fuel, tolls, parking
   Deductibility: 100% if business-related
   Meals during travel: Max €26.67/day (Spain), €48.08/day (abroad)
   IVA deductible: Yes (except parking meters, some tolls)

3. SOFTWARE (software)
   Examples: SaaS subscriptions, licenses, hosting, domains, cloud services
   Deductibility: 100% as operating expense
   IVA deductible: Yes (EU reverse charge for non-Spanish providers)
   Note: If >€300/unit, may need to amortize over 3 years

4. MARKETING (marketing)
   Examples: Advertising, social media ads, design, print materials, events, sponsorship
   Deductibility: 100% as operating expense
   IVA deductible: Yes
   Note: Gifts to clients deductible up to 1% of net revenue

5. PROFESSIONAL (servicios profesionales)
   Examples: Legal fees, accounting, consulting, freelancers, subcontractors
   Deductibility: 100%
   IRPF withholding: Provider should apply 15% (or 7% if new freelancer)
   IVA deductible: Yes

6. EQUIPMENT (equipamiento)
   Examples: Computers, monitors, furniture, phones, machinery
   Deductibility: Amortization (not instant deduction if >€300)
   Amortization: Computers 25%/yr (4yr), furniture 10%/yr (10yr), vehicles 16%/yr
   IVA deductible: Yes (vehicles: 50% unless exclusively business)
   Freelancer benefit: Items <€300 can be fully expensed in the year

7. INSURANCE (seguros)
   Examples: Professional liability, health (autónomo), property, cyber, D&O
   Deductibility: 100% if business-related
   Health insurance: Deductible up to €500/person/year for autónomos + family
   IVA: Insurance is IVA-exempt (no input IVA to deduct)

8. OTHER (otros)
   Examples: Bank fees, taxes (non-income), fines, donations, miscellaneous
   Deductibility: Varies
   NOT deductible: Fines, penalties, personal expenses, income tax itself
   Bank fees: 100% deductible
   Donations: Deduction in IRPF (not expense), 80% of first €250 + 40% rest`;

const INVOICE_STATUSES = `Frihet Invoice Status Flow
===========================

Statuses and transitions:

  DRAFT ──────► SENT ──────► PAID
    │             │
    │             └──────► OVERDUE ────► PAID
    │                         │
    │                         └────────► CANCELLED
    │
    └─────────────────────────────────► CANCELLED

Status definitions:

  draft     — Invoice created but not yet sent to client.
              Can be freely edited. No fiscal implications yet.
              This is the default status for new invoices.

  sent      — Invoice delivered to the client (email, PDF, etc.).
              Payment is expected. The invoice number and date become
              fiscally relevant — avoid modifications after this point.

  paid      — Payment received in full. Terminal state.
              Records the payment date. Invoice is complete.

  overdue   — Payment deadline (dueDate) has passed without payment.
              Triggers follow-up workflows. Can transition to paid
              (late payment) or cancelled (write-off / bad debt).

  cancelled — Invoice voided. Requires a corrective invoice or
              credit note for fiscal compliance if previously sent.
              Terminal state. Cannot transition to other statuses.

Automation rules (when configured):
  - Auto-transition sent → overdue when dueDate passes (daily check)
  - Webhook events: invoice.created, invoice.sent, invoice.paid,
    invoice.overdue, invoice.cancelled
  - Overdue reminders can be configured per-client

Best practices:
  - Always set a dueDate when creating invoices (default: 30 days)
  - Use draft status while iterating with the client
  - Once sent, create a new corrective invoice rather than editing
  - For partial payments, keep status as sent until full payment
  - cancelled requires a reason (notes field) for audit trail`;

/* ------------------------------------------------------------------ */
/*  Registration                                                       */
/* ------------------------------------------------------------------ */

export function registerAllResources(server: McpServer, client?: IFrihetClient): void {
  server.registerResource(
    "api-schema",
    "frihet://api/schema",
    {
      description:
        "OpenAPI schema summary: all endpoints, authentication method, rate limits, pagination, and error codes. " +
        "/ Resumen del esquema OpenAPI: endpoints, autenticación, límites, paginación y errores.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "frihet://api/schema",
          mimeType: "text/plain",
          text: API_SCHEMA_SUMMARY,
        },
      ],
    }),
  );

  server.registerResource(
    "tax-rates",
    "frihet://tax/rates",
    {
      description:
        "Current tax rates by Spanish fiscal zone: Peninsula IVA (21/10/4%), Canary Islands IGIC (7/3/0%), " +
        "Ceuta IPSI, EU reverse charge, international exports, IRPF withholding, and special regimes. " +
        "/ Tipos impositivos por zona fiscal: IVA, IGIC, IPSI, intracomunitario, exportaciones, IRPF, regímenes especiales.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "frihet://tax/rates",
          mimeType: "text/plain",
          text: TAX_RATES,
        },
      ],
    }),
  );

  server.registerResource(
    "tax-calendar",
    "frihet://tax/calendar",
    {
      description:
        "Spanish quarterly tax calendar with filing deadlines for Modelo 303, 130, 390, 420 (IGIC), and annual returns. " +
        "Includes VeriFactu e-invoicing timeline. " +
        "/ Calendario fiscal trimestral español con plazos de presentación de modelos y VeriFactu.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "frihet://tax/calendar",
          mimeType: "text/plain",
          text: TAX_CALENDAR,
        },
      ],
    }),
  );

  server.registerResource(
    "expense-categories",
    "frihet://config/expense-categories",
    {
      description:
        "The 8 expense categories in Frihet with deductibility rules, IVA treatment, and amortization periods. " +
        "Essential for correctly categorizing business expenses. " +
        "/ Las 8 categorías de gastos con reglas de deducibilidad, IVA y amortización.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "frihet://config/expense-categories",
          mimeType: "text/plain",
          text: EXPENSE_CATEGORIES,
        },
      ],
    }),
  );

  server.registerResource(
    "invoice-statuses",
    "frihet://config/invoice-statuses",
    {
      description:
        "Invoice status flow in Frihet: draft → sent → paid/overdue → cancelled. " +
        "Includes transition rules, automation triggers, webhook events, and fiscal compliance notes. " +
        "/ Flujo de estados de factura: borrador → enviada → pagada/vencida → cancelada.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "frihet://config/invoice-statuses",
          mimeType: "text/plain",
          text: INVOICE_STATUSES,
        },
      ],
    }),
  );

  /* ---------------------------------------------------------------- */
  /*  Dynamic resources (require API client)                           */
  /* ---------------------------------------------------------------- */

  if (client) {
    server.registerResource(
      "business-profile",
      "frihet://business-profile",
      {
        description:
          "Live business profile and context — company info, plan limits, recent activity, top clients, " +
          "current month snapshot. Equivalent to calling get_business_context but as a resource. " +
          "/ Perfil y contexto del negocio en vivo — info de empresa, limites, actividad reciente, clientes principales.",
        mimeType: "application/json",
      },
      async () => {
        const data = await client.getBusinessContext();
        return {
          contents: [
            {
              uri: "frihet://business-profile",
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );

    server.registerResource(
      "monthly-snapshot",
      "frihet://monthly-snapshot",
      {
        description:
          "Live financial snapshot for the current month — revenue, expenses, profit, tax liability, " +
          "invoice counts by status, expense breakdown by category. Updates on every read. " +
          "/ Resumen financiero del mes actual en vivo — ingresos, gastos, beneficio, impuestos.",
        mimeType: "application/json",
      },
      async () => {
        const data = await client.getMonthlySummary();
        return {
          contents: [
            {
              uri: "frihet://monthly-snapshot",
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );

    server.registerResource(
      "overdue-invoices",
      "frihet://overdue-invoices",
      {
        description:
          "Live list of all overdue invoices — invoices past their due date that haven't been paid. " +
          "Includes client names, amounts, due dates, and days overdue. Critical for cash flow management. " +
          "/ Lista en vivo de facturas vencidas — facturas cuya fecha de vencimiento ha pasado sin cobrar.",
        mimeType: "application/json",
      },
      async () => {
        const data = await client.listInvoices({ status: "overdue", limit: 100 });
        return {
          contents: [
            {
              uri: "frihet://overdue-invoices",
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );
  }
}
