// address_to_field: SEP-23 strkey ASCII bytes (NOT the decoded address
// payload) split into little-endian 224-bit lo/hi halves, hashed with
// Poseidon2(DELTA_ADDR=1, lo, hi) over BN254. Must match
// `stellar_tokens::confidential::storage::address_to_field` byte-for-byte or
// every proof built against it is silently rejected on-chain.
//
// Implemented via @aztec/bb.js's native poseidon2Hash rather than a
// hand-ported JS Poseidon2 -- verified byte-for-byte against OpenZeppelin's
// own two committed test vectors (see docs/research/step3b-address-to-field.md)
// before being trusted here. Reuses the same WASM module already bundled for
// proof generation, so this adds no extra bundle weight.

import type { Barretenberg } from "@aztec/bb.js";

const STRKEY_LEN = 56;
const STRKEY_LIMB_LEN = 28;
const DELTA_ADDR = 1n;

let bbSingleton: Promise<Barretenberg> | null = null;

function getBarretenberg(): Promise<Barretenberg> {
  if (!bbSingleton) {
    bbSingleton = import("@aztec/bb.js").then(({ Barretenberg }) => Barretenberg.new({ threads: 1 }));
  }
  return bbSingleton;
}

function leBytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

function strkeyToLoHi(strkey: string): [bigint, bigint] {
  const bytes = new TextEncoder().encode(strkey);
  if (bytes.length !== STRKEY_LEN) {
    throw new Error(`expected a ${STRKEY_LEN}-char strkey, got ${bytes.length} bytes`);
  }
  const lo = leBytesToBigInt(bytes.subarray(0, STRKEY_LIMB_LEN));
  const hi = leBytesToBigInt(bytes.subarray(STRKEY_LIMB_LEN, STRKEY_LEN));
  return [lo, hi];
}

/** Returns the 32-byte big-endian field element as a hex string (no 0x prefix). */
export async function addressToFieldHex(strkey: string): Promise<string> {
  const [lo, hi] = strkeyToLoHi(strkey);
  const [bb, { Fr }] = await Promise.all([getBarretenberg(), import("@aztec/bb.js")]);
  const result = await bb.poseidon2Hash([new Fr(DELTA_ADDR), new Fr(lo), new Fr(hi)]);
  return Buffer.from(result.value).toString("hex");
}

/** Returns the 32-byte big-endian field element as a bigint. */
export async function addressToFieldBigInt(strkey: string): Promise<bigint> {
  const hex = await addressToFieldHex(strkey);
  return BigInt("0x" + hex);
}
