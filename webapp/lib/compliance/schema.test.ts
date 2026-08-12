import { describe, expect, it } from "vitest";
import { complianceSchema } from "./schema";

describe("complianceSchema", () => {
  it("accepts valid payload", () => {
    const r = complianceSchema.safeParse({
      businessName: "Acme Cafe",
      industry: "restaurant",
      employeeCount: 7,
      annualRevenue: 120000,
      hasEmployeesInMN: true,
      offersBenefits: false,
      handlesPersonalData: true,
      sellsPhysicalGoods: true,
    });
    expect(r.success).toBe(true);
  });

  it("rejects short businessName", () => {
    const r = complianceSchema.safeParse({
      businessName: "A",
      industry: "retail",
      employeeCount: 1,
      annualRevenue: 50000,
      hasEmployeesInMN: true,
      offersBenefits: false,
      handlesPersonalData: false,
      sellsPhysicalGoods: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range employees", () => {
    const r = complianceSchema.safeParse({
      businessName: "Big Corp",
      industry: "retail",
      employeeCount: 20000,
      annualRevenue: 1000000,
      hasEmployeesInMN: true,
      offersBenefits: true,
      handlesPersonalData: false,
      sellsPhysicalGoods: true,
    });
    expect(r.success).toBe(false);
  });
});
