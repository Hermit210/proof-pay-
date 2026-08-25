//! Tests for `ProofPayVerifier`'s access control and its
//! "don't fake support for circuits we don't use" behavior. Real UltraHonk
//! `verify_proof` correctness against a real proof is covered end-to-end in
//! `contract/threshold_verifier` (which calls the same
//! `ultrahonk_soroban_verifier` crate the same way); this file is about the
//! wrapper's own logic -- who may register/update keys, and what happens
//! when a `CircuitType` has no key registered at all.
extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Bytes, Env};
use stellar_tokens::confidential::verifier::CircuitType;

use crate::ProofPayVerifier;

struct Harness {
    e: Env,
    client: crate::ProofPayVerifierClient<'static>,
    admin: Address,
    manager: Address,
    stranger: Address,
}

fn setup() -> Harness {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let manager = Address::generate(&e);
    let stranger = Address::generate(&e);

    let addr = e.register(ProofPayVerifier, (admin.clone(), manager.clone()));
    let client = crate::ProofPayVerifierClient::new(&e, &addr);

    Harness { e, client, admin, manager, stranger }
}

/// Structurally invalid VK bytes are fine for these tests: registration
/// itself does no parsing (parsing happens lazily inside `verify_proof`,
/// via `UltraHonkVerifier::new`), so any non-empty byte string exercises
/// the access-control path being tested here without needing a real VK.
fn dummy_vk(e: &Env) -> Bytes {
    Bytes::from_slice(e, &[0xAB; 32])
}

#[test]
fn manager_can_register_and_update_key() {
    let h = setup();
    let vk = dummy_vk(&h.e);

    h.client.register_verification_key(&CircuitType::Register, &vk, &h.manager);

    let stored = h.client.get_verification_key(&CircuitType::Register);
    assert_eq!(stored, vk);

    let new_vk = Bytes::from_slice(&h.e, &[0xCD; 32]);
    h.client.update_verification_key(&CircuitType::Register, &new_vk, &h.manager);
    assert_eq!(h.client.get_verification_key(&CircuitType::Register), new_vk);
}

#[test]
#[should_panic(expected = "Error(Contract, #2000)")]
fn non_manager_cannot_register_key() {
    let h = setup();
    let vk = dummy_vk(&h.e);
    h.client.register_verification_key(&CircuitType::Register, &vk, &h.stranger);
}

#[test]
#[should_panic(expected = "Error(Contract, #2000)")]
fn non_manager_cannot_update_key() {
    let h = setup();
    let vk = dummy_vk(&h.e);
    h.client.register_verification_key(&CircuitType::Register, &vk, &h.manager);
    h.client.update_verification_key(&CircuitType::Register, &vk, &h.stranger);
}

#[test]
#[should_panic(expected = "Error(Contract, #3401)")]
fn verify_proof_against_unregistered_circuit_type_panics() {
    // No key has been registered for any CircuitType. The trait's own
    // documented behavior (VerificationKeyNotRegistered, #3401) must fire --
    // this contract must NOT silently return `true`/`false` for a circuit
    // it was never given a key for.
    let h = setup();
    let pi = Bytes::new(&h.e);
    let proof = Bytes::new(&h.e);
    h.client.verify_proof(&CircuitType::Withdraw, &pi, &proof);
}

#[test]
fn verify_proof_with_garbage_vk_and_proof_returns_false_not_panic() {
    // A registered-but-structurally-invalid VK, fed a garbage proof, must
    // fail verification cleanly (`false`) rather than panicking -- confirms
    // `verify_proof`'s `let Ok(verifier) = ... else { return false }` path,
    // not just the happy path exercised by threshold_verifier's real-proof
    // tests.
    let h = setup();
    let vk = dummy_vk(&h.e);
    h.client.register_verification_key(&CircuitType::Register, &vk, &h.manager);

    let pi = Bytes::new(&h.e);
    let proof = Bytes::new(&h.e);
    let result = h.client.verify_proof(&CircuitType::Register, &pi, &proof);
    assert!(!result);
}

#[test]
fn admin_is_the_constructor_admin() {
    let h = setup();
    assert_eq!(h.client.get_admin(), Some(h.admin.clone()));
}
