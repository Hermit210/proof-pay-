//! ProofPay Threshold Verifier
//!
//! Standalone contract that verifies a BalanceThreshold proof (the Noir
//! circuit in `../circuits/balance_threshold`) against an immutable
//! verification key set at deployment. Deliberately NOT part of
//! `ConfidentialVerifier`/`CircuitType` -- that enum is closed to
//! OpenZeppelin's 6 built-in circuits, and this predicate isn't one of
//! them; it's ProofPay's own standalone eligibility check, so it gets its
//! own tiny contract rather than being forced into the token verifier's
//! shape. See `docs/research/step1-confidential-token-research.md` for why:
//! this and Register verification each individually fit Soroban's per-tx
//! CPU budget but cannot share a transaction, so keeping this as its own
//! contract call is structural, not stylistic.
//!
//! Modeled on (not a dependency of) `NethermindEth/rs-soroban-ultrahonk`'s
//! own reference `UltraHonkVerifierContract`
//! (`contracts/rs-soroban-ultrahonk/src/lib.rs`) -- same trust model and
//! shape (VK is immutable, set once at construction, no admin/upgrade path;
//! the deployer alone is responsible for deploying with the correct VK),
//! reimplemented natively here for two reasons: that crate is a reference
//! example, not a published library meant for downstream reuse, and this
//! keeps the verify_proof code path visibly consistent with
//! `contract/verifier`'s (both call `ultrahonk_soroban_verifier` the same
//! way), rather than mixing two different call conventions in one codebase.
#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, symbol_short, Bytes, Env, Symbol};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// VK byte slice does not match the expected exact length.
    VkInvalidLength = 1,
    /// VK header contains out-of-range structural parameters.
    VkInvalidParameters = 2,
    /// Proof byte slice does not match the expected exact length.
    ProofInvalidLength = 3,
    /// Constructor has already run; the VK is immutable.
    AlreadyInitialized = 4,
}

fn vk_key() -> Symbol {
    symbol_short!("vk")
}

/// # Security Warning
///
/// This contract has no admin, no governance, and no upgrade path by
/// design -- the verification key is fixed at deployment and can never
/// change. Anyone can deploy an instance with an arbitrary VK; callers MUST
/// independently confirm the VK bytes (`vk_bytes`) correspond to the real,
/// audited-as-far-as-this-preview-goes BalanceThreshold circuit before
/// trusting any `verify_proof` result from a given contract address. Do not
/// treat the address alone as a trust anchor.
#[contract]
pub struct ProofPayThresholdVerifier;

#[contractimpl]
impl ProofPayThresholdVerifier {
    pub fn __constructor(e: Env, vk_bytes: Bytes) -> Result<(), Error> {
        if e.storage().instance().has(&vk_key()) {
            return Err(Error::AlreadyInitialized);
        }
        UltraHonkVerifier::new(&e, &vk_bytes).map_err(|err| match err {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;
        e.storage().instance().set(&vk_key(), &vk_bytes);
        Ok(())
    }

    /// Returns the stored verification key bytes, for callers to
    /// independently confirm which circuit this contract verifies against.
    pub fn vk_bytes(e: Env) -> Bytes {
        e.storage().instance().get(&vk_key()).unwrap_or_else(|| Bytes::new(&e))
    }

    /// Verifies a BalanceThreshold proof against the stored VK. Returns
    /// `true` iff the proof is valid for `public_inputs` -- i.e. the prover
    /// genuinely knows an opening of the on-chain spendable-balance
    /// commitment whose value is >= the threshold encoded in
    /// `public_inputs`, without revealing that value.
    pub fn verify_proof(e: Env, public_inputs: Bytes, proof: Bytes) -> Result<bool, Error> {
        if proof.len() as usize != PROOF_BYTES {
            return Err(Error::ProofInvalidLength);
        }
        let vk_bytes: Bytes = e
            .storage()
            .instance()
            .get(&vk_key())
            .ok_or(Error::VkInvalidLength)?;
        let verifier = UltraHonkVerifier::new(&e, &vk_bytes).map_err(|err| match err {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;
        Ok(verifier.verify(&e, &proof, &public_inputs).is_ok())
    }
}
