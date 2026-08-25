// Freighter wallet integration. Every function here surfaces a distinct,
// handleable failure mode (not installed / not connected / wrong network)
// rather than letting a raw rejection reach the UI unexplained.

import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  setAllowed,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api";

export class FreighterNotInstalledError extends Error {
  constructor() {
    super("Freighter wallet extension is not installed.");
    this.name = "FreighterNotInstalledError";
  }
}

export class WrongNetworkError extends Error {
  constructor(
    public readonly connectedTo: string,
    public readonly expected: string,
  ) {
    super(`Freighter is connected to "${connectedTo}", but ProofPay needs "${expected}".`);
    this.name = "WrongNetworkError";
  }
}

export function isFreighterInstalled(): boolean {
  return typeof window !== "undefined" && window.freighter === true;
}

export async function connectWallet(): Promise<string> {
  if (!isFreighterInstalled()) {
    throw new FreighterNotInstalledError();
  }
  const connected = await isConnected();
  if (connected.error) throw new Error(connected.error.message);

  await setAllowed();
  const access = await requestAccess();
  if (access.error) throw new Error(access.error.message);
  return access.address;
}

export async function getConnectedAddress(): Promise<string | null> {
  if (!isFreighterInstalled()) return null;
  const result = await getAddress();
  if (result.error || !result.address) return null;
  return result.address;
}

export async function assertNetwork(expectedPassphrase: string): Promise<void> {
  const details = await getNetworkDetails();
  if (details.error) throw new Error(details.error.message);
  if (details.networkPassphrase !== expectedPassphrase) {
    throw new WrongNetworkError(details.network, expectedPassphrase);
  }
}

export async function signTransactionXdr(
  xdr: string,
  networkPassphrase: string,
  address: string,
): Promise<string> {
  const result = await freighterSignTransaction(xdr, { networkPassphrase, address });
  if (result.error) throw new Error(result.error.message);
  return result.signedTxXdr;
}
