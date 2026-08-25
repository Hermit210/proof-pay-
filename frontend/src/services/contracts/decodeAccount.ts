// `ConfidentialAccount`'s `Point` fields (`stellar_contract_utils::crypto::grumpkin::Point`,
// a `BytesN<64>` type alias) have no corresponding UDT entry in the deployed
// contract's spec -- confirmed by reproduction: `stellar-sdk`'s generic
// `Spec.scValToNative` struct decoder throws `Error: no such entry: Point`
// for ANY registered account, even though the raw XDR is a plain
// `scvMap` of `scvBytes`/`scvU32` fields with no UDT nesting at all. This is
// a real, separate bug from the SDK-version mismatch found earlier -- it's a
// contract-spec generation gap, not something a dependency version pin can
// fix. Bypasses the SDK's auto-decoder for this one struct by reading the
// raw ScVal map directly instead of trusting `AssembledTransaction.result`.
// See docs/research/step3c-register-false-success.md.

import { xdr } from "@stellar/stellar-sdk";
import { Buffer } from "buffer";

export interface ConfidentialAccountRaw {
  auditorId: number;
  receivingCommitment: Buffer;
  spendableCommitment: Buffer;
  spendingPublicKey: Buffer;
  viewingPublicKey: Buffer;
}

export function decodeConfidentialAccount(retval: xdr.ScVal): ConfidentialAccountRaw {
  const entries = retval.map();
  if (!entries) throw new Error("confidential_balance result was not a map");

  const fields: Record<string, xdr.ScVal> = {};
  for (const entry of entries) {
    fields[entry.key().sym().toString()] = entry.val();
  }

  return {
    auditorId: fields.auditor_id.u32(),
    receivingCommitment: fields.receiving_commitment.bytes(),
    spendableCommitment: fields.spendable_commitment.bytes(),
    spendingPublicKey: fields.spending_public_key.bytes(),
    viewingPublicKey: fields.viewing_public_key.bytes(),
  };
}
