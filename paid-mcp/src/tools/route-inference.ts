import { z } from "zod";

/**
 * High-frequency utility: cost-aware model route recommendation.
 * Deterministic local table — no provider API keys required.
 * Agents call this repeatedly before sub-task inference.
 */

export const routeInferenceInputSchema = {
  task: z
    .string()
    .min(1)
    .max(4000)
    .describe("Short description of the sub-task to route"),
  max_cost_usd: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Hard ceiling for estimated USD cost per call"),
  prefer_latency: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe("Latency preference; low = fastest models first"),
  require_tools: z
    .boolean()
    .optional()
    .describe("Whether the model must support tool/function calling"),
  agent_id: z
    .string()
    .max(128)
    .optional()
    .describe("Optional agent identity for metering / receipts"),
};

export const RouteInferenceArgsSchema = z.object(routeInferenceInputSchema);
export type RouteInferenceArgs = z.infer<typeof RouteInferenceArgsSchema>;

export type ModelRoute = {
  id: string;
  provider: string;
  tier: "nano" | "small" | "medium" | "large";
  est_cost_usd: number;
  latency: "low" | "medium" | "high";
  tools: boolean;
  strengths: string[];
};

const CATALOG: ModelRoute[] = [
  {
    id: "grok-mini",
    provider: "xai",
    tier: "nano",
    est_cost_usd: 0.0002,
    latency: "low",
    tools: true,
    strengths: ["routing", "classification", "short-form"],
  },
  {
    id: "gpt-4.1-nano",
    provider: "openai",
    tier: "nano",
    est_cost_usd: 0.00015,
    latency: "low",
    tools: true,
    strengths: ["cheap-tools", "extract"],
  },
  {
    id: "claude-haiku",
    provider: "anthropic",
    tier: "small",
    est_cost_usd: 0.0008,
    latency: "low",
    tools: true,
    strengths: ["fast-reasoning", "summarize"],
  },
  {
    id: "gemini-flash",
    provider: "google",
    tier: "small",
    est_cost_usd: 0.0005,
    latency: "low",
    tools: true,
    strengths: ["multimodal-lite", "batch"],
  },
  {
    id: "grok-2",
    provider: "xai",
    tier: "medium",
    est_cost_usd: 0.004,
    latency: "medium",
    tools: true,
    strengths: ["general", "code", "agents"],
  },
  {
    id: "claude-sonnet",
    provider: "anthropic",
    tier: "medium",
    est_cost_usd: 0.006,
    latency: "medium",
    tools: true,
    strengths: ["code", "long-context", "tools"],
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    tier: "large",
    est_cost_usd: 0.02,
    latency: "high",
    tools: true,
    strengths: ["hard-reasoning", "complex-tools"],
  },
  {
    id: "claude-opus",
    provider: "anthropic",
    tier: "large",
    est_cost_usd: 0.04,
    latency: "high",
    tools: true,
    strengths: ["deep-reasoning", "research"],
  },
];

const LATENCY_RANK = { low: 0, medium: 1, high: 2 } as const;

function complexityScore(task: string): number {
  const t = task.toLowerCase();
  let score = Math.min(4, Math.floor(task.length / 280));
  if (/(architect|proof|theorem|multi-step|refactor entire|security audit)/.test(t))
    score += 3;
  if (/(implement|debug|design|research|compare|evaluate)/.test(t)) score += 2;
  if (/(summarize|classify|extract|tag|route|yes\/no|boolean)/.test(t))
    score -= 1;
  if (/(code|typescript|python|sql)/.test(t)) score += 1;
  return Math.max(0, Math.min(6, score));
}

function tierForComplexity(c: number): ModelRoute["tier"] {
  if (c <= 1) return "nano";
  if (c <= 2) return "small";
  if (c <= 4) return "medium";
  return "large";
}

const TIER_ORDER: ModelRoute["tier"][] = ["nano", "small", "medium", "large"];

export type RouteInferenceResult = {
  selected: ModelRoute;
  alternatives: ModelRoute[];
  complexity: number;
  rationale: string;
  estimated_total_usd: number;
  catalog_version: string;
};

export function routeInference(args: RouteInferenceArgs): RouteInferenceResult {
  const complexity = complexityScore(args.task);
  const minTier = tierForComplexity(complexity);
  const minIdx = TIER_ORDER.indexOf(minTier);
  const prefer = args.prefer_latency ?? "medium";
  const maxCost = args.max_cost_usd ?? Number.POSITIVE_INFINITY;

  let candidates = CATALOG.filter((m) => {
    if (args.require_tools && !m.tools) return false;
    if (m.est_cost_usd > maxCost) return false;
    return TIER_ORDER.indexOf(m.tier) >= minIdx;
  });

  // If budget too tight for tier floor, allow cheaper lower tiers with warning
  if (candidates.length === 0) {
    candidates = CATALOG.filter((m) => {
      if (args.require_tools && !m.tools) return false;
      return m.est_cost_usd <= maxCost;
    });
  }
  if (candidates.length === 0) {
    candidates = [...CATALOG].sort((a, b) => a.est_cost_usd - b.est_cost_usd);
  }

  candidates = [...candidates].sort((a, b) => {
    // Prefer cheapest that meets tier, then latency preference
    const cost = a.est_cost_usd - b.est_cost_usd;
    if (Math.abs(cost) > 1e-9) return cost;
    return (
      Math.abs(LATENCY_RANK[a.latency] - LATENCY_RANK[prefer]) -
      Math.abs(LATENCY_RANK[b.latency] - LATENCY_RANK[prefer])
    );
  });

  const selected = candidates[0]!;
  const alternatives = candidates.slice(1, 4);

  const underTier = TIER_ORDER.indexOf(selected.tier) < minIdx;
  const rationale = underTier
    ? `Complexity ${complexity} suggests ${minTier}+ but max_cost_usd=${maxCost} forced ${selected.id} (${selected.tier}).`
    : `Complexity ${complexity} → tier ${minTier}+; selected cheapest capable model ${selected.id} @ ~$${selected.est_cost_usd}/call (latency=${selected.latency}).`;

  return {
    selected,
    alternatives,
    complexity,
    rationale,
    estimated_total_usd: selected.est_cost_usd,
    catalog_version: "2026.08-route-v1",
  };
}
