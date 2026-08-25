use stellar_confidential_lib::{commit, vk_from_sk, pvk_from_vk};

#[test]
fn print_witness_values() {
    let sk: Field = 1;
    let addr_f: Field = 1;
    let v_s: Field = 500;
    let r_s: Field = 7;

    let vk: Field = vk_from_sk(sk, addr_f);
    let pvk = pvk_from_vk(vk);
    let c = commit(v_s, r_s);

    let pvk_x: Field = pvk.x;
    let pvk_y: Field = pvk.y;
    let c_spend_x: Field = c.x;
    let c_spend_y: Field = c.y;

    println(f"vk={vk}");
    println(f"pvk_x={pvk_x}");
    println(f"pvk_y={pvk_y}");
    println(f"c_spend_x={c_spend_x}");
    println(f"c_spend_y={c_spend_y}");
}

// Real ProofPay testnet test account (see docs/deployment/testnet.md): sk=42
// is the same spending key proven in the real on-chain register() tx
// (1aea5f32...), addr_f is the real proofpay-token contract's
// address_to_field value, v_s=500/r_s=0 is the real deposit-then-merge
// opening (deposit uses zero blinding per DESIGN.md's "a*G with zero
// blinding"; merge is pure homomorphic addition, so the opening carries
// through unchanged). This test's printed c_spend_x/c_spend_y must match
// the real on-chain spendable_commitment read via confidential_balance
// after the real merge() tx (faf362be...) -- if it doesn't, the assumed
// commitment scheme/blinding is wrong and no proof against it would verify.
#[test]
fn print_witness_values_live_account() {
    let sk: Field = 0x2a;
    let addr_f: Field =
        0x1f90be7d3b2b34c936c5bd20fa0848d436925b86904d14de1baa85c6a4cfc29a;
    let v_s: Field = 500;
    let r_s: Field = 0;
    let threshold: Field = 300;

    let vk: Field = vk_from_sk(sk, addr_f);
    let pvk = pvk_from_vk(vk);
    let c = commit(v_s, r_s);

    let pvk_x: Field = pvk.x;
    let pvk_y: Field = pvk.y;
    let c_spend_x: Field = c.x;
    let c_spend_y: Field = c.y;

    println(f"sk={sk}");
    println(f"addr_f={addr_f}");
    println(f"threshold={threshold}");
    println(f"pvk_x={pvk_x}");
    println(f"pvk_y={pvk_y}");
    println(f"c_spend_x={c_spend_x}");
    println(f"c_spend_y={c_spend_y}");
}

#[test]
fn print_witness_values_below_threshold() {
    let v_s: Field = 200;
    let r_s: Field = 7;
    let c = commit(v_s, r_s);
    let c_spend_x: Field = c.x;
    let c_spend_y: Field = c.y;
    println(f"c_spend_x={c_spend_x}");
    println(f"c_spend_y={c_spend_y}");
}
