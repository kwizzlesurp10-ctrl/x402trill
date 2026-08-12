import type { AppConfig } from "./config.js";

export class BudgetExceededError extends Error {
  readonly code = "BUDGET_EXCEEDED" as const;
  constructor(
    public readonly payer: string,
    public readonly remainingAtomic: bigint,
    public readonly requiredAtomic: bigint,
  ) {
    super(
      `Agent budget exceeded for ${payer}: need ${requiredAtomic} atomic, remaining ${remainingAtomic}`,
    );
    this.name = "BudgetExceededError";
  }
}

/**
 * In-memory per-payer spend tracker.
 * Survives process lifetime only — swap for Redis/DB in multi-instance deploys.
 */
export class BudgetStore {
  private spent = new Map<string, bigint>();

  constructor(private readonly config: AppConfig) {}

  private key(payer: string): string {
    return payer.toLowerCase();
  }

  limit(payer: string): bigint {
    const k = this.key(payer);
    return (
      this.config.agentBudgets.get(k) ?? this.config.defaultAgentBudgetAtomic
    );
  }

  spentOf(payer: string): bigint {
    return this.spent.get(this.key(payer)) ?? 0n;
  }

  remaining(payer: string): bigint {
    return this.limit(payer) - this.spentOf(payer);
  }

  /**
   * Reserve spend. Throws BudgetExceededError if over limit.
   * Idempotent for the same paymentProofId within process.
   */
  private seenProofs = new Set<string>();

  charge(
    payer: string,
    amountAtomic: bigint,
    paymentProofId: string,
  ): { remainingAtomic: bigint; spentAtomic: bigint } {
    if (this.seenProofs.has(paymentProofId)) {
      return {
        remainingAtomic: this.remaining(payer),
        spentAtomic: this.spentOf(payer),
      };
    }
    const rem = this.remaining(payer);
    if (amountAtomic > rem) {
      throw new BudgetExceededError(payer, rem, amountAtomic);
    }
    const k = this.key(payer);
    this.spent.set(k, this.spentOf(payer) + amountAtomic);
    this.seenProofs.add(paymentProofId);
    return {
      remainingAtomic: this.remaining(payer),
      spentAtomic: this.spentOf(payer),
    };
  }

  snapshot(payer: string) {
    return {
      payer,
      limitAtomic: this.limit(payer).toString(),
      spentAtomic: this.spentOf(payer).toString(),
      remainingAtomic: this.remaining(payer).toString(),
    };
  }
}
