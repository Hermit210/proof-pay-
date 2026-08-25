//! Tests for `ProofPayToken`. Follows the exact setup conventions used by
//! OpenZeppelin's own `stellar_tokens::confidential` test suite
//! (`packages/tokens/src/confidential/test.rs` in the vendored source this
//! crate depends on): a `MockVerifier` that accepts any proof stands in for
//! real UltraHonk verification here, because these tests are about
//! `ProofPayToken`'s wiring (constructor, deposit/merge bookkeeping), not
//! about proof verification itself -- that's covered with REAL proofs in
//! `contract/threshold_verifier`, which is ProofPay's actual privacy
//! mechanism. Using a mock here is the same choice upstream makes for the
//! same reason, not a shortcut specific to this crate.
extern crate std;

use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, token::StellarAssetClient, xdr::ToXdr,
    Address, Bytes, BytesN, Env,
};
use stellar_tokens::confidential::{
    auditor::{self as auditor_storage, ConfidentialAuditor},
    verifier::{CircuitType, ConfidentialVerifier},
    ConfidentialTokenClient, RegisterData, RegisterPayload,
};

use crate::ProofPayToken;

/// Grumpkin generator `G = (1, Y)`, same fixture upstream uses -- canonical
/// on-curve point, needed because `append_point` rejects non-canonical
/// coordinates before any proof logic runs.
const GRUMPKIN_G_BYTES: [u8; 64] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xcf, 0x13, 0x5e, 0x75, 0x06, 0xa4, 0x5d, 0x63,
    0x2d, 0x27, 0x0d, 0x45, 0xf1, 0x18, 0x12, 0x94, 0x83, 0x3f, 0xc4, 0x8d, 0x82, 0x3f, 0x27, 0x2c,
];

fn fixture_point(e: &Env) -> BytesN<64> {
    BytesN::from_array(e, &GRUMPKIN_G_BYTES)
}

#[contract]
struct MockVerifier;

#[contractimpl(contracttrait)]
impl ConfidentialVerifier for MockVerifier {
    fn register_verification_key(_e: &Env, _ct: CircuitType, _vk: Bytes, _op: Address) {}
    fn update_verification_key(_e: &Env, _ct: CircuitType, _vk: Bytes, _op: Address) {}
    fn verify_proof(_e: &Env, _ct: CircuitType, _pi: Bytes, _proof: Bytes) -> bool {
        true
    }
}

#[contract]
struct MockAuditor;

#[contractimpl(contracttrait)]
impl ConfidentialAuditor for MockAuditor {
    fn register_key(e: &Env, auditor_id: u32, point: BytesN<64>, _operator: Address) {
        auditor_storage::register_key(e, auditor_id, &point);
    }
    fn rotate_key(e: &Env, auditor_id: u32, new_point: BytesN<64>, _operator: Address) {
        auditor_storage::rotate_key(e, auditor_id, &new_point);
    }
}

struct Harness<'a> {
    e: Env,
    token: ConfidentialTokenClient<'a>,
    token_addr: Address,
    sac: StellarAssetClient<'a>,
}

fn setup<'a>() -> Harness<'a> {
    let e = Env::default();
    e.mock_all_auths();

    let token_admin = Address::generate(&e);
    let sac = e.register_stellar_asset_contract_v2(token_admin);
    let sac_addr = sac.address();
    let sac_client = StellarAssetClient::new(&e, &sac_addr);

    let verifier_addr = e.register(MockVerifier, ());

    let auditor_addr = e.register(MockAuditor, ());
    let auditor_client =
        stellar_tokens::confidential::auditor::ConfidentialAuditorClient::new(&e, &auditor_addr);
    auditor_client.register_key(&1u32, &fixture_point(&e), &Address::generate(&e));

    let token_addr = e.register(ProofPayToken, (sac_addr.clone(), verifier_addr, auditor_addr));
    let token = ConfidentialTokenClient::new(&e, &token_addr);

    Harness { e, token, token_addr, sac: sac_client }
}

fn register_data(e: &Env) -> Bytes {
    RegisterData {
        payload: RegisterPayload { y: fixture_point(e), pvk: fixture_point(e) },
        proof: Bytes::new(e),
    }
    .to_xdr(e)
}

#[test]
fn deposit_credits_receiving_balance() {
    let h = setup();
    let alice = Address::generate(&h.e);
    let depositor = Address::generate(&h.e);

    h.token.register(&alice, &1u32, &register_data(&h.e));
    h.sac.mint(&depositor, &1_000i128);

    h.token.deposit(&depositor, &alice, &500i128);

    let account = h.token.confidential_balance(&alice);
    assert_ne!(account.receiving_commitment.to_array(), [0u8; 64]);

    let token_client = soroban_sdk::token::TokenClient::new(&h.e, &h.sac.address);
    assert_eq!(token_client.balance(&h.token_addr), 500);
}

#[test]
#[should_panic(expected = "Error(Contract, #3501)")]
fn deposit_to_unregistered_recipient_panics() {
    let h = setup();
    let depositor = Address::generate(&h.e);
    let unknown = Address::generate(&h.e);

    h.sac.mint(&depositor, &10i128);
    h.token.deposit(&depositor, &unknown, &5i128);
}

#[test]
fn merge_folds_receiving_into_spendable() {
    let h = setup();
    let alice = Address::generate(&h.e);
    let depositor = Address::generate(&h.e);

    h.token.register(&alice, &1u32, &register_data(&h.e));
    h.sac.mint(&depositor, &1_000i128);
    h.token.deposit(&depositor, &alice, &500i128);

    let pre = h.token.confidential_balance(&alice);
    h.token.merge(&alice);
    let post = h.token.confidential_balance(&alice);

    // Spendable now equals the prior receiving balance (prior spendable was
    // identity), which is exactly what ProofPay's threshold circuit later
    // opens a commitment against -- this is the join point between the
    // token contract and the standalone threshold verifier.
    assert_eq!(post.spendable_commitment, pre.receiving_commitment);
    assert_eq!(post.receiving_commitment.to_array(), [0u8; 64]);
}
