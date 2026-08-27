import { describe, it, expect } from "vitest";
import { parsePositiveBigInt } from "./parseAmount";

describe("parsePositiveBigInt (form validation)", () => {
  it("accepts a plain positive integer string", () => {
    expect(parsePositiveBigInt("500")).toBe(500n);
  });

  it("rejects zero", () => {
    expect(parsePositiveBigInt("0")).toBeNull();
  });

  it("rejects negative numbers", () => {
    expect(parsePositiveBigInt("-5")).toBeNull();
  });

  it("rejects a decimal amount instead of throwing", () => {
    // BigInt("12.5") throws a raw SyntaxError -- this must not propagate.
    expect(() => parsePositiveBigInt("12.5")).not.toThrow();
    expect(parsePositiveBigInt("12.5")).toBeNull();
  });

  it("rejects non-numeric input instead of throwing", () => {
    expect(() => parsePositiveBigInt("abc")).not.toThrow();
    expect(parsePositiveBigInt("abc")).toBeNull();
  });

  it("rejects an empty string instead of throwing", () => {
    expect(() => parsePositiveBigInt("")).not.toThrow();
    expect(parsePositiveBigInt("")).toBeNull();
  });

  it("rejects scientific notation (not a valid BigInt literal)", () => {
    expect(parsePositiveBigInt("1e3")).toBeNull();
  });
});
