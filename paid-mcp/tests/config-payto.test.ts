import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PAY_TO,
  RETIRED_PAY_TO,
  resolvePayToFromEnv,
} from "../src/payment-defaults.js";
import { loadConfig } from "../src/config.js";

const keys = ["X402_PAY_TO", "PAY_TO", "NETWORK"] as const;

afterEach(() => {
  for (const key of keys) {
    delete process.env[key];
  }
});

describe("resolvePayToFromEnv", () => {
  it("defaults to Keith's Base Account when unset", () => {
    delete process.env.X402_PAY_TO;
    delete process.env.PAY_TO;
    expect(resolvePayToFromEnv()).toBe(DEFAULT_PAY_TO);
  });

  it("prefers X402_PAY_TO over PAY_TO", () => {
    process.env.PAY_TO = "0x1111111111111111111111111111111111111111";
    process.env.X402_PAY_TO = DEFAULT_PAY_TO;
    expect(resolvePayToFromEnv()).toBe(DEFAULT_PAY_TO);
  });

  it("rejects the retired payee address", () => {
    process.env.PAY_TO = RETIRED_PAY_TO;
    expect(() => resolvePayToFromEnv()).toThrow(/retired address/i);
  });
});

describe("loadConfig", () => {
  it("advertises Keith payTo on default network Base mainnet", () => {
    delete process.env.X402_PAY_TO;
    delete process.env.PAY_TO;
    delete process.env.NETWORK;
    const cfg = loadConfig();
    expect(cfg.payTo).toBe(DEFAULT_PAY_TO);
    expect(cfg.network).toBe("eip155:8453");
  });
});
