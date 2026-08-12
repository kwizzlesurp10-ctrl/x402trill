#!/usr/bin/env node
/**
 * Minimal Streamable-HTTP MCP client: initialize → tools/list → mint payment →
 * tools/call route_inference with _meta["x402/payment"].
 *
 * Requires DEMO_MODE server (for mint). Usage:
 *   node scripts/mcp-paid-call.mjs
 *   BASE_URL=http://127.0.0.1:4021 node scripts/mcp-paid-call.mjs
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:4021").replace(/\/$/, "");
const MCP = `${BASE}/mcp`;

let sessionId = null;
let rpcId = 1;

async function mcp(method, params, { notification = false } = {}) {
  const body = notification
    ? { jsonrpc: "2.0", method, params }
    : { jsonrpc: "2.0", id: rpcId++, method, params };

  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const res = await fetch(MCP, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  // Streamable HTTP may return SSE or JSON
  if (ct.includes("text/event-stream")) {
    const dataLines = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    const last = dataLines[dataLines.length - 1];
    if (!last) return null;
    return JSON.parse(last);
  }
  if (!text) return null;
  return JSON.parse(text);
}

function unwrap(result) {
  if (result?.error) {
    throw new Error(`RPC error ${result.error.code}: ${JSON.stringify(result.error)}`);
  }
  return result?.result;
}

async function main() {
  console.log("MCP endpoint", MCP);

  const init = unwrap(
    await mcp("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "aetherweb-mcp-paid-call", version: "0.1.0" },
    }),
  );
  console.log("initialized", init?.serverInfo || init);
  console.log("session", sessionId);

  await mcp("notifications/initialized", {}, { notification: true });

  const listed = unwrap(await mcp("tools/list", {}));
  console.log(
    "tools",
    (listed?.tools || []).map((t) => t.name),
  );

  // Unpaid paid-tool call → expect payment error shape in content
  const unpaid = unwrap(
    await mcp("tools/call", {
      name: "route_inference",
      arguments: { task: "route a cheap classify job" },
    }),
  );
  console.log("unpaid call (expect 402 payload in content):");
  console.log(JSON.stringify(unpaid, null, 2).slice(0, 600));

  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  if (health.mode !== "demo") {
    console.log("Not DEMO_MODE — stop after unpaid probe.");
    return;
  }

  const mint = await fetch(`${BASE}/v1/demo/mint-payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payer: "0xdemo00000000000000000000000000000000mcp",
    }),
  }).then((r) => r.json());

  const paid = unwrap(
    await mcp("tools/call", {
      name: "route_inference",
      arguments: {
        task: "route a cheap classify job for multi-agent swarm",
        prefer_latency: "low",
        require_tools: true,
        agent_id: "mcp-paid-call",
      },
      _meta: {
        "x402/payment": mint.payment,
      },
    }),
  );

  console.log("\npaid call result:");
  console.log(JSON.stringify(paid, null, 2).slice(0, 2000));

  const text = paid?.content?.[0]?.text || "";
  if (text.includes("selected") || text.includes("gpt") || text.includes("grok")) {
    console.log("\n✓ MCP paid call OK");
  } else if (paid?.isError) {
    console.error("\n✗ tool returned isError — payment may not have matched");
    process.exit(3);
  } else {
    console.log("\n✓ MCP call completed (inspect payload above)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
