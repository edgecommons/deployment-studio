# Deployment Studio — the four-step build plan

**Agreed:** 2026-07-22 (user + review sessions). This file is the canonical copy; conversations refer
back to it. Update statuses here in the same change that does the work — stale status is a defect.

The verdict that produced this plan (see `design/REVIEW.md` and `design/REVIEW-UI.md`): the
architecture is right — compiler-not-controller, Git as the only durable state, CLI-first with the
server as a shell, honest per-target model, two-stream releases, per-thing Greengrass targets. The
risk is **diffusion, not direction**. So: subtract the passenger products, pin the one missing
contract, build the kernel against a real site, then settle the UI.

---

## Step 1 — Pin the definition language against a real site — **IN PROGRESS (2026-07-22)**

The load-bearing gap. The deck's ch. 3 fragment is illustrative and self-contradictory (nodes float
free of the hierarchy; `configLineage` enumerated per component competes with the catalog as a second
source of truth; per-node `targets` arrays contradict standard-plus-exceptions; dataflow capability
vocabulary leaks in).

Deliverables, all in this repo:

- [ ] `schema/deployment-definition.schema.json` — the real, versioned definition schema.
- [ ] `schema/DEFINITION.md` — what each element means and which settled decision it encodes.
- [ ] `fixtures/dallas/` — the **golden fixture**: the Dallas bottling site
      (`bottling-company-test/`) expressed in the definition language.
- [ ] `fixtures/dallas/TRACEABILITY.md` — hand-verification that the fixture could regenerate the
      harness's files: definition element → harness file mapping, plus every model gap found.
- [ ] Deck ch. 3: replace the illustrative fragment with a schema-conformant excerpt + pointer to
      `schema/`.

Schema must encode: node placement in the hierarchy (single parent scope); config lineage **derived**
from placement, never enumerated per component; target standard + governed per-scope exceptions (no
per-node target arrays); two-stream separation (artifact pin vs config refs); per-node thing identity
(per-thing decision); per-component config source selecting the delivery adapter and restart impact;
**no** dataflow/capability vocabulary. The definition + layer files are the authoring form that
*compiles into* per-node ConfigComponent catalogs (single source of truth).

Acceptance: if the language cannot express the Dallas site cleanly, the model is wrong — record the
correction, do not force the fixture.

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

## Step 3 — Slice 1: kernel + HOST renderer — **NOT STARTED**

Rust kernel crate + HOST renderer, exactly as the deck's roadmap chapter sequences it.
Acceptance: **byte-for-byte regeneration** of a hand-maintained site's files; oracle corpus =
`bottling-company-test/` via the Step-1 fixture. No service, no hosting decision consumed.
(Then, per deck ch. 13: evidence in CI → Greengrass renderer + Rust CLI port → storage/K8s → UI →
execution/convergence.)

## Step 4 — UI decisions — **NOT STARTED (after Step 2)**

The seven decisions in `design/REVIEW-UI.md` §5, deferred because several screens' fates follow from
Step 2: context-spine IA (fleet tree as persistent selection spine), wizard scope (create/connect +
milestone handoffs), Dataflows→Topology (read-only, derived, selection-scoped), node-anchored
component editor (artifact-stream + config-leaf panels), instance-leaf resolution (facet, not scope),
drift taxonomy stage × stream, approval seam (follows 2.1).

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
