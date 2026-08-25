use stellar_confidential_lib::{H, pvk_from_vk, scalar_mul, vk_from_sk};

// Computes the real witness values for a fresh ProofPay test registration:
// sk = 42 (arbitrary nonzero test scalar -- not a secret worth protecting,
// this is throwaway testnet test-account key material), addr_f = the real
// address_to_field(proofpay-token contract) value confirmed in
// docs/research/step3b-address-to-field.md and re-derived independently by
// contract/tools/address_to_field against the live deployed address.
#[test]
fn print_witness_values() {
    let sk: Field = 42;
    let addr_f: Field =
        0x1f90be7d3b2b34c936c5bd20fa0848d436925b86904d14de1baa85c6a4cfc29a;

    let y = scalar_mul(sk, H);
    let vk: Field = vk_from_sk(sk, addr_f);
    let pvk = pvk_from_vk(vk);

    let y_x: Field = y.x;
    let y_y: Field = y.y;
    let pvk_x: Field = pvk.x;
    let pvk_y: Field = pvk.y;

    println(f"sk={sk}");
    println(f"addr_f={addr_f}");
    println(f"y_x={y_x}");
    println(f"y_y={y_y}");
    println(f"vk={vk}");
    println(f"pvk_x={pvk_x}");
    println(f"pvk_y={pvk_y}");
}
