# Step 3 pre-flight: in-browser WASM proof generation, verified real

Date: 2026-08-25

Before building the frontend around it, verified the load-bearing claim that proof
generation can genuinely happen client-side (no server ever sees the secret witness —
the actual income amount) rather than assuming it.

## Verdict: confirmed, byte-for-byte

`@noir-lang/noir_js@1.0.0-beta.9` + `@aztec/bb.js@0.87.0` — exact version match to the
native `nargo`/`bb` toolchain already used for the deployed testnet proof (no
nightly/latest substitution). Ran the real compiled circuit
(`contract/circuits/balance_threshold/target/proofpay_balance_threshold.json`) through
both in Node (v24.11.1) with the identical witness already proven on-chain (sk=1, v_s=500,
r_s=7, threshold=300, addr_f=1) and compared output directly against the native-`bb`
fixtures already deployed and accepted on testnet
(`contract/threshold_verifier/tests/fixtures/`):

| Artifact | Size | Match vs. native `bb` output |
|:---|:---|:---|
| VK | 1,760 bytes | identical |
| Public inputs | 192 bytes | identical |
| Proof | 14,592 bytes | identical |

This is stronger than a fresh on-chain call would have been: the JS-generated proof is
the exact same bytes as the proof the real deployed `proofpay-threshold-verifier`
contract already accepted in testnet tx `4ee04bee...`. No transcript/oracle-hash
mismatch — bb.js's `{ keccak: true }` option maps precisely onto native `bb prove
--oracle_hash keccak`.

## Integration shape for the frontend

```js
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";

const circuit = /* the compiled ACIR JSON, bundled as a static asset */;
const { witness } = await new Noir(circuit).execute(inputs);
const backend = new UltraHonkBackend(circuit.bytecode);
const proofData = await backend.generateProof(witness, { keccak: true });
const vk = await backend.getVerificationKey({ keccak: true });
```

## What this means for frontend architecture

- **Timing**: witness ~86ms, proof generation ~3.9s, VK derivation ~1.3s, self-verify
  ~1.4s — full flow ~5.3s on this machine (Node, single-threaded). A browser tab will be
  the same order of magnitude. **The proof-generation step needs a real loading/progress
  state**, not a spinner-free interaction — this is confirmed to be the heaviest
  client-side computation in the app, matching what Step 4.5's performance-pass brief
  anticipated.
- **Bundle size**: `@aztec/bb.js` ships a real `browser`-conditioned export
  (`dest/browser/index.js`). Core WASM payload ~3.4MB (single-threaded
  `barretenberg.js`, or `barretenberg-threads.js` for the multi-threaded path, which
  needs COOP/COEP cross-origin-isolation headers for `SharedArrayBuffer` — a real hosting
  requirement to account for if that path is used) plus small worker scripts. **Must be
  dynamically imported / code-split**, not eagerly loaded in the main bundle.
- No fallback needed — this is the primary, confirmed-working path, not a contingency.
