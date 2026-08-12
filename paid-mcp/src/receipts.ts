import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type PaymentReceipt = {
  receiptId: string;
  status: "settled" | "demo_settled";
  mode: "live" | "demo";
  toolName: string;
  resource: string;
  payer?: string;
  payTo: string;
  network: string;
  amountAtomic?: string;
  priceDisplay: string;
  settlementId: string;
  transaction?: string;
  paidAt: string;
  agentId?: string;
  proofId?: string;
  extra?: Record<string, unknown>;
};

export class ReceiptStore {
  constructor(private readonly dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  record(partial: Omit<PaymentReceipt, "receiptId" | "paidAt"> & {
    paidAt?: string;
    receiptId?: string;
  }): PaymentReceipt {
    const receipt: PaymentReceipt = {
      receiptId: partial.receiptId ?? randomUUID(),
      paidAt: partial.paidAt ?? new Date().toISOString(),
      ...partial,
    };
    const day = receipt.paidAt.slice(0, 10);
    const path = join(this.dir, `receipts-${day}.jsonl`);
    appendFileSync(path, `${JSON.stringify(receipt)}\n`, "utf8");
    return receipt;
  }
}
