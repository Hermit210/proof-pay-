import { rpc } from "@stellar/stellar-sdk";
import type { AppEnv } from "../env";

// `AssembledTransaction.signAndSend()` is documented to poll `getTransaction`
// internally until a final status, and throw if it can't confirm in time --
// so in principle its resolving should already mean "on-chain, confirmed."
// But a real false-success was observed in this exact app (see
// docs/research/step3c-register-false-success.md) whose root cause was never
// fully pinned down -- possibly specific to Freighter's signing handshake
// bypassing the SDK's own confirmation path. The fix adopted there,
// independent of the precise mechanism, is: never treat signAndSend()
// resolving as proof of on-chain state for ANY state-changing or
// result-bearing call. This re-fetches the transaction directly from the
// Soroban RPC server by hash and only trusts a genuine SUCCESS status.

export class TransactionFailedOnChainError extends Error {
  constructor(public readonly hash: string) {
    super(`Transaction ${hash} was submitted but failed on-chain.`);
    this.name = "TransactionFailedOnChainError";
  }
}

export async function confirmTransactionOnChain(
  env: AppEnv,
  hash: string,
  attempts = 6,
  delayMs = 1000,
): Promise<boolean> {
  const server = new rpc.Server(env.sorobanRpcUrl);
  for (let i = 0; i < attempts; i++) {
    const res = await server.getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return true;
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new TransactionFailedOnChainError(hash);
    }
    // NOT_FOUND: still propagating / not yet visible to this RPC node --
    // ordinary read-after-write lag, retry rather than give up immediately.
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}
