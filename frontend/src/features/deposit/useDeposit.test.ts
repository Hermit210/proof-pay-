import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeposit } from "./useDeposit";
import { confirmTransactionOnChain } from "../../services/contracts/confirmTransaction";
import type { AppEnv } from "../../services/env";

const signAndSend = vi.fn().mockResolvedValue({ sendTransactionResponse: { hash: "deposit-hash" } });
const deposit = vi.fn().mockReturnValue({ signAndSend });
const merge = vi.fn().mockReturnValue({ signAndSend: vi.fn().mockResolvedValue({}) });

vi.mock("../../services/contracts/clients", () => ({
  makeTokenClient: () => ({ deposit, merge }),
}));
vi.mock("../../services/contracts/confirmTransaction", () => ({
  confirmTransactionOnChain: vi.fn().mockResolvedValue(true),
}));
vi.mock("../../services/analytics", () => ({ track: vi.fn(), reportError: vi.fn() }));

const ENV = {} as AppEnv;
const ADDR = "GBEJY33A5YK22SOU5YACPFXM45UEJ5G27VIDNNLEPUXTKIQBKY4WJEZS";

describe("useDeposit form validation", () => {
  beforeEach(() => {
    localStorage.clear();
    deposit.mockClear();
    vi.mocked(confirmTransactionOnChain).mockReset();
    vi.mocked(confirmTransactionOnChain).mockResolvedValue(true);
  });

  it("rejects a decimal amount with a message instead of crashing", async () => {
    const { result } = renderHook(() => useDeposit(ENV, ADDR));

    await act(async () => {
      await result.current.deposit("12.5");
    });

    expect(result.current.stage).toBe("idle");
    expect(result.current.error).toMatch(/whole number greater than zero/i);
    expect(deposit).not.toHaveBeenCalled();
  });

  it("rejects zero and negative amounts without submitting a transaction", async () => {
    const { result } = renderHook(() => useDeposit(ENV, ADDR));

    await act(async () => {
      await result.current.deposit("0");
    });
    expect(result.current.error).toMatch(/greater than zero/i);

    await act(async () => {
      await result.current.deposit("-5");
    });
    expect(result.current.error).toMatch(/greater than zero/i);
    expect(deposit).not.toHaveBeenCalled();
  });

  it("submits a real deposit for a valid whole-number amount", async () => {
    const { result } = renderHook(() => useDeposit(ENV, ADDR));

    await act(async () => {
      await result.current.deposit("500");
    });

    expect(deposit).toHaveBeenCalledWith({ from: ADDR, to: ADDR, amount: 500n });
    expect(result.current.stage).toBe("done");
    expect(result.current.error).toBeNull();
  });

  it("independently confirms both the deposit and merge transactions on-chain before reporting success", async () => {
    const { result } = renderHook(() => useDeposit(ENV, ADDR));

    await act(async () => {
      await result.current.deposit("500");
    });

    // Never trust signAndSend() resolving alone -- both submitted
    // transactions must be independently re-verified by hash.
    expect(confirmTransactionOnChain).toHaveBeenCalledWith(ENV, "deposit-hash");
    expect(result.current.stage).toBe("done");
  });

  it("surfaces a real error instead of false success when on-chain confirmation fails", async () => {
    vi.mocked(confirmTransactionOnChain).mockRejectedValueOnce(new Error("Transaction deposit-hash was submitted but failed on-chain."));
    const { result } = renderHook(() => useDeposit(ENV, ADDR));

    await act(async () => {
      await result.current.deposit("500");
    });

    expect(result.current.stage).toBe("error");
    expect(result.current.error).toMatch(/failed on-chain/i);
  });
});
