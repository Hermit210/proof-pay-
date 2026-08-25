//! ProofPay Verifier Registry
//!
//! Implements OpenZeppelin's `ConfidentialVerifier` trait
//! (`stellar_tokens::confidential::verifier`) with a real backend:
//! `verify_proof` constructs an `ultrahonk_soroban_verifier::UltraHonkVerifier`
//! from whichever verification key is registered for the requested
//! `CircuitType` and runs genuine UltraHonk verification against it -- this
//! deliberately does NOT stub or hardcode a `true`/`false` return for any
//! circuit type. If no key is registered for a `CircuitType`, the call panics
//! with `VerificationKeyNotRegistered` (the trait's own documented behavior)
//! rather than silently succeeding.
//!
//! # ⚠️ Not Production Ready
//!
//! Same status as the OpenZeppelin trait this implements: the UltraHonk
//! backend is an unaudited developer preview. See
//! `docs/research/step1-confidential-token-research.md` for the specific,
//! verified caveat that matters most here -- this backend implements only
//! the non-ZK UltraHonk flavor (no hiding polynomial), so proof-transcript
//! zero-knowledge is not provided; privacy for ProofPay's threshold proof
//! currently rests on the Pedersen commitment's own hiding property.
#![no_std]

// `Vec` is unused directly in this file, but must be in scope: the
// `#[contracttrait]` macro's generated default-method glue for
// `ConfidentialVerifier` references it unqualified.
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Bytes, Env, Symbol, Vec};
use stellar_access::access_control::{self as access_control, AccessControl};
use stellar_macros::only_role;
use stellar_tokens::confidential::verifier::{
    self as verifier_storage, CircuitType, ConfidentialVerifier,
};
use ultrahonk_soroban_verifier::UltraHonkVerifier;

#[cfg(test)]
mod test;

const MANAGER_ROLE: Symbol = symbol_short!("manager");

#[contract]
pub struct ProofPayVerifier;

#[contractimpl]
impl ProofPayVerifier {
    /// # Security Warning
    ///
    /// No auth required: runs once, atomically, during deployment.
    pub fn __constructor(e: &Env, admin: Address, manager: Address) {
        access_control::set_admin(e, &admin);
        access_control::grant_role_no_auth(e, &manager, &MANAGER_ROLE, &admin);
    }
}

#[contractimpl(contracttrait)]
impl ConfidentialVerifier for ProofPayVerifier {
    #[only_role(operator, "manager")]
    fn register_verification_key(
        e: &Env,
        circuit_type: CircuitType,
        verification_key: Bytes,
        operator: Address,
    ) {
        verifier_storage::register_verification_key(e, circuit_type, &verification_key);
    }

    #[only_role(operator, "manager")]
    fn update_verification_key(
        e: &Env,
        circuit_type: CircuitType,
        new_verification_key: Bytes,
        operator: Address,
    ) {
        verifier_storage::update_verification_key(e, circuit_type, &new_verification_key);
    }

    fn verify_proof(e: &Env, circuit_type: CircuitType, public_inputs: Bytes, proof: Bytes) -> bool {
        let vk_bytes = verifier_storage::get_verification_key(e, circuit_type);
        let Ok(verifier) = UltraHonkVerifier::new(e, &vk_bytes) else {
            return false;
        };
        verifier.verify(e, &proof, &public_inputs).is_ok()
    }
}

#[contractimpl(contracttrait)]
impl AccessControl for ProofPayVerifier {}
