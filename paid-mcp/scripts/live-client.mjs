#!/usr/bin/env node
/**
 * Live (or demo) HTTP x402 client for paid-mcp.
 *
 * Demo (no chain):
 *   node scripts/live-client.mjs route_inference
 *   node scripts/live-client.mjs clean_data_feed --topic agent_commerce
 *
 * Live wallet (Base Sepolia USDC + real facilitator):
 *   DEMO_MODE=false on server
 *   PRIVATE_KEY=0x... node scripts/live-client.mjs route_inference
 *
 * Never commit PRIVATE_KEY. Prefer funded Base Sepolia test wallets only.
 */
import { x402Client } from "@x402/core/client";
import { x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:4021").replace(/\/$/, "");

const TOOLS = {
  route_inference: {
    path: "/v1/route-inference",
    body: {
      task: process.argv.includes("--task")
        ? process.argv[process.argv.indexOf("--task") + 1]
        : "classify spam vs ham for agent inbox",
      prefer_latency: "low",
      require_tools: true,
      agent_id: "live-client",
    },
  },
  clean_data_feed: {
    path: "/v1/clean-data",
    body: {
      topic: process.argv.includes("--topic")
        ? process.argv[process.argv.indexOf("--topic") + 1]
        : "agent_commerce",
      window: "24h",
      limit: 8,
      agent_id: "live-client",
    },
  },
};

function pickTool() {
  const name = process.argv[2] || "route_inference";
  if (!TOOLS[name]) {
    console.error(`Unknown tool "${name}". Use: ${Object.keys(TOOLS).join(" | ")}`);
    process.exit(1);
  }
  return { name, ...TOOLS[name] };
}

async function demoPay(path, body) {
  const unpaid = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (unpaid.status !== 402) {
    throw new Error(`Expected 402, got ${unpaid.status}`);
  }
  const mint = await fetch(`${BASE}/v1/demo/mint-payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payer: process.env.PAYER || "0xdemo00000000000000000000000000000000live",
      tool: path.includes("clean") ? "clean_data_feed" : "route_inference",
    }),
  }).then((r) => r.json());

  const paid = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "PAYMENT-SIGNATURE": mint.payment_signature_header,
      "x-payment-payer":
        process.env.PAYER || "0xdemo00000000000000000000000000000000live",
    },
    body: JSON.stringify(body),
  });
  return { status: paid.status, body: await paid.json() };
}

async function walletPay(path, body) {
  const pk = process.env.PRIVATE_KEY;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error(
      "PRIVATE_KEY must be a 0x-prefixed 32-byte hex key for live signing",
    );
  }

  const account = privateKeyToAccount(pk);
  console.log("signer", account.address);

  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });
  const http = new x402HTTPClient(client);

  const unpaid = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (unpaid.status !== 402) {
    const t = await unpaid.text();
    throw new Error(`Expected 402, got ${unpaid.status}: ${t.slice(0, 300)}`);
  }

  const paymentRequired = http.getPaymentRequiredResponse(
    (n) => unpaid.headers.get(n),
    await unpaid.json().catch(() => undefined),
  );
  console.log("payment required", {
    accepts: paymentRequired.accepts?.map((a) => ({
      network: a.network,
      amount: a.amount,
      payTo: a.payTo,
    })),
  });

  const payload = await http.createPaymentPayload(paymentRequired);
  const payHeaders = http.encodePaymentSignatureHeader(payload);

  const paid = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...payHeaders,
      "x-payment-payer": account.address,
    },
    body: JSON.stringify(body),
  });

  const settle = (() => {
    try {
      return http.getPaymentSettleResponse((n) => paid.headers.get(n));
    } catch {
      return null;
    }
  })();

  return {
    status: paid.status,
    settle,
    body: await paid.json().catch(async () => ({ raw: await paid.text() })),
  };
}

async function main() {
  const tool = pickTool();
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log("health", health);
  console.log("calling", tool.name, tool.path);

  const useWallet = Boolean(process.env.PRIVATE_KEY);
  if (useWallet && health.mode === "demo") {
    console.warn(
      "WARNING: PRIVATE_KEY set but server is DEMO_MODE — wallet signatures may fail verification. Prefer DEMO_MODE=false for live keys.",
    );
  }

  const result = useWallet
    ? await walletPay(tool.path, tool.body)
    : await demoPay(tool.path, tool.body);

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 200) process.exit(3);
  console.log("\n✓ live-client OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
