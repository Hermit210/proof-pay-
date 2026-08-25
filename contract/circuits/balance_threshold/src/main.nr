use stellar_confidential_lib::{commit, vk_from_sk, pvk_from_vk};

mod compute_witness;

// D-balance-predicate probe circuit (SELECTIVE_DISCLOSURE.md section 9, predicate-only
// disclose_balance_ge variant). Feasibility measurement only -- not final code.
//
//   D1/D2  vk = vk_from_sk(sk, addr_f); PVK = pvk_from_vk(vk)
//   DB3    C_spend = commit(v_s, r_s)
//   D5     v_s in [0, 2^127)   (range, via u128 cast)
//   DB4    v_s >= threshold
fn main(
    sk: Field,
    v_s: Field,
    r_s: Field,
    pvk_x: pub Field,
    pvk_y: pub Field,
    c_spend_x: pub Field,
    c_spend_y: pub Field,
    addr_f: pub Field,
    threshold: pub Field,
) {
    let vk = vk_from_sk(sk, addr_f);
    let pvk = pvk_from_vk(vk);
    assert(pvk.x == pvk_x);
    assert(pvk.y == pvk_y);

    let c = commit(v_s, r_s);
    assert(c.x == c_spend_x);
    assert(c.y == c_spend_y);

    let v_s_u128: u128 = v_s as u128;
    let threshold_u128: u128 = threshold as u128;
    assert(v_s_u128 >= threshold_u128);
}
