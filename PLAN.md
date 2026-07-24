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

**CI status: workflows in place, first runs BLOCKED on Actions billing** — both repos are private,
and GitHub reports "recent account payments have failed or your spending limit needs to be
increased" (public org repos are unaffected; no self-hosted runners are registered). Every step CI
would run is proven green locally: cargo build/clippy -D warnings/tests (oracle 22/22), schema
validation, `oracle --strict` exit 0, and the render-vs-committed-v1 diff clean. Once billing is
fixed, re-run the failed runs (`gh run rerun`) — no workflow changes needed.

**Slice 3 — kernel convergence: MERGED (2026-07-23).** `edgecommons/edgecommons` **PR #60**
(merge `6d332b7`) landed this repo's kernel behind `core/cli`'s `ec-deploy` ports:
`edgecommons deployment {validate, render, plan, release}` are real (three validation stages, HOST
renderer, normalized Plan, two-stream release lock); `lock`/`diff`/`studio serve` stay honest
NotImplemented seams. **PR #61** (merge into core `e76f070`) moved the **Dallas golden test** into
core (`cli/crates/ec-deploy/tests/dallas_golden.rs` + `tests/fixtures/dallas`), so core CI enforces
byte-for-byte on every renderer change. **The standalone `kernel/` in this repo is deleted**; the
engine is now solely the `edgecommons` binary. CI here is now design-only: it validates the fixture
against the schema and checks the schema matches the copy the kernel embeds. `releases/v1` (an
old-format artifact of the retired kernel) is removed — releases are produced by
`edgecommons deployment release`. Credential remediation: bottling-company-test **PR #6** (merge
`3166bd0`) scrubbed the Kepware literals from the tree (history stays private; rotation recommended,
lab-side).

**Verification of the final state:** on core `main` (`e76f070`), `edgecommons deployment validate`
passes the Dallas fixture and `edgecommons deployment render … --target HOST` is byte-identical to
the adopted `bottling-company-test` site; core's Dallas golden test is green.

**Slice-3 framing CORRECTED (2026-07-23).** The deck's "port the Python CLI" is stale: the
scaffold-parity project already landed a Rust `edgecommons` CLI on core main (`core/cli`, crates
`ec-cli`/`ec-scaffold`/`ec-deploy`/`ec-studio`/…), whose noun-verb surface already includes
`edgecommons deployment {validate, lock, render, plan, diff, release --stream}` and
`edgecommons studio serve` — designed against this same register (REVIEW #2, RM-012, D-CLI-10).
Its `ec-deploy` crate is the hexagonal ports skeleton with **no renderers** (Phase P4; the verbs
return NotImplemented). So slice 3 is a **convergence, not a port**: land this repo's working
kernel (model → validator → HOST renderer → release/evidence, oracle-proven) as the implementation
behind `core/cli`'s `ec-deploy` ports, reconcile the definition schema with DESIGN-cli §8's model
vocabulary (`lock`, per-target render, stream-scoped release verbs), retire the standalone
`ec-deploy` binary here, and add the Greengrass renderer in that home. Two parallel kernels is the
drift disease — converge before building more into this one.

**Greengrass renderer: SHIPPED (2026-07-23).** core PR #63 (merge `a4a59ca`) —
`edgecommons deployment render --target GREENGRASS` emits **one deployment document per thing**
(thing ARNs, never groups), each carrying every component assigned to that node at its pinned
`componentVersion`, with GG_CONFIG components' effective config as a stringified `ComponentConfig`
merge under `configurationUpdate`. The plan records artifact and config consequences per node with
restart impact from the config source. Refusals are named, never silent: unpinned artifact, missing
Greengrass name, CONFIG_COMPONENT (no Greengrass catalog-delivery path decided yet), missing
`aws.region`/`aws.accountId`. Proven by `tests/fixtures/dallas-gg` + a byte-for-byte golden and
per-thing invariant tests; all four core gates green (coverage 90.76%).

**Recipes are owned by component release, not the renderer** (REVIEW #15, DESIGN-cli §8.5.6) — a
deviation from the deck, propagated to ch. 7, the roadmap slice, and the decision surface. The one
underivable fact, the Greengrass component name, now lives in the registry
(`greengrassComponentName`, registry PR #7, harvested from each repo's recipe) and is authored as
`artifact.greengrassName` until `deployment lock` resolves it.

**`deployment lock`: SHIPPED (2026-07-23).** The one verb that reaches the network (DESIGN-cli §8.7)
resolves each pinned component version against the registry and writes `<stem>.lock` beside the
definition, so `validate`, `render`, and `plan` are pure functions over files already in Git. Three
consequences landed with it:

- **The lock retires the `artifact.greengrassName` override.** The Greengrass renderer now resolves
  the name override-first, then from the lock; a definition no longer has to carry the one fact that
  is not derivable from the token. With neither, it still refuses rather than guessing.
- **The compatibility guard (§8.5.5) is wired end to end.** `validate` gained a fourth stage that
  checks each component's `component.global` against the config schema the *pinned version* publishes
  — `EC5005` names the offending key and the version that rejected it. The enforcement path is built
  now and engages automatically when components start publishing schemas (RM-013); no flag, no
  redesign.
- **Degradation is stated, never implied.** No component publishes a release index today, so every
  digest comes back unverified: the lock records that as `unresolved` **with its reason**, `lock`
  warns `EC4006`, and `validate` repeats it plus `EC5006` (no config schema) and `EC5007` (no lock at
  all). A corrupt or future-version lock is a usage error, never silently ignored.

`--source` takes a local catalog path (or `$EDGECOMMONS_REGISTRY_URL`), which is both the offline
escape hatch and what makes the networked verb testable without a network. All four core gates green;
coverage 90.75%.

**Instance-config validation: SHIPPED (2026-07-23).** core PR #67 extends the guard to
`component.instances[]`, which the first cut skipped. A survey of all seven component repos settled
that `global` and an instance are **different shapes, not one shape with overrides** — no library
merges them, components combine them by per-key fallback on a small `defaults` block, and both sides
are `additionalProperties: false`, so a merged document would fail both. The guard therefore validates
them separately: `component.global` against the schema root, each instance against **`#/$defs/instance`**.
The fixed name is a convention every component already half-satisfies (its instance shape is a `$defs`
subschema under a domain name — `device`/`route`/`camera`); four repos add a one-line `$ref` alias
(companion PRs: opcua-adapter #10, modbus-adapter #5, telemetry-processor #13, camera-adapter #10;
file-replicator and uns-bridge already comply). A pinned version that ships a schema but no
`#/$defs/instance` is `EC5008` — a warning, same degradation discipline as the rest of the guard.
Two side findings fixed in the same sweep: the stale `component.global` example in
`core/docs/TELEMETRY_PROCESSOR.md`, and **edge-console's missing `config.schema.json`**, now authored
from `ConsoleConfig::from_global` (edge-console PR #10, closes that repo's P0-3).

**Deployment profiles — one topology, all platforms: SHIPPED (2026-07-23).** The north-star cut
(user: "consider the Dallas topology the north star and use it for proving everything works", "GG
needs to be complete", "no backward compatibility"). A definition is now one shared `topology` (the
plant) plus per-platform `profiles`; `effective(profile)` merges them into the flat form the
renderers consume. Design in `core/docs/platform/DESIGN-deployment-profiles.md`; recorded D-CLI-24/-25.
On core branch `feat/deployment-profiles`, six verified stages:

1. **Model + merge** — `AuthoredDefinition` (topology + profiles) + `effective()`; the functional
   half (layer/messaging/files/catalogKey) lives in the topology, the delivery half
   (configSource/artifact/image/launch + node scaffolding) in a profile.
2. **Unify Dallas** — the three divergent fixtures collapse to one; HOST + Greengrass goldens proven
   **byte-neutral** through the refactor (`dallas-gg` deleted, its subset an explicit `deploys`).
3. **CLI threading** — the flat definition form is **removed** (no backward compat); the schema is
   rewritten to the authored shape; `--target <family>` selects a profile; `validate` checks all.
4. **Greengrass complete** — the profile deploys the **whole plant** (4 things, 12 assignments), not
   the filling-line subset; golden regenerated (reviewed). `config-component` is HOST-only (GG uses
   `GG_CONFIG` natively).
5. **Kubernetes renderer** — `kubernetes.rs` emits per-component ServiceAccount + ConfigMap +
   Deployment + Service (CONFIGMAP whole-volume hot-reload, Downward-API identity, non-root/RO-rootfs,
   `nodeSelector` placement); `profiles.kubernetes` + a k8s golden. S-6 accepts an `image` as the k8s
   artifact. This is deck slice 4's Kubernetes renderer (REVIEW #11), realized against Dallas.
6. **bct onto the unified definition** — `bottling-company-test/sites/dallas-site` (its canonical
   home) now carries the authored definition; its drift gate renders the `host` profile.

One Dallas topology renders to HOST (24 files), Greengrass (6), and Kubernetes (14). Every stage
kept the four core gates green (coverage ≥90%). This subsumes the deck's ch.13 slice-4 Kubernetes
work and REVIEW #6's config-adoption loop into a single coherent model.

Then per deck ch. 13: slice 5 UI (`studio serve`) → slice 6 execution/convergence.

**Slice 5 — the `studio serve` UI, read-only cuts: SHIPPED (2026-07-23).** An `axum` server over the
same kernel the CLI uses, with an embedded React + Carbon SPA that reuses **edge-console's design
language** (the `--ec-*` brand tokens mapped onto Carbon, the Night Iris app bar with the EdgeCommons
logo lockup — core PR #71). Four read-only screens, each over a JSON API and each computing in-memory,
writing nothing:

1. **Config layers** + **Render review** (core PR #70) — the effective config per profile × node ×
   component, and the rendered artifacts + normalized plan.
2. **Evidence** (this cut) — the correlation envelope a release would carry (REVIEW #13): the two streams
   (config, artifact) correlated but **never fused**, per-file `sha256`, the `devMode` flag, and the
   evidence bundle. Built from the same `build_release` the CLI uses; the definition commit comes from
   `describe_head`, reported honestly (`-dirty` / `unknown`).
3. **Access** (this cut) — a rendering of the repo's `CODEOWNERS` (REVIEW #10 — approval is a *rendering*
   of Git-host review state, not a parallel system). A pure last-match-wins CODEOWNERS matcher
   (`ec-deploy::codeowners`) resolves the definition and each component layer to its required reviewers;
   no `CODEOWNERS` degrades honestly to "default branch-protection review". Proven end to end against the
   north-star site: `bottling-company-test` gains a real Dallas `CODEOWNERS` (scope-governance,
   per-line controls, platform, plant-ops-UI) so the Access screen shows real per-scope ownership.

Verified live in a browser against `sites/dallas-site` (all three profiles): Evidence shows the 10-entry
artifact stream in devMode with the 24-file digest set; Access shows last-match-wins ownership (the
`edge-console` leaf rule beating the line/site catch-alls). Console clean; all four core gates green
(workspace coverage 90.70%).

**Remaining slice-5 cuts — the write path (a decision for the user, not yet built).** Authoring and
branch/draft orchestration both require the server to *gain a write path* into Git — the read-only cuts
deliberately do not. Branch/draft orchestration additionally depends on **W8 (concurrent drafts), still
open on the register**; it should not be invented unilaterally. These are the next decision before slice 6.

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
