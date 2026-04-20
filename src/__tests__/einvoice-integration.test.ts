/**
 * Integration tests for e-invoice MCP tools against live api.frihet.io.
 *
 * Skipped by default. Runs only when MCP_LIVE_TEST=true.
 *
 * Usage:
 *   MCP_LIVE_TEST=true FRIHET_API_KEY=fri_your_key npm test
 *
 * Manual QA path:
 *   1. Set env vars above.
 *   2. Run: npm run build && MCP_LIVE_TEST=true FRIHET_API_KEY=fri_xxx node --test dist/__tests__/einvoice-integration.test.js
 *   3. Verify: each tool returns real data (no _stub flag) OR 404-fallback stub if CF endpoint is pending.
 *   4. For send_einvoice: poll get_einvoice_status with the returned workflowRunId every 5s.
 *   5. For validate_einvoice_xml: pass a minimal valid XRechnung CII document.
 *   6. For export_datev: check the fileUrl is a signed URL valid for 24h.
 *
 * CF endpoint rollout schedule:
 *   - /v1/einvoice/send        → 2026-04-21
 *   - /v1/einvoice/status/:id  → 2026-04-21
 *   - /v1/einvoice/validate    → 2026-04-24
 *   - /v1/einvoice/export-datev → 2026-04-28
 */

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const LIVE = process.env["MCP_LIVE_TEST"] === "true";
const API_KEY = process.env["FRIHET_API_KEY"] ?? "";

const skip = (name: string, fn: () => Promise<void>) => {
  if (!LIVE) {
    test(`[SKIPPED — set MCP_LIVE_TEST=true] ${name}`, () => {
      // intentionally skipped
    });
    return;
  }
  test(name, fn);
};

// ── Minimal McpServer stub ───────────────────────────────────────────────────

interface ToolConfig {
  title: string;
  description: string;
  annotations?: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema?: unknown;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
}>;

interface RegisteredTool {
  name: string;
  config: ToolConfig;
  handler: ToolHandler;
}

class StubMcpServer {
  tools: Map<string, RegisteredTool> = new Map();
  registerTool(name: string, config: ToolConfig, handler: ToolHandler): void {
    this.tools.set(name, { name, config, handler });
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────

describe("E-Invoice Integration Tests — live api.frihet.io", () => {
  let tools: Map<string, RegisteredTool>;

  before(async () => {
    if (!LIVE) return;
    if (!API_KEY) throw new Error("FRIHET_API_KEY env var required for live tests");

    const { FrihetClient } = await import("../client.js");
    const { registerEInvoiceTools } = await import("../tools/einvoice.js");

    const client = new FrihetClient(API_KEY);
    const server = new StubMcpServer();
    registerEInvoiceTools(
      server as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer,
      client,
    );
    tools = server.tools;
  });

  // ── send_einvoice ──

  skip("send_einvoice — dispatches invoice or returns 404-fallback stub", async () => {
    const tool = tools.get("send_einvoice")!;
    // Use a known test invoice ID from your Frihet sandbox
    const result = await tool.handler({
      invoiceId: process.env["TEST_INVOICE_ID"] ?? "inv_test_integration",
      format: "xrechnung-cii",
      dispatchMode: "download",
    });
    const sc = result.structuredContent!;
    if (sc["_stub"]) {
      // CF endpoint not yet deployed — fallback is correct
      assert.equal(sc["_note"], "CF endpoint pending deploy");
      assert.ok(typeof sc["_plannedEndpoint"] === "string");
      console.log("send_einvoice: 404-fallback stub (CF not yet deployed)");
    } else {
      // Live response
      assert.ok(typeof sc["workflowRunId"] === "string", "workflowRunId should be string");
      assert.equal(sc["status"], "queued");
      assert.ok(typeof sc["estimatedCompletionSec"] === "number");
      console.log(`send_einvoice: queued workflowRunId=${sc["workflowRunId"]}`);
    }
  });

  // ── get_einvoice_status ──

  skip("get_einvoice_status — polls status or returns 404-fallback stub", async () => {
    const tool = tools.get("get_einvoice_status")!;
    const result = await tool.handler({
      workflowRunId: process.env["TEST_WORKFLOW_RUN_ID"] ?? "wfr_test_integration",
    });
    const sc = result.structuredContent!;
    if (sc["_stub"]) {
      assert.equal(sc["_note"], "CF endpoint pending deploy");
      console.log("get_einvoice_status: 404-fallback stub (CF not yet deployed)");
    } else {
      const validStatuses = ["queued", "running", "succeeded", "failed", "cancelled"];
      assert.ok(validStatuses.includes(sc["status"] as string), `unexpected status: ${sc["status"]}`);
      console.log(`get_einvoice_status: status=${sc["status"]} step=${sc["step"]}`);
    }
  });

  // ── validate_einvoice_xml ──

  skip("validate_einvoice_xml — validates XML or returns 404-fallback stub", async () => {
    const tool = tools.get("validate_einvoice_xml")!;
    // Minimal XRechnung CII document (intentionally invalid to test error reporting)
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext/>
  <rsm:ExchangedDocument/>
  <rsm:SupplyChainTradeTransaction/>
</rsm:CrossIndustryInvoice>`;
    const result = await tool.handler({ xml: minimalXml, format: "xrechnung-cii" });
    const sc = result.structuredContent!;
    if (sc["_stub"]) {
      assert.equal(sc["_note"], "CF endpoint pending deploy");
      console.log("validate_einvoice_xml: 404-fallback stub (CF not yet deployed)");
    } else {
      assert.ok(typeof sc["valid"] === "boolean");
      assert.ok(Array.isArray(sc["errors"]));
      assert.ok(typeof sc["durationMs"] === "number");
      console.log(`validate_einvoice_xml: valid=${sc["valid"]} errors=${(sc["errors"] as unknown[]).length} durationMs=${sc["durationMs"]}`);
    }
  });

  // ── export_datev ──

  skip("export_datev — exports DATEV EXTF or returns 404-fallback stub", async () => {
    const tool = tools.get("export_datev")!;
    const result = await tool.handler({
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      format: "extf-buchungsstapel",
    });
    const sc = result.structuredContent!;
    if (sc["_stub"]) {
      assert.equal(sc["_note"], "CF endpoint pending deploy");
      console.log("export_datev: 404-fallback stub (CF not yet deployed)");
    } else {
      assert.ok(typeof sc["fileUrl"] === "string" && (sc["fileUrl"] as string).startsWith("https://"));
      assert.equal(sc["encoding"], "cp1252");
      assert.ok(typeof sc["rowCount"] === "number");
      console.log(`export_datev: filename=${sc["filename"]} rowCount=${sc["rowCount"]} fileUrl=${sc["fileUrl"]}`);
    }
  });
});
