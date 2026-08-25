# ProofPay — Testnet Deployment Record

Deployed 2026-08-25, Stellar testnet, deployer account
`GBZBXZMFWV3HNCTWJXZPJSUMKB7XFZU3SXNR2TA22ZKKIZEXHPLCN5EC`.

## Contracts

| Contract | Address | Stellar Expert |
|:---|:---|:---|
| `proofpay-threshold-verifier` | `CCIZWGDUTKWELJWHGRM2DSWBOW247RS75POK4FTHIRU6OGYHDCR4JM34` | [view](https://stellar.expert/explorer/testnet/contract/CCIZWGDUTKWELJWHGRM2DSWBOW247RS75POK4FTHIRU6OGYHDCR4JM34) |
| `proofpay-auditor` | `CCQNLPV2B2NV6SJCWZZ5EQF6ZV6IU7O5SMAY5ILUGJV7SB7XLLYPYIXO` | [view](https://stellar.expert/explorer/testnet/contract/CCQNLPV2B2NV6SJCWZZ5EQF6ZV6IU7O5SMAY5ILUGJV7SB7XLLYPYIXO) |
| `proofpay-verifier` | `CCWMZNZQ2IQDLI7CSJWEARBZW47WBN4NL5PUXV52SJG7RCZ5CSTXS26Z` | [view](https://stellar.expert/explorer/testnet/contract/CCWMZNZQ2IQDLI7CSJWEARBZW47WBN4NL5PUXV52SJG7RCZ5CSTXS26Z) |
| `proofpay-token` | `CDSZUHSWCLZVPFHTG6556MAEKPUUCH4UKMGOIH7O2KT4UKHW4AJR5Z5Y` | [view](https://stellar.expert/explorer/testnet/contract/CDSZUHSWCLZVPFHTG6556MAEKPUUCH4UKMGOIH7O2KT4UKHW4AJR5Z5Y) |
| Underlying asset (native XLM SAC, reused existing) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [view](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |

`proofpay-token` was constructed with `underlying_asset` = the native SAC above,
`verifier` = `proofpay-verifier`, `auditor` = `proofpay-auditor`.

## Real transactions

| What | Tx hash | Stellar Expert | Result |
|:---|:---|:---|:---|
| Register the real Register-circuit VK with `proofpay-verifier` (`circuit_type=0`) | `382e81d65f9ac5ffa5d0187a1e03a6b3ce5e96c273188b9508b05985b750c51c` | [view](https://stellar.expert/explorer/testnet/tx/382e81d65f9ac5ffa5d0187a1e03a6b3ce5e96c273188b9508b05985b750c51c) | `VerificationKeyRegistered` event, `circuit_type: 0` |
| Deploy `proofpay-token` | `1aebd9469b8da6d470b16e63f00b6fb90342651019f9e171e723945b09425bab` | [view](https://stellar.expert/explorer/testnet/tx/1aebd9469b8da6d470b16e63f00b6fb90342651019f9e171e723945b09425bab) | Deployed |
| **`proofpay-threshold-verifier.verify_proof` with a real UltraHonk proof** | `4ee04bee8559c4050182a27632a1c32b11b53aadae20b622fc4287797bd34d51` | [view](https://stellar.expert/explorer/testnet/tx/4ee04bee8559c4050182a27632a1c32b11b53aadae20b622fc4287797bd34d51) | `true` |

The third row is ProofPay's actual core deliverable, running for real on a public
network: a genuine zero-knowledge proof (the same `tests/fixtures/{proof_success,
public_inputs_success,vk}` used in the automated test suite — witness `sk=1, addr_f=1,
v_s=500, r_s=7, threshold=300`, i.e. "spendable balance is 500, prove it's ≥ 300 without
revealing 500") verified on-chain by real UltraHonk verification, returning `true`. The
Register VK registered above is the real one extracted from OpenZeppelin's own compiled
circuit (`circuits/vks/register.vk.json`'s source, re-derived in raw-bytes format via
`bb write_vk` since the committed JSON is a diff-friendly fields format, not the raw
bytes `ultrahonk_soroban_verifier` consumes) — not a placeholder.

Real measured on-chain cost for the `verify_proof` call above (via
`env.cost_estimate().budget()` in the automated test suite, same circuit/proof/VK):
**57,350,741 CPU instructions**, comfortably within Soroban's ~100M/tx budget. See
`docs/research/step1-confidential-token-research.md` for the full measurement.

## The full chain, connected and real

The gap noted above (a full `register()` → `deposit()` → `merge()` → threshold-proof
flow through the *live* `proofpay-token` contract) is now closed. `address_to_field`
(SEP-23 strkey, ASCII bytes not decoded payload, little-endian 28-byte lo/hi limbs,
Poseidon2-domain-tagged — see `docs/research/step3b-address-to-field.md` for the full
derivation, verified against OpenZeppelin's own test vectors before being trusted here)
produced the real `addr_f`/`acct_f` values fed into a genuine Register-circuit proof,
generated for a fresh testnet account (`GBEJY33A5YK22SOU5YACPFXM45UEJ5G27VIDNNLEPUXTKIQBKY4WJEZS`)
via the same pinned toolchain used throughout (`nargo 1.0.0-beta.9`, `bb 0.87.0`). The
resulting circuit's VK was confirmed byte-for-byte identical to OpenZeppelin's own
`register.vk.json` (already registered on-chain) before trusting it.

| Step | Tx hash | Stellar Expert | Result |
|:---|:---|:---|:---|
| Register `auditor_id=0` on `proofpay-auditor` (canonical Grumpkin generator `G`, structural — not cryptographically load-bearing for v1) | `2047bf3b28d04dc2c2360214de9b02f59b089199dafe1079a49348e4f6950f22` | [view](https://stellar.expert/explorer/testnet/tx/2047bf3b28d04dc2c2360214de9b02f59b089199dafe1079a49348e4f6950f22) | `AuditorRegistered` |
| **`register()`** with a real Register-circuit proof | `1aea5f32156d38bf6dc7d27c1b3a96d95a4360c8d1eb5136501c759dc092a528` | [view](https://stellar.expert/explorer/testnet/tx/1aea5f32156d38bf6dc7d27c1b3a96d95a4360c8d1eb5136501c759dc092a528) | `Register` event; on-chain `spending_public_key`/`viewing_public_key` confirmed to match the proven values exactly |
| `deposit(500)` | `bdd9e3910f810a546e23471bbd96b56c61be19a81c753e0f03ef2d26eb2d2beb` | [view](https://stellar.expert/explorer/testnet/tx/bdd9e3910f810a546e23471bbd96b56c61be19a81c753e0f03ef2d26eb2d2beb) | `Deposit` event, `receiving_commitment` becomes `500·G` |
| `merge()` | `faf362bee44012a9e53389a0804e695ecdae7165cfa605c135296d416ff4dfc7` | [view](https://stellar.expert/explorer/testnet/tx/faf362bee44012a9e53389a0804e695ecdae7165cfa605c135296d416ff4dfc7) | `Merge` event; `spendable_commitment` becomes `500·G`, `receiving_commitment` resets to identity |
| **`proofpay-threshold-verifier.verify_proof`**, a real proof that this account's *actual on-chain* spendable balance is ≥ 300 | `0e02c9617c97e6f8b3450a4a085977de2d4d5a410b61abccd24e590f0d2848c8` | [view](https://stellar.expert/explorer/testnet/tx/0e02c9617c97e6f8b3450a4a085977de2d4d5a410b61abccd24e590f0d2848c8) | `true` |

The last row is the complete, connected product flow, not an isolated demonstration: the
proof's public inputs (`c_spend_x`, `c_spend_y`) were computed as `commit(v_s=500,
r_s=0)` and checked to match the account's real on-chain `spendable_commitment` — read
back via `confidential_balance` after the real `deposit`+`merge` above — byte-for-byte
before the proof was ever generated. This also confirms, against real chain state rather
than assumption, that a deposit's zero-blinding opening survives `merge()` unchanged and
that the vendored `commit` gadget matches the on-chain Pedersen scheme exactly.

`register()`'s XDR payload was built by `contract/tools/register_payload`, which reuses
the real `stellar_tokens::confidential::{RegisterPayload, RegisterData}` types rather
than hand-rolling the wire format — see that tool's doc comment for the exact `Point =
BytesN<64>` layout.

## Reproducing the deployment

```bash
cd contract
stellar contract build --package proofpay-threshold-verifier --package proofpay-auditor \
  --package proofpay-verifier --package proofpay-token

# threshold_verifier (immutable VK, deploy first)
stellar contract deploy --wasm target/wasm32v1-none/release/proofpay_threshold_verifier.wasm \
  --source deployer --network testnet -- --vk_bytes <hex vk bytes>

# auditor
stellar contract deploy --wasm target/wasm32v1-none/release/proofpay_auditor.wasm \
  --source deployer --network testnet -- --admin deployer --manager deployer

# verifier, then register the real Register VK (circuit_type 0 = Register)
stellar contract deploy --wasm target/wasm32v1-none/release/proofpay_verifier.wasm \
  --source deployer --network testnet -- --admin deployer --manager deployer
stellar contract invoke --id <verifier id> --source deployer --network testnet --send=yes \
  -- register_verification_key --circuit_type 0 --verification_key <hex vk bytes> --operator deployer

# token, wired to the above plus a SEP-41 underlying asset (native XLM SAC shown)
stellar contract asset deploy --asset native --source deployer --network testnet # or reuse existing
stellar contract deploy --wasm target/wasm32v1-none/release/proofpay_token.wasm \
  --source deployer --network testnet \
  -- --underlying_asset <sac id> --verifier <verifier id> --auditor <auditor id>
```
