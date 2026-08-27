# ProofPay

**Prove your income clears a bar. Not what it actually is.**

ProofPay lets someone prove their on-chain balance is at or above a threshold they
choose — to a landlord, a lender, or a platform — using a real zero-knowledge proof
generated entirely in their browser and verified on Stellar testnet. No backend ever
sits in the trust path: your spending key and your exact balance never leave your
device.

**Live demo:** _pending deployment — see [Deployment](#deployment) below._

---

## ⚠️ Honest disclosure: unaudited developer preview

This runs on Stellar's **Confidential Tokens**, which shipped as a
[developer preview](https://stellar.org/blog/developers/developer-preview-confidential-tokens-on-stellar)
as part of Protocol 25 ("X-Ray"). Stellar's own announcement states it is **not yet
approved for mainnet** and audits are underway. The on-chain UltraHonk verifier this app
depends on (`ultrahonk_soroban_verifier`, by Nethermind) is likewise unaudited, and
currently implements only the non-ZK proof flavor — meaning today's privacy guarantee
rests on the Pedersen commitment scheme's own hiding property, not on proof-transcript
zero-knowledge (that stronger guarantee ships once an audited ZK-flavor verifier is
released).

**Everything in this repo runs on Stellar testnet only. Do not use with real funds.**

`stellar-tokens`'s confidential module isn't published to crates.io yet (latest release,
0.7.2, doesn't contain it) — this project depends on a specific pinned commit of
OpenZeppelin's `main` branch via a git dependency. That's disclosed, not hidden: see
[Cargo.toml](contract/Cargo.toml) and
[docs/research/step1-confidential-token-research.md](docs/research/step1-confidential-token-research.md).

---

## What's actually private, and what isn't

| | Visible on-chain | Hidden |
|---|---|---|
| **Deposit** | The deposit amount (it's a normal SEP-41 on-ramp) | — |
| **Balance** | That an account is registered | Your exact spendable balance |
| **Proof** | That a threshold check ran, and its true/false result, plus a real tx hash anyone can verify | The actual balance behind the check |

The honest framing, always: *"does this account's balance clear a bar?"* is answered
without answering *"what is this account's balance?"*

---

## Why this exists (the Confidential Tokens pivot)

The original plan assumed a chunk of the hard cryptography — specifically Selective
Disclosure's `disclose_balance_ge` (exactly "prove balance ≥ threshold") — was already
built into OpenZeppelin's Confidential Tokens module. Reading the actual source
(`packages/tokens/src/confidential/`) showed that premise was only half true:

- **Real and working:** hidden balances/transfers via Pedersen commitments on Grumpkin,
  6 compiled Noir circuits with checked-in verification keys, and satellite
  verifier/auditor/compliance contracts.
- **Spec-only, not code:** the Selective Disclosure layer (`SELECTIVE_DISCLOSURE.md`) —
  including the exact `disclose_balance_ge` primitive this product needed. Verified by
  grepping the whole repo for `disclose_*`: zero hits outside documentation, no compiled
  VK for any disclose circuit.
- **`ConfidentialVerifier::verify_proof` had no body at all** — every proof-carrying
  entry point was unverifiable on-chain until a real UltraHonk backend was wired in.

So the actual work was: write a new, scoped Noir circuit for the threshold check (it
turned out to need only viewing-key ownership + a Pedersen-opening + a threshold
comparison — no ECDH, no encryption chains, genuinely one of the simplest circuits in
the spec), and integrate Nethermind's `rs-soroban-ultrahonk` as the on-chain verifier
backend, patched to the newer `soroban-sdk` version OpenZeppelin's module actually needs.
Full research trail in [`docs/research/`](docs/research/).

---

## Architecture

No server exists in this product's trust path.

1. **Confidential Token contract (Soroban).** Balances are Pedersen commitments on the
   Grumpkin curve, not plaintext numbers. Deposits and merges are homomorphic point
   additions; `register` and the threshold check are backed by real on-chain UltraHonk
   proof verification.
2. **In-browser zero-knowledge proving.** The threshold proof is generated entirely
   client-side via Noir (`noir_js`) and Barretenberg (`bb.js`) compiled to WASM, verified
   byte-for-byte identical to the native toolchain's output before being trusted. Your
   spending key and exact balance are witness inputs and never leave your device.
3. **Independent on-chain verification.** Anyone — not just ProofPay — can verify a
   shared proof result by looking up the real transaction hash on Stellar Expert. The
   verdict comes from the public ledger, not from ProofPay's own claim about it.

```
Wallet connect  →  Register  →  Deposit  →  Prove threshold  →  Share result
   (Freighter)     (real ZK      (visible     (real ZK proof,     (real tx hash,
                    proof)       on-chain)     never leaves        independently
                                               device)              verifiable)
```

---

## Real testnet deployment

Deployed 2026-08-25 to Stellar testnet, deployer
`GBZBXZMFWV3HNCTWJXZPJSUMKB7XFZU3SXNR2TA22ZKKIZEXHPLCN5EC`. Full record, including
reproduction steps: [`docs/deployment/testnet.md`](docs/deployment/testnet.md).

| Contract | Address |
|:---|:---|
| `proofpay-token` | [`CDSZUHSWCLZVPFHTG6556MAEKPUUCH4UKMGOIH7O2KT4UKHW4AJR5Z5Y`](https://stellar.expert/explorer/testnet/contract/CDSZUHSWCLZVPFHTG6556MAEKPUUCH4UKMGOIH7O2KT4UKHW4AJR5Z5Y) |
| `proofpay-threshold-verifier` | [`CCIZWGDUTKWELJWHGRM2DSWBOW247RS75POK4FTHIRU6OGYHDCR4JM34`](https://stellar.expert/explorer/testnet/contract/CCIZWGDUTKWELJWHGRM2DSWBOW247RS75POK4FTHIRU6OGYHDCR4JM34) |
| `proofpay-verifier` | [`CCWMZNZQ2IQDLI7CSJWEARBZW47WBN4NL5PUXV52SJG7RCZ5CSTXS26Z`](https://stellar.expert/explorer/testnet/contract/CCWMZNZQ2IQDLI7CSJWEARBZW47WBN4NL5PUXV52SJG7RCZ5CSTXS26Z) |
| `proofpay-auditor` | [`CCQNLPV2B2NV6SJCWZZ5EQF6ZV6IU7O5SMAY5ILUGJV7SB7XLLYPYIXO`](https://stellar.expert/explorer/testnet/contract/CCQNLPV2B2NV6SJCWZZ5EQF6ZV6IU7O5SMAY5ILUGJV7SB7XLLYPYIXO) |

**The complete, connected product flow — not an isolated demo:**

| Step | Tx hash | Result |
|:---|:---|:---|
| `register()` with a real Register-circuit proof | [`1aea5f32...92a528`](https://stellar.expert/explorer/testnet/tx/1aea5f32156d38bf6dc7d27c1b3a96d95a4360c8d1eb5136501c759dc092a528) | `Register` event; on-chain public keys match the proven values exactly |
| `deposit(500)` | [`bdd9e391...2d2beb`](https://stellar.expert/explorer/testnet/tx/bdd9e3910f810a546e23471bbd96b56c61be19a81c753e0f03ef2d26eb2d2beb) | `Deposit` event |
| `merge()` | [`faf362be...f4dfc7`](https://stellar.expert/explorer/testnet/tx/faf362bee44012a9e53389a0804e695ecdae7165cfa605c135296d416ff4dfc7) | `spendable_commitment` becomes `500·G` |
| **`verify_proof`** — real proof that the *actual on-chain* spendable balance is ≥ 300 | [`0e02c961...2848c8`](https://stellar.expert/explorer/testnet/tx/0e02c9617c97e6f8b3450a4a085977de2d4d5a410b61abccd24e590f0d2848c8) | **`true`** |

That last row is what this product actually delivers, running for real on a public
network — not a simulated result.

---

## Setup

### Prerequisites

- Node.js 22+, Rust stable (for the contracts), the [Freighter](https://freighter.app)
  wallet extension set to **Testnet**.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in the contract IDs from the table above
npm run dev
```

Required env vars (see [`.env.example`](frontend/.env.example)):

```bash
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_TOKEN_CONTRACT_ID=CDSZUHSWCLZVPFHTG6556MAEKPUUCH4UKMGOIH7O2KT4UKHW4AJR5Z5Y
VITE_VERIFIER_CONTRACT_ID=CCWMZNZQ2IQDLI7CSJWEARBZW47WBN4NL5PUXV52SJG7RCZ5CSTXS26Z
VITE_THRESHOLD_VERIFIER_CONTRACT_ID=CCIZWGDUTKWELJWHGRM2DSWBOW247RS75POK4FTHIRU6OGYHDCR4JM34
VITE_AUDITOR_CONTRACT_ID=CCQNLPV2B2NV6SJCWZZ5EQF6ZV6IU7O5SMAY5ILUGJV7SB7XLLYPYIXO
# Optional -- the app runs fully without these, just without tracking:
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_SENTRY_DSN=
```

### Contracts

```bash
cd contract
cargo test --workspace    # unit + integration tests, real UltraHonk proof verification
cargo build --workspace   # native compile check
```

Full deploy/reproduce steps (Soroban CLI, `wasm32v1-none` target) are in
[`docs/deployment/testnet.md`](docs/deployment/testnet.md).

### Tests

```bash
cd frontend
npm run test        # Vitest + React Testing Library, one-shot
npm run test:watch  # watch mode
```

32 tests covering: confidential-balance accrual logic, the real on-chain history log,
form validation (including a caught bug — decimal/non-numeric input used to crash
`BigInt()` parsing outside any try/catch), and wallet-connect error states
(not-installed / wrong-network / user-declined / success), all against mocked service
boundaries rather than live network calls.

---

## Deployment

Frontend is a static Vite build (`frontend/vercel.json` configures the build command,
output directory, and an SPA rewrite for client-side routing). Deploy via the
[Vercel dashboard](https://vercel.com/new) or the CLI:

```bash
cd frontend
vercel link      # first time: set Root Directory to `frontend`
vercel env add   # add the VITE_* vars above for Production
vercel --prod
```

**Live URL:** _to be added once deployed._

---

## CI/CD

[![CI](https://github.com/Hermit210/proof-pay-/actions/workflows/ci.yml/badge.svg)](https://github.com/Hermit210/proof-pay-/actions/workflows/ci.yml)

Every push/PR to `main` runs two jobs (see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **Frontend:** lint (oxlint) → typecheck (`tsc`) → test (Vitest) → build (Vite)
- **Contract:** `cargo test --workspace` (unit + the threshold-verifier integration
  suite, real proof verification, ~4s) → `cargo build --workspace`

---

## Analytics & error monitoring

[PostHog](https://posthog.com) (product events: wallet connect, register, deposit,
proof generated/verified) and [Sentry](https://sentry.io) (error capture) are wired in
via `frontend/src/services/analytics.ts` — both fully optional; the app runs identically
without either key set, just without telemetry.

---

## Screenshots

_(To be added — product UI, mobile responsive view, analytics dashboard.)_

| Home | Dashboard (verified) | Mobile (~390px) |
|:---:|:---:|:---:|
| _screenshot_ | _screenshot_ | _screenshot_ |

---

## Requirements checklist

Honestly marked — ⬜ means genuinely not done yet, not "close enough."

- ✅ Wallet connect (Freighter), with real distinct error states (not installed / wrong
  network / user declined)
- ✅ Register → Deposit → Prove → Share, real testnet transactions end-to-end (table
  above)
- ✅ In-browser zero-knowledge proof generation (Noir + Barretenberg/WASM), verified
  on-chain by a real UltraHonk verifier
- ✅ Real History page (on-chain-action log with genuine tx hashes and Stellar Expert
  links; honest empty state, no placeholder rows)
- ✅ `.env.example` documenting every required and optional variable
- ✅ PostHog + Sentry integration (optional, app runs without either)
- ✅ Vitest + React Testing Library — 32 real tests (accrual, history, form validation,
  wallet-connect error states)
- ✅ GitHub Actions CI (frontend lint/typecheck/test/build, contract test/build) — green
- ✅ Bold black/white/light-green visual design, real unDraw illustrations, scroll-triggered
  motion, responsive layout
- ⬜ Vercel/Netlify deployment — pending (see [Deployment](#deployment))
- ⬜ Live demo video
- ⬜ Screenshots (product UI, mobile, analytics dashboard)
- ⬜ 10 real user onboardings + collected feedback

---

## License

MIT — see [LICENSE](LICENSE).
