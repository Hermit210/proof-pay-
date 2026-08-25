//! Builds the XDR-encoded `data: Bytes` argument `ConfidentialToken::register`
//! expects, from real proof-generation output, so it can be passed straight
//! to `stellar contract invoke -- register --data <hex>`.
//!
//! `RegisterPayload { y: Point, pvk: Point }` where `Point = BytesN<64>` is
//! `be_bytes(x) || be_bytes(y)` (`stellar_contract_utils::crypto::grumpkin`
//! doc comment) -- not two separate Field public inputs re-packed, a single
//! 64-byte concatenation per point.
//!
//! Usage: `cargo run --bin register_payload -- <y_x_hex32> <y_y_hex32>
//! <pvk_x_hex32> <pvk_y_hex32> <proof_file>`
//! Each hex arg is a 32-byte big-endian field element, with or without a
//! leading `0x`. Prints the resulting XDR bytes as `0x...` hex on stdout.

use soroban_sdk::{xdr::ToXdr, Bytes, BytesN, Env};
use stellar_tokens::confidential::{RegisterData, RegisterPayload};

fn parse_field32(s: &str) -> [u8; 32] {
    let s = s.trim_start_matches("0x");
    let padded = format!("{s:0>64}");
    let bytes = hex::decode(&padded).expect("invalid hex field element");
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes);
    out
}

fn main() {
    let args: std::vec::Vec<std::string::String> = std::env::args().collect();
    assert!(args.len() == 6, "usage: register_payload <y_x> <y_y> <pvk_x> <pvk_y> <proof_file>");

    let e = Env::default();

    let y_x = parse_field32(&args[1]);
    let y_y = parse_field32(&args[2]);
    let pvk_x = parse_field32(&args[3]);
    let pvk_y = parse_field32(&args[4]);

    let mut y_bytes = [0u8; 64];
    y_bytes[..32].copy_from_slice(&y_x);
    y_bytes[32..].copy_from_slice(&y_y);
    let mut pvk_bytes = [0u8; 64];
    pvk_bytes[..32].copy_from_slice(&pvk_x);
    pvk_bytes[32..].copy_from_slice(&pvk_y);

    let y = BytesN::<64>::from_array(&e, &y_bytes);
    let pvk = BytesN::<64>::from_array(&e, &pvk_bytes);

    let proof_raw = std::fs::read(&args[5]).expect("failed to read proof file");
    let proof = Bytes::from_slice(&e, &proof_raw);

    let data = RegisterData { payload: RegisterPayload { y, pvk }, proof };
    let xdr: Bytes = data.to_xdr(&e);

    let mut out = std::vec::Vec::with_capacity(xdr.len() as usize);
    for b in xdr.iter() {
        out.push(b);
    }
    println!("0x{}", hex::encode(out));
}
