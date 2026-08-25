//! Real end-to-end tests for `ProofPayThresholdVerifier` -- this is
//! ProofPay's actual privacy mechanism, so unlike `token`/`verifier`'s unit
//! tests, no mocks: these run a genuine UltraHonk proof through the real
//! verifier crate.
//!
//! Fixtures in `tests/fixtures/` were generated for real via the pinned
//! toolchain (`nargo 1.0.0-beta.9`, `bb 0.87.0`) against the circuit at
//! `../circuits/balance_threshold`, witness `sk=1, addr_f=1, v_s=500,
//! r_s=7, threshold=300` (from that circuit's `Prover.toml` -- passes,
//! since 500 >= 300). To regenerate: from
//! `contract/circuits/balance_threshold`, `nargo execute witness_success`,
//! then `bb prove -s ultra_honk --oracle_hash keccak -b
//! target/proofpay_balance_threshold.json -w target/witness_success.gz -o
//! target/proof_success` and `bb write_vk -s ultra_honk --oracle_hash
//! keccak -b target/proofpay_balance_threshold.json -o target/vk_success`.
//!
//! The below-threshold case (`v_s=200 < threshold=300`, see
//! `Prover_below_threshold.toml` in that same circuit directory) has no
//! fixture here deliberately: `nargo execute --prover-name
//! Prover_below_threshold` fails at the DB4 constraint with "Cannot
//! satisfy constraint" -- you cannot even generate a witness, let alone a
//! proof, for a false statement. That's a stronger guarantee than "the
//! verifier rejects it", and it isn't something a Rust test can exercise
//! (there is no proof to feed the verifier). What Rust tests exercise here
//! instead is the verifier's rejection of a well-formed-but-wrong proof:
//! tampering a byte of a valid proof, and feeding a valid proof against
//! the wrong public inputs.

use proofpay_threshold_verifier::{Error, ProofPayThresholdVerifier, ProofPayThresholdVerifierClient};
use soroban_sdk::{Bytes, Env};

const VK: &[u8] = include_bytes!("fixtures/vk");
const PROOF_SUCCESS: &[u8] = include_bytes!("fixtures/proof_success");
const PUBLIC_INPUTS_SUCCESS: &[u8] = include_bytes!("fixtures/public_inputs_success");

fn deploy<'a>(e: &'a Env, vk: &[u8]) -> ProofPayThresholdVerifierClient<'a> {
    let vk_bytes = Bytes::from_slice(e, vk);
    let addr = e.register(ProofPayThresholdVerifier, (vk_bytes,));
    ProofPayThresholdVerifierClient::new(e, &addr)
}

#[test]
fn verifies_a_real_proof_that_the_balance_clears_the_threshold() {
    let e = Env::default();
    let client = deploy(&e, VK);

    let proof = Bytes::from_slice(&e, PROOF_SUCCESS);
    let public_inputs = Bytes::from_slice(&e, PUBLIC_INPUTS_SUCCESS);

    let result = client.verify_proof(&public_inputs, &proof);
    assert_eq!(result, true);
}

#[test]
fn rejects_a_tampered_proof() {
    let e = Env::default();
    let client = deploy(&e, VK);

    let mut tampered = PROOF_SUCCESS.to_vec();
    // Flip a byte in the middle of the proof -- past the length-sensitive
    // header, deep enough to land inside the actual proof data.
    tampered[7000] ^= 0xFF;
    let proof = Bytes::from_slice(&e, &tampered);
    let public_inputs = Bytes::from_slice(&e, PUBLIC_INPUTS_SUCCESS);

    let result = client.verify_proof(&public_inputs, &proof);
    assert_eq!(result, false);
}

#[test]
fn rejects_a_valid_proof_against_mismatched_public_inputs() {
    let e = Env::default();
    let client = deploy(&e, VK);

    // A real proof is bound to the specific public inputs it was generated
    // against (pvk, c_spend, addr_f, threshold). Feeding it a threshold of
    // 301 instead of the 300 it was actually proved against must fail --
    // otherwise the "threshold" in the proof would be meaningless.
    let mut mismatched = PUBLIC_INPUTS_SUCCESS.to_vec();
    let last = mismatched.len() - 1;
    mismatched[last] ^= 0x01;
    let public_inputs = Bytes::from_slice(&e, &mismatched);
    let proof = Bytes::from_slice(&e, PROOF_SUCCESS);

    let result = client.verify_proof(&public_inputs, &proof);
    assert_eq!(result, false);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn wrong_length_proof_is_rejected_before_verification() {
    // Error::ProofInvalidLength = 3. Using the panicking client method
    // (not try_verify_proof) matches this repo's existing convention for
    // asserting on a specific contract error code -- see
    // `token/src/test.rs` and `verifier/src/test.rs`.
    let e = Env::default();
    let client = deploy(&e, VK);

    let short_proof = Bytes::from_slice(&e, &[0u8; 100]);
    let public_inputs = Bytes::from_slice(&e, PUBLIC_INPUTS_SUCCESS);

    client.verify_proof(&public_inputs, &short_proof);
}

#[test]
fn garbage_vk_is_rejected_at_construction() {
    // Constructor errors surface as a panic through `Env::register`'s test
    // harness (there's no fallible `try_register`); catch_unwind is the
    // correct way to assert "deployment with this VK must fail" here.
    let e = Env::default();
    let vk_bytes = Bytes::from_slice(&e, &[0xAB; 16]);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        e.register(ProofPayThresholdVerifier, (vk_bytes.clone(),))
    }));
    assert!(result.is_err());
}

#[test]
fn constructing_a_second_time_is_rejected() {
    let e = Env::default();
    let client = deploy(&e, VK);
    let vk_bytes = Bytes::from_slice(&e, VK);

    let result: Result<(), Error> = e.as_contract(&client.address, || {
        ProofPayThresholdVerifier::__constructor(e.clone(), vk_bytes.clone())
    });
    assert_eq!(result, Err(Error::AlreadyInitialized));
}
