import { describe, it, expect, beforeEach } from "vitest";
import { loadHistory, appendHistory } from "./history";

const ADDR = "GBEJY33A5YK22SOU5YACPFXM45UEJ5G27VIDNNLEPUXTKIQBKY4WJEZS";

describe("history log", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty list for an address with no activity", () => {
    expect(loadHistory(ADDR)).toEqual([]);
  });

  it("records a real entry with a genuine tx hash", () => {
    appendHistory(ADDR, { kind: "register", txHash: "abc123" });
    const [entry] = loadHistory(ADDR);
    expect(entry.kind).toBe("register");
    expect(entry.txHash).toBe("abc123");
    expect(typeof entry.timestamp).toBe("number");
    expect(entry.id).toBeTruthy();
  });

  it("orders entries most-recent-first regardless of insertion order", () => {
    appendHistory(ADDR, { kind: "register", txHash: "first" });
    appendHistory(ADDR, { kind: "deposit", txHash: "second", amount: "500" });
    appendHistory(ADDR, { kind: "prove_passed", txHash: "third", threshold: "300" });

    const entries = loadHistory(ADDR);
    expect(entries.map((e) => e.txHash)).toEqual(["third", "second", "first"]);
  });

  it("allows a null tx hash (the SDK genuinely didn't surface one) without dropping the entry", () => {
    appendHistory(ADDR, { kind: "prove_failed", txHash: null, threshold: "1000" });
    const [entry] = loadHistory(ADDR);
    expect(entry.txHash).toBeNull();
    expect(entry.threshold).toBe("1000");
  });

  it("never mixes entries between different addresses", () => {
    const other = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    appendHistory(ADDR, { kind: "register", txHash: "mine" });
    appendHistory(other, { kind: "register", txHash: "theirs" });

    expect(loadHistory(ADDR).map((e) => e.txHash)).toEqual(["mine"]);
    expect(loadHistory(other).map((e) => e.txHash)).toEqual(["theirs"]);
  });
});
