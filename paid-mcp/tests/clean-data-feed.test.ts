import { describe, expect, it } from "vitest";
import { cleanDataFeed } from "../src/tools/clean-data-feed.js";

describe("cleanDataFeed", () => {
  it("returns deterministic rows for same inputs", () => {
    const a = cleanDataFeed({ topic: "agent_commerce", window: "24h", limit: 5 });
    const b = cleanDataFeed({ topic: "agent_commerce", window: "24h", limit: 5 });
    expect(a.rows.map((r) => r.value)).toEqual(b.rows.map((r) => r.value));
    expect(a.rows).toHaveLength(5);
  });

  it("covers all topics", () => {
    for (const topic of [
      "usdc_base",
      "agent_commerce",
      "inference_pricing",
      "social_reputation",
      "x402_volume",
    ] as const) {
      const r = cleanDataFeed({ topic, limit: 3 });
      expect(r.rows).toHaveLength(3);
      expect(r.topic).toBe(topic);
      expect(r.schema_version).toBeTruthy();
    }
  });

  it("clamps reputation scores", () => {
    const r = cleanDataFeed({ topic: "social_reputation", limit: 20 });
    for (const row of r.rows) {
      expect(row.value).toBeGreaterThanOrEqual(0);
      expect(row.value).toBeLessThanOrEqual(100);
    }
  });
});
