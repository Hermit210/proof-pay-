# Register() false-success investigation

Date: 2026-08-25

## Symptom

Real user testing: `register()` showed a green "Confidential account registered."
success state in the UI, but the account was never actually registered on-chain --
confirmed via a direct `confidential_balance` read immediately afterward, which still
returned `#3501 AccountNotRegistered`. The account's Horizon sequence number had not
advanced at all, meaning **no transaction of any kind reached the network** during the
attempt -- not a submitted-then-failed tx, nothing.

## What was ruled out, with evidence, not assumption

- **Not the SDK version-mismatch bug** (docs/deployment work earlier this session):
  confirmed fixed and live (server restarted, fetched the served source directly through
  the running dev server, confirmed it returns the fixed `.toXDR()`).
- **Not a stale bundle**: user confirmed via hard refresh + DevTools console.
- **Not `checkRegistration()` falsely reporting `true`**: reproduced its exact logic
  (`client.confidential_balance()` + the `#3501` string match) against the real
  unregistered account directly -- it correctly throws and correctly resolves to
  `isRegistered = false`. Not the source of the false positive.
- **Not the SDK silently skipping confirmation**: read `AssembledTransaction.signAndSend()`
  and `SentTransaction.init()` source directly (`node_modules/@stellar/stellar-sdk/lib/esm/contract/`).
  `SentTransaction.init()` polls `getTransaction()` via exponential backoff until a
  non-`NOT_FOUND` status or timeout, and **throws `TransactionStillPendingError`** if it
  can't confirm in time. This is not a fire-and-forget design at the library level.
- **Confirmed the JS code path itself works**, end-to-end, for real: reproduced
  `register()`'s exact logic (real proof generation, real `Client`, real `signAndSend()`)
  outside the browser via `tsx` (real TS transform, not Node's limited type-stripping)
  with a locally-held Keypair substituted for Freighter's signing callback --
  this produced a genuine, Horizon-confirmed `successful: true` transaction.

## What's still open

Could not reproduce the exact browser + real Freighter-extension interaction (the
sandbox is missing system libraries for a real Chromium launch, and a second
`apt --with-deps` install was not worth blocking on again). It's possible something
specific to Freighter's actual signing handshake in this exact environment differs from
both the direct-Keypair repro and the SDK's own documented behavior -- not confirmed
either way.

## Fix applied regardless of the precise mechanism

Per the explicit ask: never treat `signAndSend()` resolving as proof of on-chain state.
`useRegister.ts` now does an independent `confidential_balance` re-read after
`signAndSend()` (`confirmRegisteredOnChain`, up to 5 attempts with a 1.5s backoff to
tolerate ordinary read-after-write lag, not to paper over a real failure -- a non-`#3501`
error from the re-check is treated as a real failure, not "still confirming"). Only sets
`isRegistered = true` / shows the success state once this independent check passes. A new
`"confirming"` stage shows an explicit "confirming on-chain..." message during this gap.
If confirmation genuinely fails, the user now sees a real error naming the submitted tx
hash (if one exists) rather than a false-positive success.

## Follow-up not done in this pass

The same class of risk applies to `deposit()`/`merge()` in `useDeposit.ts` (also calls
`signAndSend()`). Not yet given the same explicit post-submission verification --
flagged as a follow-up, not silently assumed safe just because register's case is now
guarded.
