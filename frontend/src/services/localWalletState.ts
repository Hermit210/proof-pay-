// Client-side tracking of the account's confidential-balance opening
// (v_s, r_s) -- the secret witness a threshold proof needs. Per-viewer
// browser storage only, never sent anywhere.
//
// Scoped to v1's deposit-only flow (see docs/research/step1-confidential-token-research.md,
// "MVP scope decision"): every deposit adds to the spendable balance with
// zero Pedersen blinding (`a*G`, per OZ's own docs), and merge is pure
// homomorphic addition, so tracking reduces to "sum of deposits so far,
// blinding always 0" -- confirmed against real on-chain state in
// docs/deployment/testnet.md ("commit(v_s=500, r_s=0)" matched the live
// spendable_commitment exactly). This does NOT generalize to confidential
// transfers (out of scope for v1): a future version accepting hidden
// incoming transfers needs real wallet-sync (replay commitment openings from
// on-chain events under the viewing key), not this simplified counter.

const STORAGE_PREFIX = "proofpay:wallet-state:";

export interface LocalWalletState {
  address: string;
  spendingKey: string; // sk, hex -- generated client-side, never transmitted
  spendableValue: string; // v_s, decimal string (bigint-safe)
  spendableBlinding: string; // r_s, decimal string -- always "0" in v1's deposit-only flow
  registered: boolean;
}

function key(address: string): string {
  return `${STORAGE_PREFIX}${address}`;
}

export function loadWalletState(address: string): LocalWalletState | null {
  try {
    const raw = localStorage.getItem(key(address));
    return raw ? (JSON.parse(raw) as LocalWalletState) : null;
  } catch {
    return null;
  }
}

export function saveWalletState(state: LocalWalletState): void {
  try {
    localStorage.setItem(key(state.address), JSON.stringify(state));
  } catch {
    // Best-effort: private browsing / storage quota. The registration itself
    // already succeeded on-chain; losing local tracking just means the user
    // has to re-derive it, not that anything is unsafe.
  }
}

export function recordDeposit(address: string, amount: bigint): LocalWalletState {
  const existing = loadWalletState(address);
  const current = existing ? BigInt(existing.spendableValue) : 0n;
  const next: LocalWalletState = {
    address,
    spendingKey: existing?.spendingKey ?? "",
    spendableValue: (current + amount).toString(),
    spendableBlinding: "0",
    registered: existing?.registered ?? false,
  };
  saveWalletState(next);
  return next;
}
