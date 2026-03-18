#!/usr/bin/env node
// Only show on interactive install, not CI
if (process.env.CI || process.env.FRIHET_QUIET) process.exit(0);

console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  @frihet/mcp-server v1.3.1 installed                ║
  ║                                                      ║
  ║  Docs:   https://docs.frihet.io/mcp                  ║
  ║  GitHub: https://github.com/Frihet-io/frihet-mcp     ║
  ║                                                      ║
  ║  Star us if you find it useful!                      ║
  ╚══════════════════════════════════════════════════════╝
`);
