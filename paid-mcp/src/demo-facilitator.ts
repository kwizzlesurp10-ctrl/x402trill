import { createHash, randomBytes } from "node:crypto";
import type { FacilitatorClient } from "@x402/core/server";
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  SupportedResponse,
  VerifyResponse,
} from "@x402/core/types";

/**
 * Local facilitator for DEMO_MODE / CI.
 * Accepts any well-formed payment payload that matches requirements scheme+network,
 * never hits chain. Do not use in production.
 */
export class DemoFacilitatorClient implements FacilitatorClient {
  readonly url = "demo://local-facilitator";

  private seen = new Set<string>();

  constructor(private readonly network: string) {}

  async getSupported(): Promise<SupportedResponse> {
    return {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: this.network as PaymentRequirements["network"],
          extra: { demo: true },
        },
      ],
      extensions: [],
      signers: {},
    };
  }

  async verify(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<VerifyResponse> {
    if (!paymentPayload || typeof paymentPayload !== "object") {
      return {
        isValid: false,
        invalidReason: "missing_payload",
        invalidMessage: "Payment payload missing",
      };
    }

    const payload = paymentPayload as PaymentPayload & {
      payload?: { authorization?: { from?: string } };
    };

    const scheme = payload.accepted?.scheme ?? "exact";
    const network = payload.accepted?.network ?? this.network;

    if (scheme !== paymentRequirements.scheme) {
      return {
        isValid: false,
        invalidReason: "scheme_mismatch",
        invalidMessage: `scheme ${scheme} != ${paymentRequirements.scheme}`,
      };
    }
    if (network !== paymentRequirements.network) {
      return {
        isValid: false,
        invalidReason: "network_mismatch",
        invalidMessage: `network ${network} != ${paymentRequirements.network}`,
      };
    }

    const auth = payload.payload?.authorization as { from?: string } | undefined;
    const payer =
      auth?.from ??
      "0xdemo000000000000000000000000000000000001";

    return { isValid: true, payer };
  }

  async settle(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    const verify = await this.verify(paymentPayload, paymentRequirements);
    if (!verify.isValid) {
      return {
        success: false,
        errorReason: verify.invalidReason,
        errorMessage: verify.invalidMessage,
        payer: verify.payer,
        transaction: "",
        network: paymentRequirements.network,
      };
    }

    const proofKey = createHash("sha256")
      .update(JSON.stringify(paymentPayload))
      .digest("hex");
    if (this.seen.has(proofKey)) {
      // Idempotent settle: same tx hash
      return {
        success: true,
        payer: verify.payer,
        transaction: `0xdemo${proofKey.slice(0, 56)}`,
        network: paymentRequirements.network,
      };
    }
    this.seen.add(proofKey);
    const tx = `0xdemo${randomBytes(28).toString("hex")}`;
    return {
      success: true,
      payer: verify.payer,
      transaction: tx,
      network: paymentRequirements.network,
    };
  }
}

/**
 * Build a v2 demo payment payload agents can attach in _meta["x402/payment"]
 * or HTTP PAYMENT-SIGNATURE when DEMO_MODE=true.
 * `accepted` must deep-match server requirements (incl. extra).
 * Not a real EIP-3009 authorization.
 */
export function buildDemoPaymentPayload(opts: {
  accepts: PaymentRequirements;
  payer?: string;
  resourceUrl?: string;
}): PaymentPayload {
  const payer =
    opts.payer ?? "0xdemo000000000000000000000000000000000001";
  const accepted = structuredClone(opts.accepts);
  return {
    x402Version: 2,
    resource: opts.resourceUrl
      ? { url: opts.resourceUrl, description: "", mimeType: "application/json" }
      : undefined,
    accepted,
    payload: {
      signature: `demo-sig-${randomBytes(8).toString("hex")}`,
      authorization: {
        from: payer,
        to: accepted.payTo,
        value: accepted.amount,
        validAfter: "0",
        validBefore: String(Math.floor(Date.now() / 1000) + 3600),
        nonce: `0x${randomBytes(32).toString("hex")}`,
      },
    },
  };
}
