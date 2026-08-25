// Wires the generated TS contract bindings (`stellar contract bindings
// typescript`, one per deployed contract -- see docs/deployment/testnet.md
// for the real addresses) to Freighter for signing.

import { Client as TokenClient } from "./proofpay-token/src/index";
import { Client as VerifierClient } from "./proofpay-verifier/src/index";
import { Client as ThresholdVerifierClient } from "./proofpay-threshold-verifier/src/index";
import { Client as AuditorClient } from "./proofpay-auditor/src/index";
import { signTransaction } from "@stellar/freighter-api";
import type { AppEnv } from "../env";

export function makeTokenClient(env: AppEnv, publicKey?: string) {
  return new TokenClient({
    contractId: env.tokenContractId,
    networkPassphrase: env.networkPassphrase,
    rpcUrl: env.sorobanRpcUrl,
    publicKey,
    signTransaction,
  });
}

export function makeVerifierClient(env: AppEnv, publicKey?: string) {
  return new VerifierClient({
    contractId: env.verifierContractId,
    networkPassphrase: env.networkPassphrase,
    rpcUrl: env.sorobanRpcUrl,
    publicKey,
    signTransaction,
  });
}

export function makeThresholdVerifierClient(env: AppEnv, publicKey?: string) {
  return new ThresholdVerifierClient({
    contractId: env.thresholdVerifierContractId,
    networkPassphrase: env.networkPassphrase,
    rpcUrl: env.sorobanRpcUrl,
    publicKey,
    signTransaction,
  });
}

export function makeAuditorClient(env: AppEnv, publicKey?: string) {
  return new AuditorClient({
    contractId: env.auditorContractId,
    networkPassphrase: env.networkPassphrase,
    rpcUrl: env.sorobanRpcUrl,
    publicKey,
    signTransaction,
  });
}
