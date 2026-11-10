import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import {
  DEFAULT_PAY_TO,
  usdcAssetForNetwork,
} from "../src/payment-defaults.js";
import {
  amountAtomicFromAccepts,
  assetFromAccepts,
  createGatewayPaymentContext,
} from "../src/resource-server.js";

describe("x402 payment challenge", () => {
  it("builds accepts with Keith payTo, Base network, and Base USDC", async () => {
    const config = loadConfig();
    const ctx = await createGatewayPaymentContext({
      ...config,
      demoMode: true,
      payTo: DEFAULT_PAY_TO,
      network: "eip155:8453",
    });
    const accepted = ctx.accepts[0]!;
    expect(accepted.payTo).toBe(DEFAULT_PAY_TO);
    expect(accepted.network).toBe("eip155:8453");
    expect(accepted.scheme).toBe("exact");
    const asset = assetFromAccepts(ctx.accepts, config.network);
    expect(asset).toBe(usdcAssetForNetwork("eip155:8453"));
    expect(BigInt(amountAtomicFromAccepts(ctx.accepts))).toBeGreaterThan(0n);
  });
});
