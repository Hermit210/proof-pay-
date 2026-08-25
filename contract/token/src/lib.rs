//! ProofPay Confidential Token
//!
//! Thin wrapper around OpenZeppelin's `ConfidentialToken` trait
//! (`stellar_tokens::confidential`). Holds no logic of its own beyond wiring
//! the three collaborator addresses (underlying SEP-41 asset, verifier
//! registry, auditor registry) at construction and delegating every entry
//! point to the trait's default bodies via `NoHooks`.
//!
//! ProofPay's threshold-proof mechanism (`BalanceThreshold`) is deliberately
//! NOT part of this contract — it reads this contract's `confidential_balance`
//! externally and verifies its own proof through a separate, standalone
//! verifier contract. See `../threshold_verifier` and
//! `docs/research/step1-confidential-token-research.md` for why: the two
//! proof-carrying operations this MVP needs (Register here, and
//! BalanceThreshold) individually fit Soroban's per-tx CPU budget but cannot
//! share a transaction, so keeping BalanceThreshold as its own contract call
//! is a structural requirement, not a stylistic choice.
#![no_std]

// `Bytes`, `ConfidentialAccount`, `SpenderDelegation` are unused directly in
// this file, but must be in scope: the `#[contracttrait]` macro's generated
// default-method glue for `ConfidentialToken` references them unqualified.
use soroban_sdk::{contract, contractimpl, Address, Bytes, Env};
use stellar_tokens::confidential::{
    storage as token_storage, ConfidentialAccount, ConfidentialToken, NoHooks, SpenderDelegation,
};

#[contract]
pub struct ProofPayToken;

#[contractimpl]
impl ProofPayToken {
    /// # Security Warning
    ///
    /// No auth is required here because this only runs once, atomically,
    /// during contract deployment (Soroban's constructor convention) --
    /// there is no window where an unauthorized party could call this
    /// instead of the deployer.
    pub fn __constructor(
        e: &Env,
        underlying_asset: Address,
        verifier: Address,
        auditor: Address,
    ) {
        token_storage::set_underlying_asset(e, &underlying_asset);
        token_storage::set_verifier(e, &verifier);
        token_storage::set_auditor(e, &auditor);
        token_storage::set_address_as_field_element(e);
    }
}

#[contractimpl(contracttrait)]
impl ConfidentialToken for ProofPayToken {
    type Hooks = NoHooks;
}
