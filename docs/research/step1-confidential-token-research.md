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

## Dependency mechanism: git, not crates.io

`stellar-tokens`'s latest published crates.io release is 0.7.2 (2026-06-09) and its
source contains only `fungible`, `non_fungible`, `rwa`, `vault` — **no `confidential`
module**. The confidential module only exists on the `main` branch of
`github.com/OpenZeppelin/stellar-contracts` (HEAD at commit `fbfde388e1b72afa93d6b1c922067879b20e81db`,
dated 2026-08-14, after the 0.7.2 release). ProofPay's `Cargo.toml` therefore depends on
it via a git dependency pinned to that commit:

```toml
stellar-tokens = { git = "https://github.com/OpenZeppelin/stellar-contracts", rev = "fbfde388e1b72afa93d6b1c922067879b20e81db" }
```

This is still "depending on the crate," not copy-pasted source — just pinned to a commit
rather than a semver release, since no release has this module yet. Worth disclosing in
the README alongside the unaudited-preview warning: this is pre-release, unversioned code.

## rs-soroban-ultrahonk integration findings (2026-08-25)

Cloned `github.com/NethermindEth/rs-soroban-ultrahonk` to `~/scratch/rs-soroban-ultrahonk`
and read the real source. Confirmed API shape and three concrete risks.

**API (real, working, on-chain example exists at `contracts/rs-soroban-ultrahonk/src/lib.rs`):**
```rust
use ultrahonk_soroban_verifier::UltraHonkVerifier;
let verifier = UltraHonkVerifier::new(&env, &vk_bytes)?;      // constructor: lib.rs:47-57
verifier.verify(&env, &proof_bytes, &public_inputs)?;         // verify_proof: lib.rs:68-89, Result<(), VerifyError>
```
Not on crates.io — git dependency, package name `ultrahonk_soroban_verifier`
(`crates/ultrahonk-soroban-verifier`).

**Risk 1 — SDK version mismatch, right now.** This crate pins `soroban-sdk = "26.0.1"`;
OpenZeppelin's confidential module needs `27.0.2`. An open **draft, unmerged** PR #40
fixes this but flags an unresolved upstream resolver bug
(`stellar/rs-soroban-env#1705`) where a fresh SDK-27 lockfile can pull an incompatible
`ed25519-dalek`. We'll need to fork/patch to SDK 27 ourselves rather than wait on it.

**Risk 2 — CPU budget is tight.** The repo's own measured numbers
(`contracts/identity/README.md`): "~24KB WASM... ~81M CPU instructions on Soroban
Protocol 26" for verifying a *bare* Poseidon2-preimage demo circuit — before adding any
of ConfidentialToken's own logic to the same invocation. Soroban's per-tx CPU budget has
historically sat near 100M instructions. **Must measure our actual BalanceThreshold
circuit's real cost before committing further** — this could make on-chain verification
of anything beyond the simplest circuit infeasible within a single transaction.

**Risk 3 — potentially serious: verifier only implements the non-ZK UltraHonk flavor.**
`crates/ultrahonk-soroban-verifier/VERIFIER_PROVENANCE.md` states plainly:
*"UltraZKFlavor (hiding polynomial, Libra) — Not implemented."* Only supports
"UltraFlavor" (Keccak transcript, no ZK-blinding). This needs to be resolved BEFORE
writing threshold-circuit code: does verifying a proof through this non-ZK-flavor
verifier risk leaking witness information (the actual income amount) through the proof
transcript itself, independent of the Pedersen-commitment/ECDH hiding already in the
protocol? If yes, this could undermine ProofPay's core privacy claim regardless of how
correct the rest of the integration is.

**Toolchain gaps confirmed on this machine:** `nargo`/`bb` not installed (need
`noirup -v 1.0.0-beta.9`, `bbup -v 0.87.0`); `wasm32v1-none` and `stellar` CLI 27.1.0
already present.

**Non-audit note:** the crate's own audit trail was performed by an AI CLI tool, not an
independent security firm — the repo's top-level README still says "not audited."

## Follow-up investigation (2026-08-25): ZK-flavor risk and real circuit cost

### Non-ZK flavor: confirmed real, not hypothetical

Two first-party sources confirm the concern is genuine:
- `rs-soroban-ultrahonk`'s own `VERIFIER_PROVENANCE.md`: scope is explicitly "Non-ZK,
  non-recursive, native BN254 UltraHonk path only"; `UltraZKFlavor (hiding polynomial,
  Libra)` is listed "Not implemented."
- **OpenZeppelin's own contributor guide** (`packages/tokens/src/confidential/circuits/CLAUDE.md`,
  VK-generation section) instructs: *"Do not pass `--zk`; the verifier implements only the
  non-zk `ultra_flavor`. **This recipe is provisional until the verifier is finished.**"*
  OZ's own team documents this as a known, temporary compromise — not a resolved design
  decision on their end either.

Cryptographically: hiding polynomials/Libra masking exist to stop an adversary
interpolating a witness-dependent polynomial from the evaluation points revealed during
Sumcheck/Gemini opening (reveal ≥ degree+1 points of an unmasked polynomial and it's
recoverable — standard PLONK-family concern). This is *more* relevant for our circuit
than a general-purpose one, not less — our witness is tiny (`sk`, `v_s`, `r_s`), so
there's less natural noise protecting it.

**Conclusion:** for now, hiding the income amount rests entirely on the Pedersen
commitment's own (real, unconditional) hiding property — not on the proof system's ZK
property, which this verifier stack doesn't provide yet. Must disclose this precisely in
the README ("commitment-hiding + soundness, not proof-transcript zero-knowledge, pending
an audited ZK-flavor verifier") rather than claim unqualified "zero-knowledge."

### Real circuit cost: toolchain broken, partial data obtained

`bb 0.87.0` (the version `rs-soroban-ultrahonk` pins) is **no longer downloadable** —
Aztec has moved to a `v5.x` release scheme with different asset naming; confirmed 404 on
the exact pinned release and plausible tag variants. No exact bb-generated proof could be
measured today.

Did get real data on the circuit itself: installed `nargo 1.0.0-beta.9`, built the actual
D-balance-predicate circuit (D1/D2 viewing-key check, DB3 Pedersen opening, DB4
threshold, D5 range — reusing OZ's real `commit`/`vk_from_sk`/`pvk_from_vk` lib
functions, no ECDH/ciphertext gadgets needed). **Compiles cleanly at 71 ACIR opcodes** —
for scale, OZ's own documented baselines (same CLAUDE.md) are Register 33, Withdraw 94,
Transfer 133 opcodes. Ours sits between Register and Withdraw — a genuinely small circuit.

UltraHonk verification cost is dominated by fixed per-proof overhead (transcript,
~log₂(N) sumcheck rounds, pairing check), not linear opcode count — small circuits round
up to similar power-of-2 buckets. The only real cost anchor available
(`contracts/identity/README.md`): **~81M CPU instructions** to verify a *much smaller*
circuit (single Poseidon2 call) against Soroban's ~100M/tx budget. Best-effort estimate
(not measured, clearly not final): our circuit likely costs in the same high-tens-to-90M+
range — i.e. most or all of the per-tx budget by itself, with real risk of not fitting
alongside Transfer-proof verification in the same transaction, and non-trivial risk of
exceeding the ceiling outright. **Must be re-measured with a working bb before finalizing
architecture.**

### Net effect on scope

Both findings push toward narrowing Path A rather than abandoning it: keep genuine ZK
(Noir circuit + real on-chain UltraHonk verification) for the one circuit ProofPay
actually controls — the BalanceThreshold predicate — and treat it as its own standalone
transaction rather than assuming it can ride alongside Transfer-proof verification. The
question of whether income arrival itself (via `confidential_transfer`, which needs the
heavier Transfer circuit verified too) is in scope for the MVP, or deferred, is the next
real decision — see below.

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
