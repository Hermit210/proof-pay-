import { describe, it, expect, beforeEach } from "vitest";
import { loadWalletState, saveWalletState, recordDeposit } from "./localWalletState";

const ADDR = "GBEJY33A5YK22SOU5YACPFXM45UEJ5G27VIDNNLEPUXTKIQBKY4WJEZS";

describe("localWalletState accrual", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts a fresh account's spendable value at the first deposit amount", () => {
    const state = recordDeposit(ADDR, 500n);
    expect(state.spendableValue).toBe("500");
    expect(state.spendableBlinding).toBe("0");
  });

  it("accrues successive deposits by summing, not overwriting", () => {
    recordDeposit(ADDR, 500n);
    recordDeposit(ADDR, 250n);
    const state = recordDeposit(ADDR, 10n);
    expect(state.spendableValue).toBe("760");
  });

  it("persists accrual across independent loads (not just in-memory)", () => {
    recordDeposit(ADDR, 500n);
    recordDeposit(ADDR, 500n);
    const reloaded = loadWalletState(ADDR);
    expect(reloaded?.spendableValue).toBe("1000");
  });

  it("preserves the spending key and registered flag when accruing a later deposit", () => {
    saveWalletState({
      address: ADDR,
      spendingKey: "0xabc123",
      spendableValue: "100",
      spendableBlinding: "0",
      registered: true,
    });
    const state = recordDeposit(ADDR, 50n);
    expect(state.spendingKey).toBe("0xabc123");
    expect(state.registered).toBe(true);
    expect(state.spendableValue).toBe("150");
  });

  it("keeps balances for different addresses fully separate", () => {
    const other = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    recordDeposit(ADDR, 500n);
    recordDeposit(other, 10n);
    expect(loadWalletState(ADDR)?.spendableValue).toBe("500");
    expect(loadWalletState(other)?.spendableValue).toBe("10");
  });

  it("returns null for an address with no recorded state", () => {
    expect(loadWalletState(ADDR)).toBeNull();
  });
});
