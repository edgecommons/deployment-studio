# edgecommons-deploy — the Deployment Studio kernel (slice 1)

The typed DeploymentDefinition model, the semantic validator (rules S-1..S-9 from
`../schema/DEFINITION.md`), and the HOST renderer. The CLI is the product; this binary is its seed.

```
cargo build                      # native Windows or Linux; no C dependencies
cargo test                       # includes the Dallas oracle acceptance test
```

## Commands

```
ec-deploy validate <definition.yaml> [--environment <name>]
ec-deploy render   <definition.yaml> --environment <name> [--release-tag <tag>] --out <dir>
ec-deploy release  <definition.yaml> --environment <name> --tag <tag> [--config-release <tag>] [--out <dir>]
ec-deploy oracle   <definition.yaml> --environment <name> --map <oracle-map.json> \
                   --harness <dir> --out <dir> [--strict]
```

`release` validates, renders, and writes the committable release record to
`<workspace>/releases/<tag>/`: `manifest.json` (definition commit, renderer version, per-file
sha256, the config and artifact streams correlated but never fused, `devMode` when any artifact is
source-form rather than version+digest pinned), `evidence.json` (what was validated), and the
`rendered/` snapshot — register decision #8's "commit at release boundaries" made concrete.
Deterministic like everything else: no timestamps; the Git commit carries the time.

`oracle --strict` exits non-zero unless every mapped file is byte-identical — the CI gate mode used
by bottling-company-test's `config-drift-gate` workflow and this repo's own CI.

`render` emits, per node: the ConfigComponent catalog, the rendered bootstrap config, the messaging
files, and the supervisord conf — plus workspace-level `plan.json` (per-component restart impact by
config source) and `requirements.json` (the binding tokens the environment must satisfy). Output is
deterministic: no timestamps, no randomness; identical inputs give identical bytes.

`oracle` renders and then compares against a hand-maintained tree: byte equality (CRLF-normalized)
plus semantic equality — JSON deep-compare for configs (templates substituted from bindings first)
and section/key comparison for supervisord confs (comments and ordering ignored).

## Acceptance state

`tests/dallas_oracle.rs` proves the Dallas golden fixture against `bottling-company-test/`
(skips with a notice if the harness clone is absent; override the location with
`BOTTLING_HARNESS_DIR`). Current result: 22/22 files accounted for — 13 byte-identical,
18 fully semantic-equal, and the four remaining deltas are the two documented improvements
(`fixtures/dallas/TRACEABILITY.md`, findings F-3 and F-10).
