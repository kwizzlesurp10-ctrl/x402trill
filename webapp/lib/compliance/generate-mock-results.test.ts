import { describe, expect, it } from "vitest";
import { generateMockResults } from "./generate-mock-results";
import type { ComplianceInput } from "./types";

const base: ComplianceInput = {
  businessName: "Test Biz",
  industry: "retail",
  employeeCount: 3,
  annualRevenue: 100000,
  hasEmployeesInMN: true,
  offersBenefits: false,
  handlesPersonalData: false,
  sellsPhysicalGoods: true,
};

describe("generateMockResults", () => {
  it("produces results with overallScore in expected band and checklist", () => {
    const r = generateMockResults({ ...base, industry: "retail" });
    expect(r.overallScore).toBeGreaterThanOrEqual(58);
    expect(r.overallScore).toBeLessThanOrEqual(96);
    expect(r.checklist.length).toBeGreaterThan(0);
  });

  it("uses food/restaurant specific checklist items for food industries", () => {
    const r = generateMockResults({ ...base, industry: "food truck" });
    const hasFoodHandler = r.checklist.some((i) => i.requirement.includes("Food Handler"));
    expect(hasFoodHandler).toBe(true);
  });

  it("returns recommendations array", () => {
    const r = generateMockResults(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
