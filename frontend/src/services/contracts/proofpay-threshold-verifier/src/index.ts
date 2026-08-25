import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCIZWGDUTKWELJWHGRM2DSWBOW247RS75POK4FTHIRU6OGYHDCR4JM34",
  }
} as const

export const Errors = {
  /**
   * VK byte slice does not match the expected exact length.
   */
  1: {message:"VkInvalidLength"},
  /**
   * VK header contains out-of-range structural parameters.
   */
  2: {message:"VkInvalidParameters"},
  /**
   * Proof byte slice does not match the expected exact length.
   */
  3: {message:"ProofInvalidLength"},
  /**
   * Constructor has already run; the VK is immutable.
   */
  4: {message:"AlreadyInitialized"}
}

export interface Client {
  /**
   * Construct and simulate a vk_bytes transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns the stored verification key bytes, for callers to
   * independently confirm which circuit this contract verifies against.
   */
  vk_bytes: (options?: MethodOptions) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a verify_proof transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Verifies a BalanceThreshold proof against the stored VK. Returns
   * `true` iff the proof is valid for `public_inputs` -- i.e. the prover
   * genuinely knows an opening of the on-chain spendable-balance
   * commitment whose value is >= the threshold encoded in
   * `public_inputs`, without revealing that value.
   */
  verify_proof: ({public_inputs, proof}: {public_inputs: Buffer, proof: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {vk_bytes}: {vk_bytes: Buffer},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({vk_bytes}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABAAAADdWSyBieXRlIHNsaWNlIGRvZXMgbm90IG1hdGNoIHRoZSBleHBlY3RlZCBleGFjdCBsZW5ndGguAAAAAA9Wa0ludmFsaWRMZW5ndGgAAAAAAQAAADZWSyBoZWFkZXIgY29udGFpbnMgb3V0LW9mLXJhbmdlIHN0cnVjdHVyYWwgcGFyYW1ldGVycy4AAAAAABNWa0ludmFsaWRQYXJhbWV0ZXJzAAAAAAIAAAA6UHJvb2YgYnl0ZSBzbGljZSBkb2VzIG5vdCBtYXRjaCB0aGUgZXhwZWN0ZWQgZXhhY3QgbGVuZ3RoLgAAAAAAElByb29mSW52YWxpZExlbmd0aAAAAAAAAwAAADFDb25zdHJ1Y3RvciBoYXMgYWxyZWFkeSBydW47IHRoZSBWSyBpcyBpbW11dGFibGUuAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAABA==",
        "AAAAAAAAAH1SZXR1cm5zIHRoZSBzdG9yZWQgdmVyaWZpY2F0aW9uIGtleSBieXRlcywgZm9yIGNhbGxlcnMgdG8KaW5kZXBlbmRlbnRseSBjb25maXJtIHdoaWNoIGNpcmN1aXQgdGhpcyBjb250cmFjdCB2ZXJpZmllcyBhZ2FpbnN0LgAAAAAAAAh2a19ieXRlcwAAAAAAAAABAAAADg==",
        "AAAAAAAAASdWZXJpZmllcyBhIEJhbGFuY2VUaHJlc2hvbGQgcHJvb2YgYWdhaW5zdCB0aGUgc3RvcmVkIFZLLiBSZXR1cm5zCmB0cnVlYCBpZmYgdGhlIHByb29mIGlzIHZhbGlkIGZvciBgcHVibGljX2lucHV0c2AgLS0gaS5lLiB0aGUgcHJvdmVyCmdlbnVpbmVseSBrbm93cyBhbiBvcGVuaW5nIG9mIHRoZSBvbi1jaGFpbiBzcGVuZGFibGUtYmFsYW5jZQpjb21taXRtZW50IHdob3NlIHZhbHVlIGlzID49IHRoZSB0aHJlc2hvbGQgZW5jb2RlZCBpbgpgcHVibGljX2lucHV0c2AsIHdpdGhvdXQgcmV2ZWFsaW5nIHRoYXQgdmFsdWUuAAAAAAx2ZXJpZnlfcHJvb2YAAAACAAAAAAAAAA1wdWJsaWNfaW5wdXRzAAAAAAAADgAAAAAAAAAFcHJvb2YAAAAAAAAOAAAAAQAAA+kAAAABAAAAAw==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAEAAAAAAAAACHZrX2J5dGVzAAAADgAAAAEAAAPpAAAAAgAAAAM=" ]),
      options
    )
  }
  public readonly fromJSON = {
    vk_bytes: this.txFromJSON<Buffer>,
        verify_proof: this.txFromJSON<Result<boolean>>
  }
}