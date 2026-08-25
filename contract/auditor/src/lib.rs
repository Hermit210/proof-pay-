//! ProofPay Auditor Registry
//!
//! Thin wrapper around OpenZeppelin's `ConfidentialAuditor` trait
//! (`stellar_tokens::confidential::auditor`), mirroring their own reference
//! example (`examples/confidential/auditor` in the vendored source this
//! crate depends on) exactly: role-gated key registration/rotation, no
//! logic of its own.
//!
//! ProofPay's v1 threshold-proof mechanism does not use auditor
//! decryption at all -- see `docs/research/step1-confidential-token-research.md`
//! for the scope decision (threshold-only privacy, deposit-based income,
//! no confidential-transfer auditing needed). This contract exists only
//! because `ConfidentialToken::register` requires an `auditor_id` that
//! resolves against a real deployed auditor registry; it is not part of
//! ProofPay's privacy claim.
#![no_std]

// `Vec` is unused directly in this file, but must be in scope: the
// `#[contracttrait]` macro's generated default-method glue for
// `AccessControl` references it unqualified (same requirement noted in
// `contract/verifier/src/lib.rs`).
use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, Symbol, Vec};
use stellar_access::access_control::{self as access_control, AccessControl};
use stellar_macros::only_role;
use stellar_tokens::confidential::auditor::{storage as auditor, ConfidentialAuditor};

const MANAGER_ROLE: Symbol = symbol_short!("manager");

#[contract]
pub struct ProofPayAuditor;

#[contractimpl]
impl ProofPayAuditor {
    /// # Security Warning
    ///
    /// No auth required: runs once, atomically, during deployment.
    pub fn __constructor(e: &Env, admin: Address, manager: Address) {
        access_control::set_admin(e, &admin);
        access_control::grant_role_no_auth(e, &manager, &MANAGER_ROLE, &admin);
    }
}

#[contractimpl(contracttrait)]
impl ConfidentialAuditor for ProofPayAuditor {
    #[only_role(operator, "manager")]
    fn register_key(e: &Env, auditor_id: u32, point: BytesN<64>, operator: Address) {
        auditor::register_key(e, auditor_id, &point);
    }

    #[only_role(operator, "manager")]
    fn rotate_key(e: &Env, auditor_id: u32, new_point: BytesN<64>, operator: Address) {
        auditor::rotate_key(e, auditor_id, &new_point);
    }
}

#[contractimpl(contracttrait)]
impl AccessControl for ProofPayAuditor {}
