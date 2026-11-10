import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type FacilitatorClient,
} from "@x402/core/server";
import type { PaymentRequirements } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { AppConfig } from "./config.js";
import { DemoFacilitatorClient } from "./demo-facilitator.js";
import { usdcAssetForNetwork } from "./payment-defaults.js";

export type GatewayPaymentContext = {
  resourceServer: x402ResourceServer;
  accepts: PaymentRequirements[];
  facilitator: FacilitatorClient;
  mode: "demo" | "live";
};

export async function createGatewayPaymentContext(
  config: AppConfig,
): Promise<GatewayPaymentContext> {
  const facilitator: FacilitatorClient = config.demoMode
    ? new DemoFacilitatorClient(config.network)
    : new HTTPFacilitatorClient({ url: config.facilitatorUrl });

  const resourceServer = new x402ResourceServer(facilitator);
  resourceServer.register(
    config.network as PaymentRequirements["network"],
    new ExactEvmScheme(),
  );

  try {
    await resourceServer.initialize();
  } catch (err) {
    if (!config.demoMode) {
      const e = err as Error;
      throw new Error(
        `Facilitator initialize failed (${config.facilitatorUrl}): ${e.message}. Set DEMO_MODE=true for local, or fix FACILITATOR_URL/network.`,
        { cause: err },
      );
    }
    // Demo: initialize may still work via getSupported; if not, rethrow
    throw err;
  }

  const accepts = await resourceServer.buildPaymentRequirements({
    scheme: "exact",
    network: config.network as PaymentRequirements["network"],
    payTo: config.payTo,
    price: config.price,
    maxTimeoutSeconds: 60,
  });

  if (!accepts.length) {
    throw new Error(
      "buildPaymentRequirements returned empty accepts — check network registration and facilitator support",
    );
  }

  return {
    resourceServer,
    accepts,
    facilitator,
    mode: config.demoMode ? "demo" : "live",
  };
}

export function amountAtomicFromAccepts(accepts: PaymentRequirements[]): string {
  const a = accepts[0] as PaymentRequirements & { amount?: string; maxAmountRequired?: string };
  return a.amount ?? a.maxAmountRequired ?? "1000";
}

export function assetFromAccepts(
  accepts: PaymentRequirements[],
  networkFallback?: string,
): string {
  const a = accepts[0] as PaymentRequirements & { asset?: string };
  if (a.asset) return a.asset;
  const network =
    a.network ??
    (networkFallback as PaymentRequirements["network"] | undefined);
  return usdcAssetForNetwork(network ?? "eip155:8453");
}
