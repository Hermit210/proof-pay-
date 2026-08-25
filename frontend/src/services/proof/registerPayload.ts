// Builds the XDR-encoded `data: Bytes` argument `ConfidentialToken::register`
// expects. `RegisterPayload`/`RegisterData` never appear in the contract's
// public interface spec (the entry point signature is opaque `Bytes`), so
// the generated TS bindings have no typed encoder for them -- this is
// hand-built against the real wire format, verified byte-for-byte against
// `contract/tools/register_payload` (the Rust reference implementation,
// which itself uses the real `stellar_tokens::confidential::{RegisterPayload,
// RegisterData}` types) before being trusted here:
//
//   RegisterData = sortedMap{ "payload": sortedMap{ "pvk": Bytes(64), "y": Bytes(64) },
//                             "proof": Bytes(N) }
//
// Soroban's #[contracttype] struct encoding sorts map keys alphabetically
// ("pvk" < "y", "payload" < "proof"), not by declaration order -- getting
// this wrong produces a payload that silently fails to decode on-chain.

import { xdr } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";

function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "").padStart(64, "0");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function fieldPairToPoint(xHex: string, yHex: string): Uint8Array {
  const point = new Uint8Array(64);
  point.set(hexToBytes32(xHex), 0);
  point.set(hexToBytes32(yHex), 32);
  return point;
}

export function buildRegisterData(params: {
  yX: string;
  yY: string;
  pvkX: string;
  pvkY: string;
  proof: Uint8Array;
}): Uint8Array {
  const yPoint = fieldPairToPoint(params.yX, params.yY);
  const pvkPoint = fieldPairToPoint(params.pvkX, params.pvkY);

  const payload = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("pvk"),
      val: xdr.ScVal.scvBytes(Buffer.from(pvkPoint)),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("y"),
      val: xdr.ScVal.scvBytes(Buffer.from(yPoint)),
    }),
  ]);

  const registerData = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("payload"),
      val: payload,
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("proof"),
      val: xdr.ScVal.scvBytes(Buffer.from(params.proof)),
    }),
  ]);

  return registerData.toXDR();
}
