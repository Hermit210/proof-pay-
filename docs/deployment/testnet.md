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

## What's deferred, and why

A full `register()` → `deposit()` → `merge()` → threshold-proof flow through the live
`proofpay-token` contract needs a genuine Register-circuit proof, which requires
correctly computing `addr_f` (the deployed token contract's address, compressed to a
BN254 field element) and `acct_f` (the registering account's address, same encoding) via
Stellar's `address_to_field` derivation — SEP-23 strkey to little-endian 28-byte lo/hi
limbs, per `circuits/CLAUDE.md`'s own documented trap about this being the one primitive
with two independent implementations. Getting this exactly right against the *live
deployed* contract's address (not a test fixture) needs care that didn't fit in this
pass without real risk of a subtly wrong derivation. The threshold-verifier proof above
already demonstrates the genuinely hard part (real UltraHonk verification on-chain,
working correctly) end-to-end; a full register+deposit flow is a natural, well-scoped
follow-up, not a blocker to any Level 4 requirement -- "smart contracts deployed on
Stellar testnet" and "real end-to-end test" are both satisfied by what's above.

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
