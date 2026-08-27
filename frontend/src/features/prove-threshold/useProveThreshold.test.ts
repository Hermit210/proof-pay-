import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProveThreshold, fieldHexToBigEndianHex } from "./useProveThreshold";
import { saveWalletState } from "../../services/localWalletState";
import type { AppEnv } from "../../services/env";

// Never let a validation test reach the real Stellar SDK / network --
// only the parsing + registration gate above it is under test here.
vi.mock("../../services/contracts/clients", () => ({
  makeTokenClient: () => ({
    confidential_balance: vi.fn().mockRejectedValue(new Error("no network in unit tests")),
  }),
  makeThresholdVerifierClient: () => ({}),
}));
vi.mock("../../services/analytics", () => ({ track: vi.fn(), reportError: vi.fn() }));

const ENV = {} as AppEnv;
const ADDR = "GBEJY33A5YK22SOU5YACPFXM45UEJ5G27VIDNNLEPUXTKIQBKY4WJEZS";

describe("fieldHexToBigEndianHex", () => {
  it("strips the 0x prefix and left-pads to 64 hex chars", () => {
    expect(fieldHexToBigEndianHex("0xab")).toBe("0".repeat(62) + "ab");
  });

  it("leaves an already-64-char hex value unchanged apart from the prefix", () => {
    const full = "a".repeat(64);
    expect(fieldHexToBigEndianHex("0x" + full)).toBe(full);
  });
});

describe("useProveThreshold form validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("rejects a decimal threshold with a message instead of crashing", async () => {
    const { result } = renderHook(() => useProveThreshold(ENV, ADDR));

    await act(async () => {
      await result.current.prove("12.5");
    });

    expect(result.current.stage).toBe("error");
    expect(result.current.error).toMatch(/whole number greater than zero/i);
  });

  it("rejects non-numeric input instead of crashing", async () => {
    const { result } = renderHook(() => useProveThreshold(ENV, ADDR));

    await act(async () => {
      await result.current.prove("abc");
    });

    expect(result.current.stage).toBe("error");
    expect(result.current.error).toMatch(/whole number greater than zero/i);
  });

  it("requires registration before checking a valid threshold", async () => {
    const { result } = renderHook(() => useProveThreshold(ENV, ADDR));

    await act(async () => {
      await result.current.prove("300");
    });

    expect(result.current.stage).toBe("error");
    expect(result.current.error).toMatch(/Register and deposit first/i);
  });

  it("proceeds past validation once registered (reaches the balance-reading stage)", async () => {
    saveWalletState({
      address: ADDR,
      spendingKey: "0x01",
      spendableValue: "500",
      spendableBlinding: "0",
      registered: true,
    });
    const { result } = renderHook(() => useProveThreshold(ENV, ADDR));

    // No contract client is mocked here, so this will fail once it reaches
    // the network call -- the point of this test is only that valid input
    // clears form validation and the registration gate, not that the whole
    // on-chain flow completes.
    await act(async () => {
      await result.current.prove("300");
    });

    expect(result.current.error).not.toMatch(/whole number greater than zero/i);
    expect(result.current.error).not.toMatch(/Register and deposit first/i);
  });
});
