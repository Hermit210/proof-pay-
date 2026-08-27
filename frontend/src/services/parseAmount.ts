// `BigInt("12.5")` (or any non-integer string) throws a SyntaxError rather
// than returning a value -- callers must never feed raw form input straight
// into `BigInt()` outside a try/catch, or a decimal amount crashes the
// action instead of showing a validation message.
export function parsePositiveBigInt(input: string): bigint | null {
  try {
    const value = BigInt(input);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}
