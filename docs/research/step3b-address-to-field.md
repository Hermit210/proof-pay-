# `address_to_field`: verified algorithm, for frontend implementers

Date: 2026-08-25

This closes the gap deferred at the end of Step 2. `address_to_field` is, per
OpenZeppelin's own `circuits/CLAUDE.md`, "the one primitive with two independent
implementations" — it has no Noir implementation at all (circuits take `addr_f` as an
opaque public input), so every off-chain prover (a wallet, this repo's tooling, and
eventually ProofPay's frontend) must reproduce the exact same derivation the on-chain
contract computes, or every proof it produces will be rejected.

## The algorithm

```
address_to_field(address) -> Field:
  strkey = address.to_string()          # 56-char ASCII SEP-23 strkey, e.g. "G..." or "C..."
  buf    = ASCII bytes of strkey        # 56 bytes, NOT the decoded/raw address bytes
  lo     = buf[0..28]  interpreted as a little-endian 224-bit integer
  hi     = buf[28..56] interpreted as a little-endian 224-bit integer
  return Poseidon2(DELTA_ADDR=1, lo, hi)   # domain-tagged, width 4 / rate 3 / capacity 1
```

Source (Rust, on-chain, authoritative):
`packages/tokens/src/confidential/storage.rs:1350` (`address_to_field`) +
`:1366` (`le_bytes_to_u256`), in the OpenZeppelin repo pinned at commit
`fbfde388e1b72afa93d6b1c922067879b20e81db`.

**Note what this is not**: it does not base32-decode the strkey to recover the raw
32-byte address payload — it hashes the *ASCII text* of the strkey itself, split into
two 28-byte halves. Getting this distinction wrong is the exact failure mode the "two
independent implementations" warning exists to prevent.

## Verified two ways, not assumed

1. **Against OpenZeppelin's own committed test vectors**
   (`packages/tokens/src/confidential/circuits/lib/testdata/address_to_field.json`) —
   a Rust reimplementation (`contract/tools/address_to_field`, this repo) reproduces both
   vectors exactly (all-zero G-address and all-zero C-address).
2. **Against this project's own live deployed contract.** `proofpay-token`'s real
   deployment transaction (`1aebd9469b8da6d470b16e63f00b6fb90342651019f9e171e723945b09425bab`)
   emitted an `AddressAsFieldSet` event with
   `address_as_field = 0x1f90be7d3b2b34c936c5bd20fa0848d436925b86904d14de1baa85c6a4cfc29a`.
   Running `contract/tools/address_to_field`'s binary against the deployed token
   contract's own address (`CDSZUHSWCLZVPFHTG6556MAEKPUUCH4UKMGOIH7O2KT4UKHW4AJR5Z5Y`)
   reproduces that exact value. This is stronger than matching a synthetic fixture: it's
   the real on-chain state this specific deployment actually stored.

## What this means for the frontend

The frontend needs this same derivation client-side, per connected wallet address, to
build valid Register-circuit public inputs (`addr_f` for the token contract, fixed;
`acct_f` for the connecting user's own address, different per user). Poseidon2 over
BN254 is not something to hand-port into JS from scratch — a subtly wrong round-constant
or parameter choice would silently break registration for every user with no obvious
symptom short of "the proof never verifies." Two real options, not yet decided:

1. Compile a small Rust helper (reusing `soroban-poseidon` exactly, the same crate this
   verification used) to WASM via `wasm-bindgen`, and call it from the frontend — lowest
   risk, reuses code already proven correct twice above, at the cost of one more WASM
   module in the bundle (small; `soroban-poseidon` has no heavy dependencies).
2. Use a JS/WASM Poseidon2-over-BN254 implementation if `@aztec/bb.js` or `noir_js`
   already expose one with matching parameters (unverified as of this writing) — would
   avoid a second WASM module but needs the same two-vector verification this doc just
   did before being trusted.

Recommendation: option 1, given the stakes of getting this wrong silently. Flagged as an
open decision for whoever builds the registration UI, not resolved here.
