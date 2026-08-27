import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProveThreshold, fieldHexToBigEndianHex } from "./useProveThreshold";
import { saveWalletState } from "../../services/localWalletState";
import { makeTokenClient, makeThresholdVerifierClient } from "../../services/contracts/clients";
import { confirmTransactionOnChain } from "../../services/contracts/confirmTransaction";

vi.mock("../../services/contracts/clients", () => ({
  makeTokenClient: vi.fn(),
  makeThresholdVerifierClient: vi.fn(),
}));
vi.mock("../../services/contracts/confirmTransaction", () => ({
  confirmTransactionOnChain: vi.fn(),
}));
vi.mock("../../services/contracts/decodeAccount", () => ({
  decodeConfidentialAccount: () => ({
    spendableCommitment: Buffer.alloc(64, 0xaa),
    viewingPublicKey: Buffer.alloc(64, 0xbb),
  }),
}));
vi.mock("../../services/crypto/addressToField", () => ({
  addressToFieldHex: vi.fn().mockResolvedValue("ee".repeat(32)),
}));
vi.mock("../../services/proof/noirProver", () => ({
  CIRCUITS: { balanceThreshold: "balance_threshold" },
  generateProof: vi.fn().mockResolvedValue({
    proof: new Uint8Array([1, 2, 3]),
    publicInputs: new Uint8Array([4, 5, 6]),
  }),
}));
vi.mock("../../services/analytics", () => ({ track: vi.fn(), reportError: vi.fn() }));

const ENV = {} as import("../../services/env").AppEnv;
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
    vi.mocked(makeTokenClient).mockReturnValue({
      confidential_balance: vi.fn().mockRejectedValue(new Error("no network in unit tests")),
    } as unknown as ReturnType<typeof makeTokenClient>);
    vi.mocked(makeThresholdVerifierClient).mockReturnValue({} as unknown as ReturnType<
      typeof makeThresholdVerifierClient
    >);
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

    // confidential_balance rejects in this describe block's setup, so this
    // fails past validation -- the point is only that valid input clears
    // form validation and the registration gate, not that the whole flow
    // completes.
    await act(async () => {
      await result.current.prove("300");
    });

    expect(result.current.error).not.toMatch(/whole number greater than zero/i);
    expect(result.current.error).not.toMatch(/Register and deposit first/i);
  });
});

describe("useProveThreshold on-chain confirmation gating", () => {
  const verifyProof = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    saveWalletState({
      address: ADDR,
      spendingKey: "0x01",
      spendableValue: "500",
      spendableBlinding: "0",
      registered: true,
    });
    verifyProof.mockReset();
    vi.mocked(confirmTransactionOnChain).mockReset();
    vi.mocked(makeTokenClient).mockReturnValue({
      confidential_balance: vi.fn().mockResolvedValue({ simulationData: { result: { retval: {} } } }),
    } as unknown as ReturnType<typeof makeTokenClient>);
    vi.mocked(makeThresholdVerifierClient).mockReturnValue({
      verify_proof: verifyProof,
    } as unknown as ReturnType<typeof makeThresholdVerifierClient>);
  });

  it("only reports 'passed' once the verify_proof transaction is independently confirmed on-chain", async () => {
    vi.mocked(confirmTransactionOnChain).mockResolvedValue(true);
    verifyProof.mockResolvedValue({
      signAndSend: vi.fn().mockResolvedValue({ sendTransactionResponse: { hash: "verify-hash" } }),
      result: { isOk: () => true, unwrap: () => true },
    });

    const { result } = renderHook(() => useProveThreshold(ENV, ADDR));
    await act(async () => {
      await result.current.prove("300");
    });

    expect(confirmTransactionOnChain).toHaveBeenCalledWith(ENV, "verify-hash");
    expect(result.current.stage).toBe("passed");
    expect(result.current.txHash).toBe("verify-hash");
  });

  it("surfaces a real error instead of a false passed/failed result when confirmation fails", async () => {
    vi.mocked(confirmTransactionOnChain).mockRejectedValue(
      new Error("Transaction verify-hash was submitted but failed on-chain."),
    );
    verifyProof.mockResolvedValue({
      signAndSend: vi.fn().mockResolvedValue({ sendTransactionResponse: { hash: "verify-hash" } }),
      result: { isOk: () => true, unwrap: () => true },
    });

    const { result } = renderHook(() => useProveThreshold(ENV, ADDR));
    await act(async () => {
      await result.current.prove("300");
    });

    expect(result.current.stage).toBe("error");
    expect(result.current.error).toMatch(/failed on-chain/i);
  });
});
