/**
 * E-Invoicing tools for the Frihet MCP server.
 *
 * Scaffold stubs for transport Wave — real CF wiring via api.frihet.io will land
 * when Cloud Function endpoints are deployed. All 4 tools use the shared
 * withToolLogging wrapper (Langfuse tracing applied globally via patchServerWithTracing
 * in register-all.ts — no per-tool instrumentation needed).
 *
 * Trace names prefix: mcp.einvoice.*
 * CF endpoint target (not yet wired): https://api.frihet.io/v1/einvoice/
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { IFrihetClient } from "../client-interface.js";
import {
  withToolLogging,
  mutateContent,
  getContent,
  READ_ONLY_ANNOTATIONS,
  CREATE_ANNOTATIONS,
} from "./shared.js";

/* ------------------------------------------------------------------ */
/*  Shared format union                                                 */
/* ------------------------------------------------------------------ */

/**
 * All supported e-invoice formats.
 *
 * | Format                  | Standard  | Markets                  | Notes                                              |
 * |-------------------------|-----------|--------------------------|---------------------------------------------------|
 * | xrechnung-cii           | EN16931   | Germany (DE mandatory)   | CII syntax, official DE B2G format                |
 * | xrechnung-ubl           | EN16931   | Germany (DE mandatory)   | UBL 2.1 syntax, alternative DE B2G                |
 * | facturx-en16931         | EN16931   | France, EU               | PDF/A-3 embedded XML, Factur-X EN16931 profile     |
 * | facturx-extended        | EN16931+  | France, EU               | Factur-X Extended — extra logistics/trade fields   |
 * | facturx-basic           | EN16931   | France, EU               | Factur-X Basic — reduced field set                 |
 * | facturx-minimum         | EN16931   | France, EU               | Factur-X Minimum — summary invoices only           |
 * | fatturapa               | SDI       | Italy (IT mandatory)     | XML FatturaPA — sent via SDI interchange hub       |
 * | ubl                     | UBL 2.1   | EU/global                | Generic UBL — use when no country-specific needed  |
 * | cii                     | UN/CEFACT | EU/global                | Generic CII — Cross Industry Invoice XML           |
 * | peppol-bis-3            | PEPPOL    | EU/Nordic/AU/SG          | PEPPOL BIS Billing 3.0 — B2B/B2G network          |
 * | facturae               | Facturae  | Spain (ES B2G mandatory) | Facturae 3.2.x — AEAT/FACe submission              |
 */
export const eInvoiceFormatSchema = z.enum([
  "xrechnung-cii",
  "xrechnung-ubl",
  "facturx-en16931",
  "facturx-extended",
  "facturx-basic",
  "facturx-minimum",
  "fatturapa",
  "ubl",
  "cii",
  "peppol-bis-3",
  "facturae",
]);

export type EInvoiceFormat = z.infer<typeof eInvoiceFormatSchema>;

/* ------------------------------------------------------------------ */
/*  Output schemas                                                      */
/* ------------------------------------------------------------------ */

export const sendEInvoiceOutput = z.object({
  workflowRunId: z.string().describe("Hatchet workflow run ID for polling status"),
  status: z.literal("queued").describe("Always 'queued' for async dispatch"),
  estimatedCompletionSec: z.number().describe("Estimated seconds until the workflow completes"),
}).passthrough();

export const eInvoiceStatusOutput = z.object({
  status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  step: z.string().describe("Current or last workflow step name"),
  error: z.string().optional().describe("Error message if status is 'failed'"),
  ackId: z.string().optional().describe("Network acknowledgement ID (PEPPOL SBDH / SDI protocol ID / etc.)"),
  pdfA3Url: z.string().optional().describe("Signed URL to download the PDF/A-3 envelope (Factur-X only)"),
  xmlUrl: z.string().optional().describe("Signed URL to download the raw XML file"),
}).passthrough();

export const validateEInvoiceOutput = z.object({
  valid: z.boolean().describe("Whether the XML passes all validation rules"),
  errors: z.array(z.object({
    severity: z.string().describe("'error' | 'warning' | 'info'"),
    location: z.string().describe("XPath or element path where the issue was found"),
    message: z.string().describe("Human-readable validation message"),
    rule: z.string().describe("Rule ID (e.g. 'BR-01', 'PEPPOL-EN16931-R001')"),
  })).describe("List of validation findings (empty if valid)"),
  validator: z.enum(["kosit", "mustang", "xsd", "schematron"]).describe("Validation engine used"),
  durationMs: z.number().describe("Validation duration in milliseconds"),
}).passthrough();

export const exportDatevOutput = z.object({
  fileUrl: z.string().describe("Signed URL to download the DATEV EXTF file"),
  filename: z.string().describe("Suggested filename (e.g. EXTF_Buchungsstapel_2026-01.csv)"),
  rowCount: z.number().describe("Number of accounting rows in the export"),
  fiscalPeriod: z.string().describe("Fiscal period covered (e.g. '2026-01' or '2026-Q1')"),
  encoding: z.literal("cp1252").describe("File encoding — always CP1252 per DATEV EXTF spec"),
}).passthrough();

/* ------------------------------------------------------------------ */
/*  Tool registration                                                   */
/* ------------------------------------------------------------------ */

export function registerEInvoiceTools(server: McpServer, _client: IFrihetClient): void {
  // -- send_einvoice --

  server.registerTool(
    "send_einvoice",
    {
      title: "Send E-Invoice",
      description:
        "Dispatch an e-invoice to the recipient via the selected transport channel. " +
        "Returns immediately with a workflowRunId — use get_einvoice_status to poll until completion. " +
        "\n\n" +
        "Supported formats (11 total):\n" +
        "  • xrechnung-cii — XRechnung CII syntax (Germany B2G mandatory)\n" +
        "  • xrechnung-ubl — XRechnung UBL 2.1 syntax (Germany B2G alternative)\n" +
        "  • facturx-en16931 — Factur-X EN16931 PDF/A-3 (France, EU)\n" +
        "  • facturx-extended — Factur-X Extended with trade/logistics fields (France, EU)\n" +
        "  • facturx-basic — Factur-X Basic reduced field set (France, EU)\n" +
        "  • facturx-minimum — Factur-X Minimum for summary invoices (France, EU)\n" +
        "  • fatturapa — FatturaPA XML via SDI hub (Italy mandatory)\n" +
        "  • ubl — Generic UBL 2.1 XML (EU/global)\n" +
        "  • cii — Generic CII Cross Industry Invoice (EU/global)\n" +
        "  • peppol-bis-3 — PEPPOL BIS Billing 3.0 network (EU/Nordic/AU/SG)\n" +
        "  • facturae — Facturae 3.2.x (Spain B2G via FACe/AEAT mandatory)\n" +
        "\n" +
        "Dispatch modes:\n" +
        "  • email — attach XML/PDF and send via Resend to client email on file\n" +
        "  • chorus_pro — submit to French Chorus Pro portal (facturx-* only)\n" +
        "  • sdi — submit to Italian SDI hub (fatturapa only)\n" +
        "  • peppol — transmit via PEPPOL access point (peppol-bis-3 only)\n" +
        "  • download — generate and return a signed download URL only\n" +
        "\n" +
        "NOTE: Stub response — real CF endpoint https://api.frihet.io/v1/einvoice/send wired in transport Wave. " +
        "/ Envia una factura electronica al destinatario mediante el canal de transporte seleccionado. " +
        "Devuelve de forma asincrona — consultar get_einvoice_status para seguimiento.",
      annotations: CREATE_ANNOTATIONS,
      inputSchema: {
        invoiceId: z.string().describe("Frihet invoice ID to dispatch / ID de la factura a enviar"),
        format: eInvoiceFormatSchema.describe(
          "E-invoice format. Choose based on recipient country and channel: " +
          "DE→xrechnung-cii/ubl, FR→facturx-*, IT→fatturapa, ES B2G→facturae, EU PEPPOL→peppol-bis-3, " +
          "generic→ubl or cii / Formato de factura electronica.",
        ),
        dispatchMode: z.enum(["email", "chorus_pro", "sdi", "peppol", "download"]).describe(
          "Transport channel: email=send via Resend, chorus_pro=French portal, sdi=Italian SDI hub, " +
          "peppol=PEPPOL network, download=generate URL only / Canal de transporte.",
        ),
      },
      outputSchema: sendEInvoiceOutput,
    },
    async ({ invoiceId, format, dispatchMode }) =>
      withToolLogging("send_einvoice", async () => {
        // STUB: real implementation will call https://api.frihet.io/v1/einvoice/send
        // via Hatchet workflow trigger. Wired in transport Wave.
        console.error(
          JSON.stringify({
            service: "frihet-mcp",
            level: "info",
            message: `[STUB] send_einvoice — invoiceId=${invoiceId} format=${format} dispatchMode=${dispatchMode}`,
            operation: "mcp.einvoice.send",
            timestamp: new Date().toISOString(),
          }),
        );

        const stubResult = {
          workflowRunId: `wfr_stub_${Date.now()}`,
          status: "queued" as const,
          estimatedCompletionSec: 15,
          _stub: true,
          _note: "Stub response — CF endpoint https://api.frihet.io/v1/einvoice/send not yet wired",
        };

        return {
          content: [
            mutateContent(
              `E-invoice queued (stub):\n` +
              `  Invoice: ${invoiceId}\n` +
              `  Format: ${format}\n` +
              `  Dispatch: ${dispatchMode}\n` +
              `  WorkflowRunId: ${stubResult.workflowRunId}\n` +
              `  Status: queued\n` +
              `  Estimated: ~${stubResult.estimatedCompletionSec}s\n\n` +
              `Use get_einvoice_status with the workflowRunId to poll for completion.`,
            ),
          ],
          structuredContent: stubResult as unknown as Record<string, unknown>,
        };
      }),
  );

  // -- get_einvoice_status --

  server.registerTool(
    "get_einvoice_status",
    {
      title: "Get E-Invoice Status",
      description:
        "Poll the status of an e-invoice dispatch workflow. " +
        "Returns current step, ack ID (network confirmation), and download URLs once complete. " +
        "Poll every 5–10 seconds until status is 'succeeded', 'failed', or 'cancelled'. " +
        "\n\n" +
        "NOTE: Stub response — real CF endpoint https://api.frihet.io/v1/einvoice/status wired in transport Wave. " +
        "/ Consulta el estado de un flujo de envio de factura electronica.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        workflowRunId: z.string().describe("Hatchet workflow run ID returned by send_einvoice / ID del run de workflow"),
      },
      outputSchema: eInvoiceStatusOutput,
    },
    async ({ workflowRunId }) =>
      withToolLogging("get_einvoice_status", async () => {
        // STUB: real implementation will call https://api.frihet.io/v1/einvoice/status/{workflowRunId}
        console.error(
          JSON.stringify({
            service: "frihet-mcp",
            level: "info",
            message: `[STUB] get_einvoice_status — workflowRunId=${workflowRunId}`,
            operation: "mcp.einvoice.status",
            timestamp: new Date().toISOString(),
          }),
        );

        const stubResult = {
          status: "succeeded" as const,
          step: "dispatch_complete",
          ackId: `ack_stub_${workflowRunId.slice(-8)}`,
          pdfA3Url: undefined,
          xmlUrl: `https://storage.frihet.io/stub/${workflowRunId}.xml`,
          _stub: true,
          _note: "Stub response — CF endpoint https://api.frihet.io/v1/einvoice/status not yet wired",
        };

        return {
          content: [
            getContent(
              `E-invoice status (stub):\n` +
              `  WorkflowRunId: ${workflowRunId}\n` +
              `  Status: ${stubResult.status}\n` +
              `  Step: ${stubResult.step}\n` +
              `  AckId: ${stubResult.ackId}\n` +
              `  XML URL: ${stubResult.xmlUrl}`,
            ),
          ],
          structuredContent: stubResult as unknown as Record<string, unknown>,
        };
      }),
  );

  // -- validate_einvoice_xml --

  server.registerTool(
    "validate_einvoice_xml",
    {
      title: "Validate E-Invoice XML",
      description:
        "Validate an e-invoice XML document against the specified format's schema and schematron rules. " +
        "Returns a list of errors with severity, XPath location, message, and rule ID. " +
        "Runs KOSIT validator (XRechnung), Mustang (EN16931), XSD, or Schematron depending on format. " +
        "\n\n" +
        "Use before dispatch to catch errors early without incurring network transmission costs. " +
        "A valid=true response means the document passes all schema + business rule checks. " +
        "\n\n" +
        "NOTE: Stub response — real CF endpoint https://api.frihet.io/v1/einvoice/validate wired in transport Wave. " +
        "/ Valida un documento XML de factura electronica contra el esquema y reglas schematron del formato especificado.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        xml: z.string().describe("Raw XML string of the e-invoice document to validate / Contenido XML de la factura electronica"),
        format: eInvoiceFormatSchema.describe(
          "Format to validate against. Determines which validator and ruleset to apply. " +
          "/ Formato a validar. Determina el validador y conjunto de reglas a aplicar.",
        ),
      },
      outputSchema: validateEInvoiceOutput,
    },
    async ({ xml, format }) =>
      withToolLogging("validate_einvoice_xml", async () => {
        // STUB: real implementation will call https://api.frihet.io/v1/einvoice/validate
        const xmlLength = xml.length;
        console.error(
          JSON.stringify({
            service: "frihet-mcp",
            level: "info",
            message: `[STUB] validate_einvoice_xml — format=${format} xmlLength=${xmlLength}`,
            operation: "mcp.einvoice.validate",
            timestamp: new Date().toISOString(),
          }),
        );

        const validatorMap: Record<EInvoiceFormat, "kosit" | "mustang" | "xsd" | "schematron"> = {
          "xrechnung-cii": "kosit",
          "xrechnung-ubl": "kosit",
          "facturx-en16931": "mustang",
          "facturx-extended": "mustang",
          "facturx-basic": "mustang",
          "facturx-minimum": "mustang",
          "fatturapa": "xsd",
          "ubl": "schematron",
          "cii": "schematron",
          "peppol-bis-3": "schematron",
          "facturae": "xsd",
        };

        const stubResult = {
          valid: true,
          errors: [] as Array<{ severity: string; location: string; message: string; rule: string }>,
          validator: validatorMap[format],
          durationMs: 42,
          _stub: true,
          _note: "Stub response — CF endpoint https://api.frihet.io/v1/einvoice/validate not yet wired",
        };

        return {
          content: [
            getContent(
              `E-invoice validation result (stub):\n` +
              `  Format: ${format}\n` +
              `  Valid: ${stubResult.valid}\n` +
              `  Errors: ${stubResult.errors.length}\n` +
              `  Validator: ${stubResult.validator}\n` +
              `  Duration: ${stubResult.durationMs}ms`,
            ),
          ],
          structuredContent: stubResult as unknown as Record<string, unknown>,
        };
      }),
  );

  // -- export_datev --

  server.registerTool(
    "export_datev",
    {
      title: "Export DATEV",
      description:
        "Export accounting data in DATEV EXTF format for import into DATEV Kanzlei-Rechnungswesen or compatible systems. " +
        "Returns a signed download URL valid for 24 hours. " +
        "\n\n" +
        "Supported EXTF formats:\n" +
        "  • extf-buchungsstapel — Journal entries (Buchungsstapel) — most common, use for P&L/tax\n" +
        "  • extf-debitoren — Accounts receivable master data (Debitoren-/Kreditorenstamm AR)\n" +
        "  • extf-kreditoren — Accounts payable master data (Debitoren-/Kreditorenstamm AP)\n" +
        "\n" +
        "Output encoding is always CP1252 per DATEV EXTF specification. " +
        "Date range: both periodStart and periodEnd must be ISO 8601 dates (YYYY-MM-DD). " +
        "\n\n" +
        "NOTE: Stub response — real CF endpoint https://api.frihet.io/v1/datev/export wired in transport Wave. " +
        "/ Exporta datos contables en formato DATEV EXTF para importacion en DATEV o sistemas compatibles.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        periodStart: z.string().describe(
          "Start of the export period (ISO 8601 YYYY-MM-DD). Inclusive. " +
          "/ Inicio del periodo de exportacion (YYYY-MM-DD). Inclusivo.",
        ),
        periodEnd: z.string().describe(
          "End of the export period (ISO 8601 YYYY-MM-DD). Inclusive. " +
          "/ Fin del periodo de exportacion (YYYY-MM-DD). Inclusivo.",
        ),
        format: z.enum(["extf-buchungsstapel", "extf-debitoren", "extf-kreditoren"]).describe(
          "DATEV EXTF export format: extf-buchungsstapel (journal entries), " +
          "extf-debitoren (AR master), extf-kreditoren (AP master) / Formato EXTF de DATEV.",
        ),
      },
      outputSchema: exportDatevOutput,
    },
    async ({ periodStart, periodEnd, format }) =>
      withToolLogging("export_datev", async () => {
        // STUB: real implementation will call https://api.frihet.io/v1/datev/export
        console.error(
          JSON.stringify({
            service: "frihet-mcp",
            level: "info",
            message: `[STUB] export_datev — format=${format} period=${periodStart}..${periodEnd}`,
            operation: "mcp.einvoice.datev_export",
            timestamp: new Date().toISOString(),
          }),
        );

        const formatFileMap: Record<string, string> = {
          "extf-buchungsstapel": "EXTF_Buchungsstapel",
          "extf-debitoren": "EXTF_Debitoren",
          "extf-kreditoren": "EXTF_Kreditoren",
        };

        const periodLabel = periodStart.slice(0, 7); // YYYY-MM
        const filename = `${formatFileMap[format]}_${periodLabel}.csv`;

        const stubResult = {
          fileUrl: `https://storage.frihet.io/stub/datev/${filename}`,
          filename,
          rowCount: 0,
          fiscalPeriod: periodLabel,
          encoding: "cp1252" as const,
          _stub: true,
          _note: "Stub response — CF endpoint https://api.frihet.io/v1/datev/export not yet wired",
        };

        return {
          content: [
            getContent(
              `DATEV export ready (stub):\n` +
              `  Format: ${format}\n` +
              `  Period: ${periodStart} → ${periodEnd}\n` +
              `  Filename: ${stubResult.filename}\n` +
              `  Rows: ${stubResult.rowCount}\n` +
              `  Encoding: ${stubResult.encoding}\n` +
              `  Download URL: ${stubResult.fileUrl}`,
            ),
          ],
          structuredContent: stubResult as unknown as Record<string, unknown>,
        };
      }),
  );
}
