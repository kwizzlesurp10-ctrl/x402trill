/** Keith's Coinbase Base Account — canonical x402 payee (USDC on Base mainnet). */
export const DEFAULT_PAY_TO = "0x0d25A44f74868eCE53B305C97139CF4B62963410";

/** Retired payee — key holder unknown; must never be configured. */
export const RETIRED_PAY_TO = "0xAB745e5F576667037696e78ba7dA28E193E4423D";

export const DEFAULT_NETWORK = "eip155:8453";

export const USDC_BY_NETWORK: Record<string, string> = {
  "eip155:8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "eip155:84532": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

export function usdcAssetForNetwork(network: string): string {
  return USDC_BY_NETWORK[network] ?? USDC_BY_NETWORK[DEFAULT_NETWORK]!;
}

export function resolvePayToFromEnv(): string {
  const raw =
    process.env.X402_PAY_TO?.trim() ||
    process.env.PAY_TO?.trim() ||
    DEFAULT_PAY_TO;
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return DEFAULT_PAY_TO;
  }
  if (raw.toLowerCase() === RETIRED_PAY_TO.toLowerCase()) {
    throw new Error(
      `PAY_TO/X402_PAY_TO is the retired address ${RETIRED_PAY_TO}. Use ${DEFAULT_PAY_TO} instead.`,
    );
  }
  return raw;
}
