#!/usr/bin/env node
/**
 * Stdio MCP entry — for Claude Desktop / local agent hosts.
 * Payments still flow via _meta on tool calls; use DEMO_MODE or a live wallet client.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { BudgetStore } from "./budgets.js";
import { ReceiptStore } from "./receipts.js";
import { createGatewayPaymentContext } from "./resource-server.js";
import { createPaidMcpServer } from "./create-mcp-server.js";

async function main() {
  const config = loadConfig();
  const payment = await createGatewayPaymentContext(config);
  const budgets = new BudgetStore(config);
  const receipts = new ReceiptStore(config.receiptsDir);
  const server = createPaidMcpServer({ config, payment, budgets, receipts });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is MCP
  console.error(
    `[${config.serviceName}] stdio ready mode=${payment.mode} network=${config.network} price=${config.price}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
