# Vendored: `stellar_confidential_lib`

Vendored from `github.com/OpenZeppelin/stellar-contracts`, path
`packages/tokens/src/confidential/circuits/lib`, at commit
`fbfde388e1b72afa93d6b1c922067879b20e81db` (2026-08-14, the `main` branch HEAD at the
time ProofPay's research was done).

## Why vendored instead of a Noir dependency

Noir circuits (`.nr` / Nargo packages) don't have a crates.io/npm-style registry or a
`git` dependency mechanism as mature as Cargo's — Nargo's own git-dependency support
exists but is less commonly used for pinned reproducible builds across a mixed
Rust+Noir workspace. The Rust side of this project (`token/`, `verifier/`) depends on
OpenZeppelin's `stellar-tokens` crate directly via a pinned git dependency in
`Cargo.toml`. This Noir package is vendored (copied, not re-implemented) as the
equivalent honest approach for the Noir toolchain, with this file recording exactly
where it came from and at what commit, so it's traceable back to the source rather than
looking like our own code.

Do not hand-edit files under this directory. If the upstream circuit primitives need to
change, re-vendor from a newer commit and update this note.
