//! Standalone reimplementation of `address_to_field`, matching
//! `stellar_tokens::confidential::storage::address_to_field` byte-for-byte
//! (validated against OpenZeppelin's own committed test vectors in
//! `packages/tokens/src/confidential/circuits/lib/testdata/address_to_field.json`
//! before being trusted against any live contract). See
//! `docs/research/step3b-address-to-field.md` for the full writeup.
//!
//! Usage: `cargo run --bin address_to_field -- <strkey>`
//! Prints the resulting 32-byte big-endian field element as `0x...` hex.

use soroban_poseidon::poseidon2_hash;
use soroban_sdk::{crypto::bn254::Bn254Fr, Address, Bytes, Env, U256};

const STRKEY_LEN: usize = 56;
const STRKEY_LIMB_LEN: usize = 28;
const DELTA_ADDR: u32 = 1;

fn le_bytes_to_u256(e: &Env, le: &[u8]) -> U256 {
    let mut be = [0u8; 32];
    for (i, b) in le.iter().enumerate() {
        be[31 - i] = *b;
    }
    U256::from_be_bytes(e, &Bytes::from_array(e, &be))
}

fn address_to_field(e: &Env, addr: &Address) -> [u8; 32] {
    let strkey = addr.to_string();
    let mut buf = [0u8; STRKEY_LEN];
    strkey.copy_into_slice(&mut buf);

    let lo = le_bytes_to_u256(e, &buf[..STRKEY_LIMB_LEN]);
    let hi = le_bytes_to_u256(e, &buf[STRKEY_LIMB_LEN..]);

    let inputs = soroban_sdk::vec![e, U256::from_u32(e, DELTA_ADDR), lo, hi];
    let hash: U256 = poseidon2_hash::<4, Bn254Fr>(e, &inputs);
    let bytes = hash.to_be_bytes();
    let mut out = [0u8; 32];
    bytes.copy_into_slice(&mut out);
    out
}

fn address_from_strkey(e: &Env, strkey: &str) -> Address {
    Address::from_str(e, strkey)
}

fn main() {
    let e = Env::default();

    // Self-check against OZ's own committed test vectors before trusting
    // this for anything real.
    let vectors: [(&str, &str); 2] = [
        (
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
            "0x1d3b0901201ea22ad61ed4600b49dee57bb73369bf07bdeab17cbf0e54debd4f",
        ),
        (
            "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
            "0x1997b0390a25f684e91575771f4c3ca72ac8f20f45a462838ea918bbe8c4e19c",
        ),
    ];
    for (strkey, expected) in vectors {
        let addr = address_from_strkey(&e, strkey);
        let got = address_to_field(&e, &addr);
        let got_hex = format!("0x{}", hex::encode(got));
        assert_eq!(got_hex, expected, "MISMATCH for {strkey}: got {got_hex}, want {expected}");
        eprintln!("[self-check OK] {strkey} -> {got_hex}");
    }

    let args: std::vec::Vec<std::string::String> = std::env::args().collect();
    if let Some(strkey) = args.get(1) {
        let addr = address_from_strkey(&e, strkey);
        let field = address_to_field(&e, &addr);
        println!("0x{}", hex::encode(field));
    }
}
