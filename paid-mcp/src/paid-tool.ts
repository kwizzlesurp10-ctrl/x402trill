import { createHash } from "node:crypto";
import { createPaymentWrapper } from "@x402/mcp";
import type { PaymentPayload } from "@x402/core/types";
import type { AppConfig } from "./config.js";
import type { BudgetStore } from "./budgets.js";
import { BudgetExceededError } from "./budgets.js";
import type { ReceiptStore } from "./receipts.js";
import type { GatewayPaymentContext } from "./resource-server.js";
import {
  amountAtomicFromAccepts,
  assetFromAccepts,
} from "./resource-server.js";

export function proofIdFromPayload(paymentPayload: PaymentPayload): string {
  return createHash("sha256")
    .update(JSON.stringify(paymentPayload))
    .digest("hex")
    .slice(0, 32);
}

export function payerFromPayload(paymentPayload: PaymentPayload): string {
  const p = paymentPayload as PaymentPayload & {
    payload?: { authorization?: { from?: string } };
    payer?: string;
  };
  return (
    p.payload?.authorization?.from ??
    p.payer ??
    "0xunknown00000000000000000000000000000001"
  );
}

export function createPaidToolWrapper(opts: {
  config: AppConfig;
  payment: GatewayPaymentContext;
  budgets: BudgetStore;
  receipts: ReceiptStore;
  toolName: string;
  description: string;
  tags: string[];
}) {
  const { config, payment, budgets, receipts, toolName, description, tags } =
    opts;
  const amountAtomic = amountAtomicFromAccepts(payment.accepts);
  const asset = assetFromAccepts(payment.accepts);

  return createPaymentWrapper(payment.resourceServer, {
    accepts: payment.accepts,
    resource: {
      url: `mcp://tool/${toolName}`,
      description,
      mimeType: "application/json",
      serviceName: config.serviceName,
      tags,
    },
    hooks: {
      onBeforeExecution: async ({ paymentPayload, arguments: args }) => {
        const payer = payerFromPayload(paymentPayload);
        const proofId = proofIdFromPayload(paymentPayload);
        try {
          budgets.charge(payer, BigInt(amountAtomic), proofId);
          return true;
        } catch (err) {
          if (err instanceof BudgetExceededError) {
            console.warn(
              JSON.stringify({
                level: "warn",
                code: err.code,
                payer: err.payer,
                remainingAtomic: err.remainingAtomic.toString(),
                requiredAtomic: err.requiredAtomic.toString(),
                tool: toolName,
                agentId: (args as { agent_id?: string }).agent_id,
              }),
            );
            return false;
          }
          throw err;
        }
      },
      onAfterSettlement: async ({
        settlement,
        paymentPayload,
        arguments: args,
      }) => {
        const payer = settlement.payer ?? payerFromPayload(paymentPayload);
        const receipt = receipts.record({
          status: payment.mode === "demo" ? "demo_settled" : "settled",
          mode: payment.mode,
          toolName,
          resource: `mcp://tool/${toolName}`,
          payer,
          payTo: config.payTo,
          network: config.network,
          amountAtomic,
          priceDisplay: config.price,
          settlementId:
            settlement.transaction || proofIdFromPayload(paymentPayload),
          transaction: settlement.transaction,
          agentId: (args as { agent_id?: string }).agent_id,
          proofId: proofIdFromPayload(paymentPayload),
          extra: {
            asset,
            success: settlement.success,
          },
        });
        console.info(
          JSON.stringify({
            level: "info",
            event: "settlement",
            tool: toolName,
            receiptId: receipt.receiptId,
            payer: receipt.payer,
            tx: receipt.transaction,
            mode: receipt.mode,
          }),
        );
      },
    },
  });
}

export function billingBlock(
  config: AppConfig,
  payment: GatewayPaymentContext,
  toolName: string,
  amountAtomic: string,
) {
  return {
    price: config.price,
    amountAtomic,
    network: config.network,
    payTo: config.payTo,
    mode: payment.mode,
    resource: `mcp://tool/${toolName}`,
  };
}
