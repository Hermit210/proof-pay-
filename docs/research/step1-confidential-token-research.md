# Step 1 Research: Confidential Token API & ProofPay Feasibility

Date: 2026-08-25
Source repo read: https://github.com/OpenZeppelin/stellar-contracts (module `packages/tokens/src/confidential/`)

## What's implemented vs. spec-only

### Implemented (real Rust + Noir code, in the repo today)

- `ConfidentialToken` trait (`mod.rs`): `register`, `deposit`, `merge`, `withdraw`,
  `confidential_transfer`, `confidential_transfer_from`, `set_spender`, `revoke_spender`,
  plus read methods `confidential_balance`, `is_spender`, `get_spender_delegation`.
- Balances are Pedersen commitments on the Grumpkin curve. Every state-changing op that
  consumes private state carries an UltraHonk proof.
- 6 real Noir circuits exist and have compiled verification keys checked into
  `circuits/vks/`: `register`, `withdraw`, `transfer`, `spender_transfer`, `set_spender`,
  `revoke_spender`. Shared gadgets: `assert_on_curve`, `commit`, `ecdh`, `encrypt_amount`,
  `poseidon_with_domain`, `sponge_squeeze_2`, `vk_from_sk`.
- Satellite contracts: `verifier` (VK registry), `auditor` (auditor key registry, real
  compliance-oriented decryption path — works today, no proof gap), `compliance`
  (freeze/allowlist/policy hooks).
- Only `deposit` amounts are public on-chain (this is the SEP-41 on-ramp). Transfer
  amounts and balances are genuinely hidden once inside the confidential ledger.

### NOT implemented — verified by reading source, not assumed

1. **`ConfidentialVerifier::verify_proof` has no body at all**
   (`verifier/mod.rs:233`, bare trait method, no default). The module doc says outright:
   *"cannot be wired to a real UltraHonk backend until `rs-soroban-ultrahonk` is released
   and audited."* Every proof-carrying entry point is unverifiable until a deployer wires
   in a real backend.

2. **The Selective Disclosure layer (`docs/SELECTIVE_DISCLOSURE.md`) is spec-only.**
   This doc fully specifies D-recipient, D-sender, D-auditor, and — critically for
   ProofPay — **D-balance** (`disclose_balance_ge` / `disclose_balance_le`, i.e. exactly
   "prove balance ≥/≤ threshold without revealing it"). Verified by:
   - `circuits/Nargo.toml` workspace members list: no `disclose_*` entries.
   - Repo-wide grep for `disclose` across `.rs`/`.nr`/`.toml`: zero hits outside `docs/`.
   - No `.vk.json` for any disclose circuit in `circuits/vks/`.
   This is a design document the OpenZeppelin/Nethermind team has not built against yet.

3. **The official Stellar docs page corroborates this.** `developers.stellar.org/docs/build/apps/privacy`
   compares Confidential Tokens vs. SPP and links integration resources, but does not
   mention selective disclosure or threshold proving anywhere. Both technologies carry
   explicit "unaudited, not for production" warnings.

4. **Nethermind's `rs-soroban-ultrahonk`** (the UltraHonk backend `verify_proof` needs)
   does exist and looks functionally complete — full local/testnet workflow, pinned
   Noir 1.0.0-beta.9 / Barretenberg 0.87.0, 379 commits — but is itself explicitly
   unaudited and marked not for production/real-value use.

## Conclusion on the master-prompt premise

The premise that "a meaningful part of the hard cryptography is already built for us" via
selective disclosure is **not accurate for the threshold-proof mechanism specifically**.
It's accurate for the base confidentiality layer (hidden balances/transfers via Pedersen
commitments — genuinely implemented). The exact primitive ProofPay was meant to lean on
(`disclose_balance_ge`) is a specification, not code.

## Scoping silver lining

The circuit ProofPay actually needs is one of the simplest in the whole spec. Per
`SELECTIVE_DISCLOSURE.md` §9, `disclose_balance_ge` only needs:
- D1/D2: viewing-key ownership (Poseidon derivation + scalar mult — reuses existing
  `poseidon_with_domain` / `assert_on_curve` gadgets)
- DB3: Pedersen commitment opening of `C_spend` (reuses existing `commit` gadget)
- DB4: threshold comparison
- D5: range check

No ECDH, no sponge encryption chains (those are only needed for transfer/value-revealing
variants). This is realistically buildable as a new, but scoped, Noir circuit.

For genuine privacy in the real use case (freelancer's income hidden from an observer),
income must arrive via `confidential_transfer` (hidden amount), not `deposit` (amount is
public on-chain) — so the base `Transfer` circuit's proof also needs to be genuinely
verifiable, not just our new one.

## Decision (confirmed by user 2026-08-25): Path A — Full ZK path

Wire a real UltraHonk verification backend (Nethermind's `rs-soroban-ultrahonk`) for
exactly the circuits ProofPay's flow needs — **Register** and **Transfer** from the base
library, plus a **new `BalanceThreshold` circuit** we write ourselves (modeled on the
`disclose_balance_ge` spec) — rather than falling back to a trusted-auditor disclosure
model or a bespoke non-OZ redesign. This is the most faithful path to the original
"prove income ≥ X without revealing the amount" pitch, scoped down from wiring all 6 base
circuits + the full disclosure family to just the 3 that ProofPay's actual flow touches.

Rejected alternatives (recorded for honesty in case Path A hits a hard blocker later and
we need to fall back):
- **Path B (auditor-trust fallback):** lower engineering risk, but is trusted
  third-party disclosure, not zero-knowledge — a real reduction in the privacy guarantee
  from what was pitched.
- **Path C (bespoke redesign):** abandons the "build on Confidential Tokens" premise
  entirely; most from-scratch cryptography, highest risk for the project's scale.
