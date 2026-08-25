use stellar_confidential_lib::{H, pvk_from_vk, scalar_mul, vk_from_sk};

// Derivation-only helper circuit -- NOT part of ProofPay's privacy claim and
// never proven, only executed (witness generation, no bb.js proof step).
// Its sole purpose is letting the frontend derive Y = sk*H and
// PVK = pvk_from_vk(vk_from_sk(sk, addr_f)) using the exact same vendored
// Grumpkin/Poseidon2 arithmetic the real register circuit
// (`../register/src/main.nr`, constraints R1-R3) will itself assert against,
// instead of hand-porting elliptic-curve math into JS a second time and
// risking a silent mismatch. `sk` is generated client-side and never leaves
// the browser in either circuit's use.
fn main(sk: Field, addr_f: Field) -> pub [Field; 5] {
    let y = scalar_mul(sk, H);
    let vk: Field = vk_from_sk(sk, addr_f);
    let pvk = pvk_from_vk(vk);
    [y.x, y.y, pvk.x, pvk.y, vk]
}
