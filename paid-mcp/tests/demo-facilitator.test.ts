import { describe, expect, it } from "vitest";
import {
  DemoFacilitatorClient,
  buildDemoPaymentPayload,
} from "../src/demo-facilitator.js";
import type { PaymentRequirements } from "@x402/core/types";

describe("DemoFacilitatorClient", () => {
  const network = "eip155:84532";
  const client = new DemoFacilitatorClient(network);

  const requirements = {
    scheme: "exact",
    network,
    amount: "1000",
    asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    payTo: "0x0000000000000000000000000000000000000a01",
    maxTimeoutSeconds: 60,
  } as PaymentRequirements;

  it("reports supported kinds", async () => {
    const s = await client.getSupported();
    expect(s.kinds?.length || (s as { kinds: unknown[] }).kinds.length).toBeGreaterThan(0);
  });

  it("verifies and settles demo payloads", async () => {
    const payload = buildDemoPaymentPayload({
      accepts: requirements,
      payer: "0xdemo000000000000000000000000000000000099",
    });
    const v = await client.verify(payload, requirements);
    expect(v.isValid).toBe(true);
    const s = await client.settle(payload, requirements);
    expect(s.success).toBe(true);
    expect(s.transaction).toMatch(/^0xdemo/);
    expect(payload.accepted.amount).toBe("1000");
  });
});
