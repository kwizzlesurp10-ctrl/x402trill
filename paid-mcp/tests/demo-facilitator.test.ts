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
    payTo: "0x0d25A44f74868eCE53B305C97139CF4B62963410",
    maxTimeoutSeconds: 60,
  } as PaymentRequirements;

  it("reports supported kinds", async () => {
    const s = await client.getSupported();
    expect(s.kinds?.length || (s as { kinds: unknown[] }).kinds.length).toBeGreaterThan(0);
  });

  it("rejects authorization to wrong payTo", async () => {
    const payload = buildDemoPaymentPayload({
      accepts: requirements,
      payer: "0xdemo000000000000000000000000000000000099",
    });
    const wrongTo = {
      ...payload,
      payload: {
        ...payload.payload!,
        authorization: {
          ...payload.payload!.authorization!,
          to: "0xAB745e5F576667037696e78ba7dA28E193E4423D",
        },
      },
    };
    const v = await client.verify(wrongTo, requirements);
    expect(v.isValid).toBe(false);
    expect(v.invalidReason).toBe("payto_mismatch");
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
