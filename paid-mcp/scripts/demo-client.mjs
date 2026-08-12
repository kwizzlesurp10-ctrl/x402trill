#!/usr/bin/env node
/**
 * End-to-end demo client for aetherweb paid-mcp.
 *
 * Usage:
 *   node scripts/demo-client.mjs
 *   BASE_URL=http://127.0.0.1:4021 node scripts/demo-client.mjs "summarize agent logs"
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:4021";
const payer =
  process.env.PAYER || "0xdemo0000000000000000000000000000000000c1";

const which = process.argv[2] === "clean_data_feed" ? "clean_data_feed" : "route_inference";
const path =
  which === "clean_data_feed" ? "/v1/clean-data" : "/v1/route-inference";
const body =
  which === "clean_data_feed"
    ? {
        topic: process.argv[3] || "agent_commerce",
        window: "24h",
        limit: 6,
        agent_id: "demo-client",
      }
    : {
        task:
          process.argv.slice(2).join(" ").trim() ||
          "classify spam vs ham for agent inbox triage",
        agent_id: "demo-client",
        prefer_latency: "low",
        require_tools: true,
      };

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  if (typeof data === "string") console.log(data);
  else console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  log("health", health);

  const discovery = await fetch(`${BASE}/discovery`).then((r) => r.json());
  log("discovery.tools", discovery.tools);

  log("tool", { which, path, body });

  // Unpaid call → expect 402
  const unpaid = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  log("unpaid status", {
    status: unpaid.status,
    paymentRequired: unpaid.headers.get("payment-required")?.slice(0, 80) + "…",
  });

  if (unpaid.status !== 402) {
    console.error("Expected HTTP 402 without payment");
    process.exit(2);
  }

  if (health.mode !== "demo") {
    log(
      "note",
      "Server is not in DEMO_MODE. Use: PRIVATE_KEY=0x... npm run live:client",
    );
    process.exit(0);
  }

  const mint = await fetch(`${BASE}/v1/demo/mint-payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payer, tool: which }),
  }).then((r) => r.json());

  log("minted payment (truncated)", {
    meta_key: mint.meta_key,
    accepted: mint.payment?.accepted,
    payer,
  });

  const paid = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "PAYMENT-SIGNATURE": mint.payment_signature_header,
      "x-payment-payer": payer,
    },
    body: JSON.stringify(body),
  });

  const paidBody = await paid.json();
  log("paid response", {
    status: paid.status,
    selected: paidBody.selected,
    topic: paidBody.topic,
    rows: paidBody.rows?.length,
    rationale: paidBody.rationale,
    receipt: paidBody.receipt,
    billing: paidBody.billing,
  });

  if (paid.status !== 200 || !paidBody.receipt) {
    console.error("Paid call failed");
    process.exit(3);
  }

  console.log("\n✓ demo-client e2e OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
