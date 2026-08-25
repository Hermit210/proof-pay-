// In-browser proof generation. Verified byte-for-byte identical to native
// `nargo`/`bb` CLI output before this integration was trusted -- see
// docs/research/step3-in-browser-proof-generation.md. Everything here runs
// as pure JS/WASM: no secret witness value (spending key, balance opening)
// is ever sent to a server. Circuit artifacts are fetched from /circuits/
// (public/, code-split away from the main bundle by virtue of being static
// assets loaded on demand, not bundled JS).
//
// Exact package versions matter: @noir-lang/noir_js@1.0.0-beta.9 +
// @aztec/bb.js@0.87.0, matching the pinned native toolchain precisely. Do
// not upgrade either independently of re-verifying byte-identical output.

// Dynamically imported, not a top-level import: these pull in the ~3.4MB
// Barretenberg WASM payload (see docs/research/step3-in-browser-proof-generation.md),
// which has no business being in the app's initial bundle -- only the
// register/deposit-threshold screens that actually generate a proof need it.

// bb.js's own `flattenFieldsAsArray` isn't re-exported from the package's
// public entry point (only available deep in `dest/*/proof/index.js`), so
// this reimplements the same trivial operation: each "0x..." hex field
// element, padded/decoded to its canonical 32 big-endian bytes, concatenated
// in order -- matching the flat public-inputs blob format native `bb`'s CLI
// writes and the on-chain verifier (`ultrahonk_soroban_verifier`) consumes.
function flattenFieldsAsArray(fields: string[]): Uint8Array {
  const out = new Uint8Array(fields.length * 32);
  fields.forEach((field, i) => {
    const hex = field.replace(/^0x/, "").padStart(64, "0");
    for (let b = 0; b < 32; b++) {
      out[i * 32 + b] = parseInt(hex.slice(b * 2, b * 2 + 2), 16);
    }
  });
  return out;
}

export interface GeneratedProof {
  /** Raw UltraHonk proof bytes (fixed 14,592 bytes regardless of circuit size). */
  proof: Uint8Array;
  /** Flat big-endian concatenation of the circuit's public inputs, in declared order. */
  publicInputs: Uint8Array;
  /** The individual public input field elements, as hex strings, for display/debugging. */
  publicInputFields: string[];
}

interface CompiledCircuit {
  bytecode: string;
  abi: unknown;
}

const circuitCache = new Map<string, Promise<CompiledCircuit>>();

function loadCircuit(path: string): Promise<CompiledCircuit> {
  let cached = circuitCache.get(path);
  if (!cached) {
    cached = fetch(path).then((res) => {
      if (!res.ok) throw new Error(`failed to load circuit ${path}: ${res.status}`);
      return res.json() as Promise<CompiledCircuit>;
    });
    circuitCache.set(path, cached);
  }
  return cached;
}

/**
 * Witness-only execution (no proof) -- for the register_keygen helper
 * circuit, which derives Y=sk*H and PVK from sk using the same vendored
 * Grumpkin/Poseidon2 arithmetic the real register circuit will itself
 * assert against, rather than re-implementing elliptic-curve math in JS.
 */
export async function executeCircuit(
  circuitPath: string,
  inputs: Record<string, string | number>,
): Promise<string[]> {
  const [{ Noir }, circuit] = await Promise.all([import("@noir-lang/noir_js"), loadCircuit(circuitPath)]);
  const noir = new Noir(circuit as never);
  const { returnValue } = await noir.execute(inputs as never);
  if (Array.isArray(returnValue)) return returnValue as string[];
  return [String(returnValue)];
}

/**
 * Full proof generation: witness execution + UltraHonk proving, matching
 * the on-chain verifier's expected transcript (`keccak: true`, i.e. native
 * `bb prove --oracle_hash keccak`).
 */
export async function generateProof(
  circuitPath: string,
  inputs: Record<string, string | number>,
): Promise<GeneratedProof> {
  const [{ Noir }, { UltraHonkBackend }, circuit] = await Promise.all([
    import("@noir-lang/noir_js"),
    import("@aztec/bb.js"),
    loadCircuit(circuitPath),
  ]);
  const noir = new Noir(circuit as never);
  const { witness } = await noir.execute(inputs as never);

  const backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
  try {
    const proofData = await backend.generateProof(witness, { keccak: true });
    return {
      proof: proofData.proof,
      publicInputs: flattenFieldsAsArray(proofData.publicInputs),
      publicInputFields: proofData.publicInputs,
    };
  } finally {
    await backend.destroy();
  }
}

export const CIRCUITS = {
  registerKeygen: "/circuits/register_keygen.json",
  register: "/circuits/register.json",
  balanceThreshold: "/circuits/balance_threshold.json",
} as const;
