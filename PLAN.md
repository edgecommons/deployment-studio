# Deployment Studio — the four-step build plan

**Agreed:** 2026-07-22 (user + review sessions). This file is the canonical copy; conversations refer
back to it. Update statuses here in the same change that does the work — stale status is a defect.

The verdict that produced this plan (see `design/REVIEW.md` and `design/REVIEW-UI.md`): the
architecture is right — compiler-not-controller, Git as the only durable state, CLI-first with the
server as a shell, honest per-target model, two-stream releases, per-thing Greengrass targets. The
risk is **diffusion, not direction**. So: subtract the passenger products, pin the one missing
contract, build the kernel against a real site, then settle the UI.

---

## Step 1 — Pin the definition language against a real site — **DONE (2026-07-22)**

The load-bearing gap, closed. The deck's illustrative ch. 3 fragment (nodes floating free of the
hierarchy; per-component `configLineage`; per-node `targets` arrays; dataflow vocabulary) is replaced
by the real schema and a fixture excerpt.

Deliverables:

- [x] `schema/deployment-definition.schema.json` — `edgecommons.io/v1alpha1`, JSON Schema 2020-12.
- [x] `schema/DEFINITION.md` — element-by-element explainer + semantic rules S-1..S-9.
- [x] `schema/validate.py` — proto-kernel validator (schema + S-rules + binding resolution).
- [x] `fixtures/dallas/` — the golden fixture: 3 nodes, 4 scopes, 10 component assignments;
      layers mechanically extracted from the harness catalogs (single-sourced, deduped).
- [x] `fixtures/dallas/TRACEABILITY.md` — element → harness-file mapping, the slice-1 oracle set
      (16 config files + 3 supervisor confs), and findings F-1..F-9.
- [x] Deck ch. 3: fragment replaced with a schema-conformant fixture excerpt + pointer to `schema/`.

**Acceptance met:** the language expresses the Dallas site cleanly. Headline findings — F-1: the
harness's "duplicated" scope nodes differed *only* in embedded `hierarchy`/`identity`, i.e. derived
content hand-copied into authored layers (hence rule S-4); F-2: placement-derived truncation
reproduces the site node's 3-level catalog with no special case; F-3: the packaging template's
placeholders are a hand-rolled `bindings.json`; F-4 (the one real gap, additive): cross-node service
references (line bridge → site broker) want a first-class `${node:…}` reference in v1alpha2 — bindings
suffice meanwhile. Validation: `python schema/validate.py fixtures/dallas/definition.yaml` is green.

## Step 2 — Deck subtractions — **DONE (2026-07-22)**

Each is a ruling accepted by the user; propagated deck + reviews together. Register entries:
`design/REVIEW.md` §6 #10–#14 (and #4).

| # | Edit | Status |
|---|---|---|
| 2.1 | **Governance → PR reviews.** Approval lanes are a rendering of Git-host PR review state (CODEOWNERS/branch protection); no parallel approval system in v1. Ch. 9 + decision card. | **DONE** (REVIEW #10) |
| 2.2 | **K8s = one renderer + delivery modes.** The semantic compiler is Studio's (Argo has no EdgeCommons knowledge); kubectl-from-CI and Argo/Flux handoff are *delivery adapters* over one rendered output (the only Argo artifact is an Application CR). Demand-sequenced — first consumer: replacing the hand-maintained k8s test chart. Ch. 7 + ch. 13 slice 4 + card. | **DONE** (REVIEW #11) |
| 2.3 | **Ch. 8 → three-file IaC handshake.** `requirements.json` / `bindings.json` / `plan.json` in the release path are the only IaC contract; one worked Terraform example ships as documentation, not product. No generated CDK/HCL deliverables. Lab snippets marked customer-side. | **DONE** (REVIEW #12) |
| 2.4 | **Extract prescriptive dataflows** to `design/FUTURE-dataflows.md`; the product keeps only the derived, read-only Topology. Ch. 10 contracts + workflow strip updated; mock screen catches up in step 4. | **DONE** (REVIEW #4) |
| 2.5 | **Bright line stated** (ch. 11/12 + Live-evidence card): *Studio holds intent and adjudicates delivery from evidence; Console observes live state and never learns intent.* Observed data appears in Studio only paired with an intent comparison. | **DONE** (REVIEW #13) |
| 2.6 | **Node-identity section** (ch. 3): node key ↔ platform identity via `bindings.json`; default = names equal; replacement cheap, rename expensive, decommission keeps history. Schema fields land in step 1. | **DONE** (REVIEW #14) |
| 2.7 | ~~HOST delivery evidence: degrade honestly, no receipt machinery; inspection utility demand-gated.~~ | **DONE** (roadmap `26a197c`, carried into `design/`; REVIEW #7 refinement) |

## Step 3 — Slice 1: kernel + HOST renderer — **DONE (2026-07-22)**

`kernel/` — Rust crate `edgecommons-deploy`, binary `ec-deploy` (`validate` / `render` / `oracle`):
typed model, semantic validator (S-1..S-9, mirrors `schema/validate.py`), the shipped merge contract,
placement-derived lineage, `${binding:…}`/`${provider:…}` token resolution, and the HOST renderer —
per-node catalogs, rendered bootstrap configs, messaging files, supervisord confs, plus `plan.json`
(with per-component restart impact by config source) and `requirements.json`. Deterministic by
construction: no timestamps, no randomness. Builds natively on Windows; clippy-clean.

**Acceptance (the Dallas oracle, 22 files):** `kernel/tests/dallas_oracle.rs` renders the fixture and
compares against the harness — **13/13 messaging files byte-identical; 3/3 catalogs semantic-equal;
the only remaining deltas are two documented, deliberate improvements** (the bootstraps' `tags.scenario`
drift F-10, and the packaging conf's runtime template-render step replaced by render-time binding
substitution F-3). Remaining byte deltas beyond those are hand-formatting (inline arrays, comments).
**Full byte-for-byte parity is reached by adoption**: replace the harness's hand files with the
generated canonical output (also fixes F-10) and let the harness E2E prove behavioral equivalence —
a `bottling-company-test` change, proposed separately, not taken unilaterally.

**Harness adoption: MERGED — byte-for-byte CLOSED (2026-07-22).**
`bottling-company-test` **PR #4** (`adopt/studio-rendered-configs`, merge commit `5d86363`) replaced
the hand-maintained configs/confs with `ec-deploy render` output, deleted the packaging template +
`render-packaging-catalog` machinery and the vestigial render scripts, and restored the F-10
`tags.scenario` drift. Verified pre-merge by a full stack swap (all 17 supervised programs RUNNING
across the 3 devices, console healthy, rendered packaging catalog served, Modbus + Kepware
connected, parquet flowing, both bridges relaying), then the original stack restored. The adoption
worktree is removed. The oracle map now targets the merged files and
`kernel/tests/dallas_oracle.rs` asserts **all 22 oracle files byte-identical** — green. The Dallas
site is generated end to end; hand edits to its configs are regressions the test catches.

**Slice 2 — evidence bundles and releases: DONE (2026-07-22).** The repo is published
(`edgecommons/deployment-studio`, private; in `clone.sh` and the org map). `ec-deploy release`
writes `releases/<tag>/{manifest.json, evidence.json, rendered/**}` — definition commit, renderer
version, per-file sha256, the two streams correlated (never fused), `devMode` flag for source-form
artifacts; deterministic, no timestamps. Dallas `releases/v1` is committed (register #8 resolved by
construction). CI on both repos: this repo's `ci.yml` (build, clippy -D warnings, tests incl. the
oracle via harness checkout, schema validation, render-vs-v1 determinism check) and
bottling-company-test **PR #5** — the `config-drift-gate` workflow re-renders the fixture on every
push/PR and fails unless the site's configs are byte-identical (`ec-deploy oracle --strict`).
`EDGECOMMONS_READ_TOKEN` set on both repos (org stopgap pattern — replace with a dedicated read PAT).

Next per deck ch. 13: Greengrass renderer + CLI port (slice 3) →
storage/K8s → UI → execution/convergence.

## Step 4 — UI decisions — **DONE (2026-07-22)**

All seven REVIEW-UI §5 decisions ruled (user: 1A 2A 3A 4A 5A 6A; #2/#6 fell out of step 2) and
propagated to deck + registers + mock in one change:

- **1A context-spine IA** — fleet tree as the persistent selection rail; Components/Config/Topology/
  Render as selection-scoped tabs; Releases/Operations/Registry/Settings global; breadcrumb always.
  Deck ch. 10 anatomy rewritten; every mock page carries the spine + contextbar.
- **2A wizard** — Create/Connect entry, three steps, milestone handoffs; import-artifacts entry
  removed (descoped); new `settings.html` is what the wizard becomes after day zero.
- **3A component editor** — node-anchored (`telemetry-processor / archive on gw-fill-01`), separate
  artifact-stream and config-leaf panels.
- **4A instance facet** — the `…:archive` scope node is gone; instance is a facet within the leaf.
- **5A device layers** — authoring-side (REVIEW #5 resolved): "gw-fill-01 fragment — authored node
  override" compiled into the node's catalog; "rejected at save/review" language; **explicitly
  revisitable** — runtime enforcement later is additive on the same authored artifacts.
- **6A drift** — stage × stream matrix with per-node delivery and the per-target "unverified" state;
  deck ch. 11 language updated; two-stream cards + PR-review approvals on the gate; evidence
  provenance (mode badge, snapshot age/source) on runtime surfaces.

Mock verified: all nine pages render with zero console errors; wizard walks 4 steps to milestones.

---

## Still open on the register (user rulings, no urgency)

- `design/REVIEW.md` §6: #5 (device layers / blocked overrides — recommendation authoring-side only),
  #6 (render into existing config sources first), #8 (commit render snapshots at release boundaries).
  #4 (dataflows) resolves with step 2.4.
- **W8** — concurrent drafts have no story; bites in the first multi-user week.
- Dependency: the deck's Greengrass scenario needs the deferred IPC-primary `uns-bridge` variant
  (ROADMAP A52) — a real blocker recorded in REVIEW W7.1.

## Provenance

Moved from `roadmap/deployment-abstraction-design/` (roadmap branch
`work/deployment-studio-fidelity`, through commit `26a197c`) on 2026-07-22. That branch also holds
the pre-move history; the roadmap copy is replaced by a pointer.
