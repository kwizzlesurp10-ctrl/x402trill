import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Best-effort .env loader (no dotenv dependency). */
function loadDotEnv(path = resolve(process.cwd(), ".env")): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

export type AppConfig = {
  port: number;
  host: string;
  publicBaseUrl: string;
  network: string;
  payTo: string;
  price: string;
  facilitatorUrl: string;
  demoMode: boolean;
  defaultAgentBudgetAtomic: bigint;
  agentBudgets: Map<string, bigint>;
  receiptsDir: string;
  toolName: string;
  serviceName: string;
};

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function parseAgentBudgets(raw: string | undefined): Map<string, bigint> {
  const map = new Map<string, bigint>();
  if (!raw?.trim()) return map;
  for (const part of raw.split(",")) {
    const [addr, budget] = part.split("=").map((s) => s.trim());
    if (!addr || !budget) continue;
    try {
      map.set(addr.toLowerCase(), BigInt(budget));
    } catch {
      /* skip bad entries */
    }
  }
  return map;
}

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT || 4021);
  const host = process.env.HOST || "127.0.0.1";
  const publicBaseUrl =
    process.env.PUBLIC_BASE_URL || `http://${host}:${port}`;
  const network = process.env.NETWORK || "eip155:84532";
  const payToRaw = process.env.PAY_TO || "0x0000000000000000000000000000000000000a01";
  const payToNormalized = /^0x[a-fA-F0-9]{40}$/.test(payToRaw)
    ? payToRaw
    : "0x0000000000000000000000000000000000000a01";

  return {
    port,
    host,
    publicBaseUrl,
    network,
    payTo: payToNormalized,
    price: process.env.PRICE || "$0.001",
    facilitatorUrl:
      process.env.FACILITATOR_URL || "https://x402.org/facilitator",
    demoMode: parseBool(process.env.DEMO_MODE, true),
    defaultAgentBudgetAtomic: BigInt(
      process.env.DEFAULT_AGENT_BUDGET_ATOMIC || "100000",
    ),
    agentBudgets: parseAgentBudgets(process.env.AGENT_BUDGETS),
    receiptsDir: resolve(
      process.cwd(),
      process.env.RECEIPTS_DIR || "./data/receipts",
    ),
    toolName: "route_inference",
    serviceName: "aetherweb-paid-mcp",
  };
}
