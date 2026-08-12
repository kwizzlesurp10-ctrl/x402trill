import { describe, expect, it } from "vitest";
import { routeInference } from "../src/tools/route-inference.js";

describe("routeInference", () => {
  it("routes short classify tasks to nano/cheap models", () => {
    const r = routeInference({ task: "classify this label as spam or ham" });
    expect(r.selected.tier).toMatch(/nano|small/);
    expect(r.selected.est_cost_usd).toBeLessThan(0.01);
    expect(r.complexity).toBeLessThanOrEqual(2);
  });

  it("escalates hard multi-step tasks", () => {
    const r = routeInference({
      task: "Architect a multi-step security audit refactor of the entire payment gateway with formal proof notes",
    });
    expect(["medium", "large"]).toContain(r.selected.tier);
  });

  it("respects max_cost_usd", () => {
    const r = routeInference({
      task: "implement a typescript parser",
      max_cost_usd: 0.0003,
    });
    expect(r.selected.est_cost_usd).toBeLessThanOrEqual(0.0003);
  });

  it("filters require_tools", () => {
    const r = routeInference({
      task: "call tools to fetch weather",
      require_tools: true,
    });
    expect(r.selected.tools).toBe(true);
  });
});
