import { describe, expect, it } from "vitest";
import { BudgetStore, BudgetExceededError } from "../src/budgets.js";
import type { AppConfig } from "../src/config.js";

const baseConfig = {
  defaultAgentBudgetAtomic: 5000n,
  agentBudgets: new Map<string, bigint>(),
} as AppConfig;

describe("BudgetStore", () => {
  it("charges until limit then throws BUDGET_EXCEEDED", () => {
    const store = new BudgetStore(baseConfig);
    store.charge("0xABC", 3000n, "p1");
    store.charge("0xabc", 2000n, "p2");
    expect(store.remaining("0xABC")).toBe(0n);
    expect(() => store.charge("0xABC", 1n, "p3")).toThrow(BudgetExceededError);
  });

  it("is idempotent for same payment proof", () => {
    const store = new BudgetStore(baseConfig);
    store.charge("0x1", 1000n, "same");
    store.charge("0x1", 1000n, "same");
    expect(store.spentOf("0x1")).toBe(1000n);
  });

  it("supports per-agent overrides", () => {
    const cfg = {
      ...baseConfig,
      agentBudgets: new Map([["0xvip", 100n]]),
    } as AppConfig;
    const store = new BudgetStore(cfg);
    expect(store.limit("0xvip")).toBe(100n);
    expect(store.limit("0xother")).toBe(5000n);
  });
});
