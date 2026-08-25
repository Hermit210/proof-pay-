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

## MVP scope decision (confirmed by user 2026-08-25): threshold-only privacy for v1

Income arrives via `deposit` (SEP-41 amount visible on-chain at deposit time, like any
normal payment — this is standard, proof-less Confidential Token behavior). Individual
incoming payments are **not** hidden in v1. What's genuinely zero-knowledge is the
threshold check itself: the freelancer's current spendable balance and whether it clears
the threshold. This means only two circuits need a real, working on-chain verifier —
**Register** (33 opcodes, per OZ's own documented baseline) and our new
**BalanceThreshold** (71 opcodes, already built and compiling) — not the much heavier
**Transfer** circuit (133 opcodes, 8 EC scalar multiplications). This substantially
de-risks the CPU-budget question versus wiring up the full transfer-privacy flow, and
still delivers the core "prove income ≥ X without revealing the amount" promise honestly,
since the pass/fail proof is real ZK even though the deposit events that built up the
balance were individually public. Full transfer-level privacy (hiding individual
payments too) is a documented future direction, not part of the v1 honesty claim.

## Real cost measurement (2026-08-25): GO confirmed

Fixed the `bb` toolchain break: `bbup -v 0.87.0`'s tag-normalization no longer matches
Aztec's actual tagging (`aztec-packages-v{version}` vs. the real `v0.87.0`). Downloaded
`barretenberg-amd64-linux.tar.gz` directly from the `v0.87.0` GitHub release — works.

Generated a **real proof** (not simulated) for the actual BalanceThreshold circuit: real
witness (sk=1, v_s=500, r_s=7, threshold=300 → passes) run through OZ's actual
`vk_from_sk`/`pvk_from_vk`/`commit` functions, executed with `nargo`, proved with
`bb prove -s ultra_honk --oracle_hash keccak` per OZ's own documented recipe. Result: a
genuine 14,592-byte proof (exactly matches `ultrahonk_soroban_verifier`'s `PROOF_BYTES`
constant — confirms UltraHonk proof size is fixed regardless of circuit size) and a
1,760-byte VK.

Fed both into `rs-soroban-ultrahonk`'s own `UltraHonkVerifierContract` inside a
`soroban-sdk` test using `env.cost_estimate().budget()`:

| Operation | CPU instructions |
|:---|:---|
| Deploy (store VK) | 82,508 |
| `verify_proof` | **57,350,741** |

**57.35M vs. the ~100M/tx budget — fits comfortably, ~43% headroom.** Meaningfully better
than the carried-over ~81M estimate from an unrelated demo circuit. Cost breakdown shows
why: dominated by fixed per-proof overhead independent of circuit size (`Bn254G1Msm`
18.1M, `Bn254Pairing` 11.4M, `Bn254FrFromU256` 9.1M, `Bn254G2CheckPointInSubgroup` 3.4M)
— meaning **Register verification (33 opcodes) costs approximately the same ~57M**, not
less. Register + BalanceThreshold together would total ~114M and **cannot share one
transaction** — confirms the standalone-transaction design decided earlier is required,
not just a precaution.

### Final verdict: GO on Path A

Both proof-carrying operations ProofPay's v1 scope needs — Register and BalanceThreshold
— are real, working, and individually fit Soroban's budget with room to spare, provided
each runs as its own transaction (never combined with each other or anything else
proof-heavy). The one caveat carried forward, not resolved: privacy rests on
Pedersen-commitment hiding, not proof-transcript ZK, until an audited ZK-flavor verifier
ships — disclosed precisely in the README, not glossed over.

The validated circuit source (from `~/scratch/proofpay_threshold_probe`) and its
confirmed-working proof/VK artifacts are the starting point for Step 2's real contract
circuit, copied into this repo rather than rebuilt from scratch.

## Real cost measurement obtained (2026-08-25) — GO on Path A

The `bb 0.87.0` download breaks because `bbup`'s tag-normalization logic
(`aztec-packages-v{version}`) no longer matches Aztec's actual tagging — the real tag is
just `v0.87.0`, and it still exists with all assets intact:
`https://github.com/AztecProtocol/aztec-packages/releases/download/v0.87.0/barretenberg-amd64-linux.tar.gz`.
Downloaded directly, confirmed `bb --version` → `0.87.0`. (Also needed a rootless `jq`
binary — `bb`'s CRS-fetch step shells out to it and this box has no passwordless sudo.)

Generated a **real** proof for the actual 71-opcode BalanceThreshold circuit: computed
witness values via a `nargo test` harness calling OZ's real `vk_from_sk`/`pvk_from_vk`/
`commit` functions (sk=1, v_s=500, r_s=7, threshold=300 → passes), executed the witness,
ran `bb prove -s ultra_honk --oracle_hash keccak` / `bb write_vk` per OZ's own documented
recipe. Result: a genuine 14,592-byte proof (exactly matches
`ultrahonk_soroban_verifier::PROOF_BYTES` — confirms UltraHonk proof size is fixed
regardless of circuit size) and a 1,760-byte VK.

Fed both into `rs-soroban-ultrahonk`'s own existing `UltraHonkVerifierContract` (no new
contract needed) inside a `soroban-sdk` test using `env.cost_estimate().budget()`:

| Operation | CPU instructions | Memory |
|:---|:---|:---|
| Deploy (store VK) | 82,508 | 26,277 bytes |
| `verify_proof` | **57,350,741** | 2,344,481 bytes |

**57.35M vs. the ~100M/tx budget — fits comfortably, ~43% headroom.** Meaningfully better
than the ~81M estimate carried over from the unrelated demo circuit. Cost is dominated by
fixed per-proof overhead independent of circuit size (`Bn254G1Msm` 18.1M, `Bn254Pairing`
11.4M, `Bn254FrFromU256` 9.1M, `Bn254G2CheckPointInSubgroup` 3.4M) — meaning **Register
verification (33 opcodes) would cost approximately the same ~57M**, not less. Register +
BalanceThreshold together would total ~114M and **cannot share one transaction** —
confirms the standalone-transaction design decided earlier is required, not just prudent.

**Final verdict: GO on Path A.** Both proof-carrying operations ProofPay's MVP needs
(Register, BalanceThreshold) are real, working, and individually fit Soroban's CPU budget
with room to spare, provided each stays its own transaction. Combined with the earlier
findings, Step 2 can now proceed with a validated architecture rather than an assumed one.

Probe artifacts (circuit source, real proof/vk/public_inputs, worked witness values) live
in `~/scratch/proofpay_threshold_probe` — not yet copied into this repo; Step 2 will
promote the validated circuit into `contract/` proper rather than reusing the scratch copy.

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
