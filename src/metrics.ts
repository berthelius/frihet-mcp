/**
 * In-memory tool usage metrics for the Frihet MCP server.
 *
 * Tracks per-tool call counts, error counts, and average duration.
 * Metrics are logged on graceful shutdown (SIGINT/SIGTERM in Node.js)
 * or can be retrieved at any time via getMetrics().
 */

import { log } from "./logger.js";

// Declared to avoid TS errors in Workers environment where `process` is not typed
declare const process: { env?: Record<string, string | undefined>; on?: (event: string, handler: () => void) => void; exit?: (code: number) => void } | undefined;

interface ToolStats {
  calls: number;
  errors: number;
  totalMs: number;
}

const toolStats = new Map<string, ToolStats>();
const startTime = Date.now();

/**
 * Record a completed tool call.
 */
export function recordToolCall(
  tool: string,
  durationMs: number,
  success: boolean,
): void {
  let stats = toolStats.get(tool);
  if (!stats) {
    stats = { calls: 0, errors: 0, totalMs: 0 };
    toolStats.set(tool, stats);
  }

  stats.calls++;
  stats.totalMs += durationMs;
  if (!success) {
    stats.errors++;
  }
}

/**
 * Get current metrics snapshot.
 */
export function getMetrics(): {
  tools: Record<string, { calls: number; errors: number; avgMs: number }>;
  uptime: number;
} {
  const tools: Record<string, { calls: number; errors: number; avgMs: number }> = {};

  for (const [name, stats] of toolStats) {
    tools[name] = {
      calls: stats.calls,
      errors: stats.errors,
      avgMs: stats.calls > 0 ? Math.round(stats.totalMs / stats.calls) : 0,
    };
  }

  return {
    tools,
    uptime: Math.round((Date.now() - startTime) / 1000),
  };
}

/**
 * Log the final metrics summary. Called on graceful shutdown.
 */
function logMetricsSummary(): void {
  const metrics = getMetrics();
  const totalCalls = Object.values(metrics.tools).reduce((sum, t) => sum + t.calls, 0);
  const totalErrors = Object.values(metrics.tools).reduce((sum, t) => sum + t.errors, 0);

  if (totalCalls === 0) {
    log({
      level: "info",
      message: `Shutdown after ${metrics.uptime}s — no tool calls recorded`,
      operation: "shutdown_metrics",
      metadata: { uptime: metrics.uptime },
    });
    return;
  }

  log({
    level: "info",
    message: `Shutdown after ${metrics.uptime}s — ${totalCalls} calls, ${totalErrors} errors`,
    operation: "shutdown_metrics",
    metadata: metrics,
  });
}

/**
 * Register shutdown handlers (Node.js only).
 * In Workers, metrics are per-request and logged via console automatically.
 */
export function registerShutdownHook(): void {
  if (typeof process !== "undefined" && process?.on && process?.exit) {
    const exit = process.exit;
    const handler = () => {
      logMetricsSummary();
      exit(0);
    };

    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }
}
