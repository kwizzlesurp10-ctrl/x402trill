#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { BudgetStore } from "./budgets.js";
import { ReceiptStore } from "./receipts.js";
import { createGatewayPaymentContext } from "./resource-server.js";
import { createHttpApp } from "./http-app.js";

async function main() {
  const config = loadConfig();
  console.log(
    JSON.stringify({
      level: "info",
      event: "starting",
      service: config.serviceName,
      host: config.host,
      port: config.port,
      demoMode: config.demoMode,
      network: config.network,
      price: config.price,
      payTo: config.payTo,
    }),
  );

  const payment = await createGatewayPaymentContext(config);
  const budgets = new BudgetStore(config);
  const receipts = new ReceiptStore(config.receiptsDir);
  const app = createHttpApp({ config, payment, budgets, receipts });

  app.listen(config.port, config.host, () => {
    console.log(
      JSON.stringify({
        level: "info",
        event: "listening",
        health: `${config.publicBaseUrl}/health`,
        discovery: `${config.publicBaseUrl}/discovery`,
        mcp: `${config.publicBaseUrl}/mcp`,
        httpTool: `${config.publicBaseUrl}/v1/route-inference`,
        mode: payment.mode,
      }),
    );
  });
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      level: "error",
      event: "fatal",
      message: err instanceof Error ? err.message : String(err),
      code:
        err instanceof Error && /facilitator/i.test(err.message)
          ? "FACILITATOR_UNAVAILABLE"
          : "FATAL",
    }),
  );
  process.exit(1);
});
