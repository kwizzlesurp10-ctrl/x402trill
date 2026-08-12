import { z } from "zod";

/**
 * High-frequency utility: clean structured data feed for agents.
 * Deterministic pseudo-market + agent-signal rows — no external API keys.
 * Survives high-frequency querying; suitable for paid MCP metering demos.
 */

export const cleanDataFeedInputSchema = {
  topic: z
    .enum([
      "usdc_base",
      "agent_commerce",
      "inference_pricing",
      "social_reputation",
      "x402_volume",
    ])
    .describe("Structured feed topic"),
  window: z
    .enum(["1h", "24h", "7d"])
    .optional()
    .describe("Lookback window (default 24h)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Max rows to return (default 10)"),
  agent_id: z
    .string()
    .max(128)
    .optional()
    .describe("Optional agent identity for metering / receipts"),
};

export const CleanDataFeedArgsSchema = z.object(cleanDataFeedInputSchema);
export type CleanDataFeedArgs = z.infer<typeof CleanDataFeedArgsSchema>;

export type DataRow = {
  ts: string;
  topic: string;
  metric: string;
  value: number;
  unit: string;
  quality: "high" | "medium";
  source: string;
  tags: string[];
};

export type CleanDataFeedResult = {
  topic: CleanDataFeedArgs["topic"];
  window: string;
  generated_at: string;
  rows: DataRow[];
  schema_version: string;
  notes: string;
};

/** Stable hash for deterministic series from topic+window+index */
function seed(topic: string, window: string, i: number): number {
  let h = 2166136261;
  const s = `${topic}:${window}:${i}`;
  for (let c = 0; c < s.length; c++) {
    h ^= s.charCodeAt(c);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function windowHours(window: string): number {
  if (window === "1h") return 1;
  if (window === "7d") return 168;
  return 24;
}

const TOPIC_META: Record<
  CleanDataFeedArgs["topic"],
  { metric: string; unit: string; base: number; amplitude: number; tags: string[] }
> = {
  usdc_base: {
    metric: "transfer_volume_usd",
    unit: "usd",
    base: 1_200_000,
    amplitude: 180_000,
    tags: ["stablecoin", "base", "liquidity"],
  },
  agent_commerce: {
    metric: "organic_daily_volume_usd",
    unit: "usd",
    base: 28_000,
    amplitude: 9_000,
    tags: ["agents", "organic", "wash-aware"],
  },
  inference_pricing: {
    metric: "median_cost_per_1k_tokens_usd",
    unit: "usd",
    base: 0.0045,
    amplitude: 0.0012,
    tags: ["inference", "routing", "cost"],
  },
  social_reputation: {
    metric: "agent_trust_index",
    unit: "score_0_100",
    base: 62,
    amplitude: 12,
    tags: ["nostr", "swarmfeed", "reputation"],
  },
  x402_volume: {
    metric: "reported_txns_per_hour",
    unit: "count",
    base: 95_000,
    amplitude: 40_000,
    tags: ["x402", "headline", "probe-heavy"],
  },
};

export function cleanDataFeed(args: CleanDataFeedArgs): CleanDataFeedResult {
  const window = args.window ?? "24h";
  const limit = args.limit ?? 10;
  const meta = TOPIC_META[args.topic];
  const hours = windowHours(window);
  const now = Date.now();
  const stepMs = (hours * 3600_000) / limit;

  const rows: DataRow[] = [];
  for (let i = 0; i < limit; i++) {
    const r = seed(args.topic, window, i);
    const wave = Math.sin(i / 2 + r * Math.PI) * meta.amplitude;
    const noise = (r - 0.5) * meta.amplitude * 0.35;
    let value = meta.base + wave + noise;
    if (meta.unit === "score_0_100") {
      value = Math.max(0, Math.min(100, value));
    } else if (value < 0) {
      value = Math.abs(value);
    }
    // Round money-ish metrics
    if (meta.unit === "usd" && meta.base >= 1) {
      value = Math.round(value * 100) / 100;
    } else if (meta.unit === "usd") {
      value = Math.round(value * 1e6) / 1e6;
    } else if (meta.unit === "count") {
      value = Math.round(value);
    } else {
      value = Math.round(value * 100) / 100;
    }

    rows.push({
      ts: new Date(now - (limit - 1 - i) * stepMs).toISOString(),
      topic: args.topic,
      metric: meta.metric,
      value,
      unit: meta.unit,
      quality: r > 0.25 ? "high" : "medium",
      source: "aetherweb-synthetic-v1",
      tags: meta.tags,
    });
  }

  return {
    topic: args.topic,
    window,
    generated_at: new Date().toISOString(),
    rows,
    schema_version: "2026.08-data-v1",
    notes:
      "Deterministic clean feed for agent high-frequency queries. Replace with live MCP data marketplaces in production.",
  };
}
