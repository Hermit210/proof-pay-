// Client-side log of real actions this browser has actually performed and
// had confirmed, so the History page has something genuine to show without
// a backend or an event indexer. Every entry is written at the moment an
// action *succeeds* with a real submitted transaction -- never speculative,
// never backfilled. See localWalletState.ts for the same trust model applied
// to the confidential-balance witness.

const STORAGE_PREFIX = "proofpay:history:";

export type HistoryKind = "register" | "deposit" | "prove_passed" | "prove_failed";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  timestamp: number; // Date.now() at the moment the action was confirmed
  txHash: string | null; // null only if the SDK genuinely didn't surface one
  amount?: string; // deposit amount, decimal string
  threshold?: string; // prove threshold, decimal string
}

function key(address: string): string {
  return `${STORAGE_PREFIX}${address}`;
}

export function loadHistory(address: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(key(address));
    const entries = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function appendHistory(address: string, entry: Omit<HistoryEntry, "id" | "timestamp">): void {
  try {
    const existing = loadHistory(address);
    const next: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    localStorage.setItem(key(address), JSON.stringify([next, ...existing]));
  } catch {
    // Best-effort: the on-chain action already succeeded regardless of
    // whether this browser can persist a local record of it.
  }
}
