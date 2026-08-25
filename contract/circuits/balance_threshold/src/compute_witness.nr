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
