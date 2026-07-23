# Review — Deployment Studio design

**Reviewed:** 2026-07-09
**Artifacts:** `index.html` + `app.js` (the deck), `mock-app/` (nine screens + `app.js`), with supporting
context from `roadmap/ROADMAP.md`, `roadmap/edgecommons-buildout-nextsteps.md`, and `AGENTS.md`.
**Method:** every claim the deck makes about existing capability was verified against source in `core/`,
`config-component/`, `edge-console/`, the five component repos, `bottling-company-test/`, and `registry/`.
Citations are `file:line` at the time of review; deck paths are relative to this folder, repo paths to the
workspace root.

**Note on current-state accuracy.** Three stale current-state claims in the deck were corrected on
2026-07-09 before this review was written, so they are *not* recorded as weaknesses below: the HOST runtime
args and config-delivery facts (`app.js:32-33`), the HOST renderer's `uns-bridge --config --thing` CLI
exception (`app.js:199`), and the Sources-grid link to the deleted `core/docs/SPLIT_CONFIG_IMPLEMENTATION_SPEC.md`
(`index.html:1205`). Two related fidelity items remain open and are recorded as **W7**.

---

**UPDATE 2026-07-22 — the settled decisions are now propagated into the deck body and the mock; W7.2 and
the doc-sync item are closed.**

Decisions #2 (two-stream ReleaseLock) and #3 (per-thing Greengrass targets) had been recorded on the deck's
decision surface but **contradicted in roughly fifteen places** across the chapters and the mock screens,
which is the failure mode this review exists to catch. They are now consistent:

- **Per-thing propagated.** Chapter 7 gains an explicit paragraph — target ARNs are thing ARNs, never thing
  group ARNs, with the union-semantics and per-node-failure consequences. The domain-model edge node, the
  Terraform/CDK/Greengrass IaC previews and responsibilities, the IaC-meets-UI card, the fleet bindings, the
  drift ledger, the approval lane, and the render-review inspector all follow. Every surviving mention of
  "thing group" in the deck now appears inside a sentence saying groups are *not* used.
- **Two-stream propagated.** Chapter 5 now states that the release object correlates two independently
  versioned and independently rolled-back streams rather than fusing them, and the ReleaseLock previews in
  both the deck and the mock carry `configStream` and `artifactStream` with separate rollback targets.
- **W7.2 closed.** The mock's Greengrass artifacts are the real ones: `com.mbreissi.edgecommons.TelemetryProcessor`
  with the binary `Install`/`Run` lifecycle and artifact URI, matching `telemetry-processor/recipe.yaml`.
- **Doc-sync closed.** Chapter 4 no longer says the platform is "moving toward" hierarchical config. It
  describes the shipped contract: a lineage bundle merged in array order with later-wins, a user-defined
  `hierarchy.levels` ending in `device`, the device resolved from the thing name rather than being a catalog
  node, scope- and identity-ownership enforcement, and previous-config retention on invalid reload. The
  chapter 2 table rows follow, and the stale split-config phrase "raw controls are stripped" is gone.
- **W4.3 closed as a factual matter.** The config-layer screen's "runtime wire shape" now shows the real
  bundle — `lineageVersion`, `catalogVersion`, `provenance`, and layers with `id`/`kind`/`scope` — and says
  in the panel itself that per-layer and effective hashes are Studio-computed evidence, not wire fields.
- **Three further schema defects found while verifying**, none of them previously recorded: the mock's
  "effective config" nested `identity`, `heartbeat`, and `messaging` *under* `component` (all three are
  top-level in `core/schema/edgecommons-config-schema.json`); the Greengrass `configurationUpdate.merge`
  did the same and rendered as invalid JSON; and the raw-layer preview used a `fragment:` key rather than the
  bundle's `config:`. All corrected.

**W4.1 and W4.2 are deliberately untouched** — device-scope layers and blocked overrides are decision #5,
which is still the user's to make. **W8** (concurrent drafts) remains open and unaddressed.

**A separate adversarial review of the mock UI now exists: `REVIEW-UI.md` (2026-07-22)** — feature/function
review of all eight screens against the deck's ch. 10 contracts, the settled decisions, and the shipped
config contract. It confirms and expands the five human-review items, adds per-screen and cross-cutting
findings (context-spine IA, evidence provenance, two-stream surfacing, level-agnosticism), catalogs nine
missing surfaces (the hierarchy editor first among them), and adds seven UI decisions to the open list.

---

**UPDATE 2026-07-11 — W1 and the backend gap are closed; two of this review's own citations were stale.**

The deck now carries **ch. 12, "Runtime and hosting: where Deployment Studio itself runs"**, which decides
the question this review names as its largest architectural silence (W1) and its first load-bearing risk. In
summary: Git is the only durable state (SQLite is a rebuildable derived cache); the Studio is a hexagonal
core with five ports — Git, Identity, Blob, Runner, Targets — each with a zero-cost local adapter, under the
rule that **no cloud SDK may be linked above the port boundary**; it ships as one static `axum` binary with
an embedded Carbon SPA, distributed as a single OCI image that runs identically on a laptop and on any
container host; the **CLI is the product and the server is a shell around it**, so slices 1–2 need no hosting
decision to be *paid for*; live evidence uses a **Git-only default mode** plus a snapshot port fed by each
site's edge-console, so no cross-site aggregation tier is built. Review decisions **#1** and **#9** are
resolved accordingly (see §6), as is the "Studio's own backend and deployment story" gap in §4. The chapter
also settles the CLI's language: **rewrite it in Rust**, because the kernel must be Rust regardless and
shelling out from Python would force users to install both runtimes.

Separately, **this review cites two files that no longer exist.** edge-console's TypeScript server was
deleted (`5a4ec6d Remove the legacy TypeScript server`; `f8a0f90 Correct the docs to the Rust gateway
runtime`) and replaced by a Rust/`axum` `gateway` crate. `edge-console/server/src/fleet/fleet-model.ts` is
now `edge-console/gateway/src/model.rs` (LKV cache at `:317-319`, `DeviceRecord` at `:324`, `hier` at
`:306`). The UI-side `ui/src/fleet/grouping.ts` citation is still valid. The citations below are corrected
in place. This correction *strengthens* the arguments it touches — the org has already made the
Rust-gateway-plus-Carbon-UI call once, deliberately, which is the precedent ch. 12 builds on.

---

## Verdict

This is a strong design with the right center of gravity: a typed deployment definition compiled
deterministically into platform-native artifacts, Git as the audit substrate, generate-only before apply,
and an explicit refusal to pretend the three targets behave the same. Its configuration chapter sits on a
contract that — since the deck was written — has actually *shipped*, which makes the config half of this
design unusually cheap.

Two structural problems keep it from being implementation-ready. The design never decides where Deployment
Studio itself runs or how its live-evidence plane crosses the site boundary; the enterprise fleet screens
quietly assume an aggregation tier the org has explicitly declared out of scope. And several of its most
visible affordances — the dataflow designer, per-layer config hashes, release/artifact identity on the wire,
device-scope config layers, blocked overrides — assume runtime surfaces that do not exist, whose cost
(four-language parity, wire-contract interop gates) the roadmap chapter never prices.

---

## 1. What the design proposes

The thesis (`index.html:159-198`, ch. 1) is that deployment is "the missing layer above runtime
configuration". EdgeCommons already abstracts runtime services behind the platform × transport model; the
next layer should describe a whole running solution once, in a semantic, Git-reviewable
**DeploymentDefinition** (`apiVersion: edgecommons.io/v1alpha1`, illustrative shape at `index.html:272-297`),
and *compile* it — the deck's word — into the artifacts each target already understands.

The critical layering rule (ch. 2, `index.html:208-216`): HOST / KUBERNETES / GREENGRASS remain *runtime
profiles*; supervisord, Helm/Kustomize, GDK, Greengrass deployments, and CI/CD are *deployment mechanisms*
above them. A rendered supervisord block still launches `--platform HOST`; a recipe still uses `GG_CONFIG`;
a Kubernetes workload keeps the whole-volume ConfigMap mount and probe conventions.

The object model (`app.js:61-152`) has ten nodes: Deployment Definition, Environment (dev/lab/prod value
sets), Edge Node (gateway / namespace-or-workload-group / thing-or-thing-group depending on target),
Component Instance, Config Layer Ref (ordered ancestry lineage), Policy, Renderer, Secret Ref (never
values), Git Catalog (a future `GitCatalogSource` on ConfigComponent's source seam), and Evidence Bundle.
Chapter 3 also defines negative space: no secret values, no rendered manifests except release snapshots, no
arbitrary shell except declared, reviewed hooks (`index.html:299-305`).

**Configuration** (ch. 4) adopts the hierarchical-config direction: users author raw ordered layers
(enterprise → site → building → zone → line → device → component); clients deep-merge into one effective
config; only the merged document is schema-validated; ConfigComponent is the bridge, extendable either by a
Git-backed catalog source or by rendering Git content into the existing file/ConfigMap sources
(`index.html:326-331`).

**Storage** (ch. 5) is Git-first: every change is a real branch and commit; promotion tags a release whose
manifest binds definition commit, renderer version, artifact hashes, validation evidence, and apply records.
The recommended layout is `deployment/{definitions,layers,targets,policies,releases}` (`index.html:379-399`),
with render snapshots committed only at release boundaries.

**Rendering** (ch. 6) is three renderer families emitting native artifacts *plus* a normalized
machine-readable plan — "the common currency for validation, UI display, policy checks, and deployment"
describing creates/updates/deletes/restarts, config mutations, credentials touched, and rollback affordances
(`index.html:445-450`).

The **target deep-dives** (ch. 7) are notably honest. HOST's open question is apply semantics: generate-only
first, then "a narrow apply adapter … without becoming a general-purpose remote execution platform"
(`index.html:471-477`). Kubernetes environments must pick exactly one ownership mode, direct apply XOR
GitOps, "because that makes drift ambiguous and can cause controller fights" (`index.html:487-493`).
Greengrass is "where release locking matters most" — block apply on unlocked versions, unexplained wildcard
IPC, or missing lab evidence (`index.html:503-508`).

Chapter 8 positions the Studio as an IaC author/consumer (generate Terraform/CDK inputs, consume outputs,
never silently own org infrastructure). Chapter 9 defines the DevSecOps pipeline Commit → Validate → Render
→ Policy → Sign → Approve → Apply → Observe, with OPA/Rego over plan JSON and supply-chain evidence (SBOM,
cosign, SLSA) traveling with releases.

The **product surface** (ch. 10 + mock-app) is a "deployment control room": left rail Workspace / Assets
(Fleet, Dataflows, Components, Config) / Delivery (Render review, Releases) / Operations (Drift). A draft is
a Git branch with a frozen base release; the right inspector explains ownership, consequences, and missing
evidence. Screen contracts with failure states are specified (`index.html:826-894`). The hierarchy editor is
declared "the most important mock" (`index.html:896-899`) and is built around value explanation: search a
path, see the winning layer and overridden ancestors, edit only the layer you own, re-render. Complexity
reducers: lineage strip, **target standard + exceptions** (one enterprise target family; HOST/k8s/GG
exceptions explicit and governed), risk ledger, diff-by-consequence (restart / storage / network / identity
/ permission / config / artifact), progressive raw output, protected action lane.

**Operations** (ch. 11) classifies drift four ways — definition, rendered artifact, target apply, runtime
evidence — and defines rollback as reapplying a previous release manifest. The **roadmap** (ch. 12) is five
slices: model + CLI renderer → evidence → Git storage + `GitCatalogSource` → UI → execution integration.

The deck flags as open: render snapshots in Git vs hashes-only; secret handling shape; override boundaries;
promotion gate evidence; config layering scope; hosting the workflow in Edge Console "only after real
identity, append-before-dispatch audit, and protected Git writes exist" (`index.html:1158-1190`); and the
HOST apply question above.

---

## 2. Strengths

**The runtime baseline is accurate, and that is rarer than it sounds.** The platform facts in `app.js:28-59`
— HOST args shape, CONFIGMAP whole-volume mount with `..data`-swap hot reload, Downward-API identity
fallback (`EDGECOMMONS_THING_NAME` → `POD_NAME`), `GG_CONFIG` + `configurationUpdate` merge/reset — all
check out against `core` source and the shipped chart (`core/test-infra/k8s/chart/templates/deployment.yaml:92-116`
for the `/startupz` / `/livez` / `/readyz` probes). The "no `subPath` ConfigMap mounts" semantic rule
(`app.js:239`) encodes a real kubelet behavior that genuinely breaks the shipped hot-reload path. The deck
was written against the actual repos, not from memory — exactly what the org's design-fidelity rules demand.

**The configuration chapter sits on substrate that has already shipped — the deck under-claims here.**
Chapter 4 says the platform is "now *moving toward* full hierarchical config" (`index.html:317-320`). In
fact `core` main has "Implement hierarchical config across providers" (commit `424bf84`): the ordered-lineage
client merge is implemented and vector-tested in all four languages
(`core/libs/java/.../config/DeepMerge.java:20-45` — objects merge recursively, arrays/scalars/null replace;
`libs/rust/src/config/layered.rs:98-133`; `libs/python/edgecommons/config/manager/hierarchical_config.py`;
`libs/ts/src/config/layered.ts`; shared `hierarchical-config-test-vectors/`), with lineage scope /
identity-ownership conflict validation (`LayeredConfigCoordinator.java:187-233`). Server-side,
`config-component` serves raw ordered lineage bundles over `ecv1/{device}/config/main/cmd/get-configuration`
with `set-config` push, and the "reject invalid catalog, keep last good" behavior the deck describes is real
(`config-component/src/coordinator.rs:106-112`). The `CatalogSource` trait seam the deck wants to extend
with Git exists exactly as claimed (`config-component/src/source.rs:29-32`, with file/configmap/env
implementations at `:329-367`). Even the k8s and Greengrass validation harnesses for this path exist
(`core/test-infra/k8s/hierarchical-config/run.sh`, `core/test-infra/interop/gg_hierarchical_config/`).

This is the "good idea this codebase is unusually well-positioned to execute" case: the single deepest
dependency of the whole design is not future work, it is on `main`.

**The problem it targets is real and quantifiable in-tree.** Today the three deployment surfaces are three
hand-maintained artifact sets duplicating the same identity/config/platform facts. Five repos each carry
`recipe.yaml` + `gdk-config.json` + `build.sh` with a uniform skeleton but per-language deltas (e.g.
`telemetry-processor/recipe.yaml:126-130` vs the pip-venv install script in `modbus-adapter/recipe.yaml:76-98`).
Four of five carry raw `k8s/deployment.yaml` + `configmap.yaml`. And
`bottling-company-test/sites/dallas-site/supervisor/filling-line.conf` is entirely hand-written per device,
down to the `wait-for-tcp` gates (`:78,89,100,112,123,134`). That harness doubles as a ready-made **oracle**
for a deterministic HOST renderer — the exact target artifacts already exist as reviewed, working files.

**The compile-don't-abstract stance is the right answer to the three-way divergence problem.** Refusing a
lowest-common-denominator model, treating supervisord as a HOST *strategy* rather than a platform, emitting
native artifacts plus one normalized plan, and requiring k8s environments to pick a single ownership mode
are all correct calls, and they extend the same architectural move (platform × transport resolver) the org
already made once, successfully.

**Generate-only-first sequencing, with governance instincts that already exist in the code.** The Greengrass
version-locking gate the deck demands ("block apply when versions are not locked", `index.html:505-508`) is
already encoded in miniature in `core/cli/edgecommons_cli/commands/deploy.py:96-100`, which refuses to deploy
a `NEXT_PATCH` version. The five-slice roadmap keeps runtime and tests stable and defers everything
credential-shaped, which matches RM-002's unresolved open questions instead of pretending they're settled.

**The fleet join key exists end-to-end.** The hierarchy the Studio would author is the same hierarchy the
catalog's identity layers stamp into every message (`{hier, path, component, instance}`), and edge-console
already groups its fleet by exactly those generic `{level, value}` pairs
(`edge-console/gateway/src/model.rs:306,324`; `ui/src/fleet/grouping.ts`). Authoring → catalog →
identity → console grouping is a closed loop today; the Studio's fleet tree does not need a new taxonomy,
only the definition side of one that already flows.

*(Citation corrected 2026-07-11: the server-side grouping now lives in the Rust gateway,
`edge-console/gateway/src/model.rs:306,324`, not the deleted `server/src/fleet/fleet-model.ts`. The UI-side
`ui/src/fleet/grouping.ts` is unchanged.)*

**The validation ladder maps onto gates the org already runs.** Schema drift gates, cross-language interop,
kind smoke, lab-5950x Greengrass regression, and the hierarchical-config load/reject/keep-last-good check
(`app.js:230-256`) are all existing infrastructure, not aspiration.

---

## 3. Weaknesses

### W1 — The design never decides where Deployment Studio runs, and its most prominent screens depend on it

> **RESOLVED 2026-07-11 by deck ch. 12** (see the update note at the top). The Studio is a standalone
> single-binary `axum` service whose default mode is Git-only; live evidence crosses the site boundary via a
> snapshot port fed by each site's edge-console, so no enterprise aggregation tier is introduced and the
> console's site-scoped design is composed with rather than contradicted. The analysis below stands as the
> statement of the problem the chapter answers.

The fleet mock is enterprise-wide — Acme → Dallas + Austin, 18 lines, with per-line runtime evidence,
keepalive freshness, and config-hash matches (`mock-app/fleet.html:46-53, 216-224`). But the only
live-evidence plane in the stack is edge-console, which is deliberately **site-scoped**: its DESIGN.md places
enterprise explicitly off-bus and out of scope ("a cloud concern", `edge-console/docs/design/DESIGN.md:134-135`,
§15 non-goals at `:647-648`), the FleetModel is a flat per-site device→component LKV cache
(`edge-console/gateway/src/model.rs:317-319`), and the bridge's multi-site root injection is a deferred
enterprise-tier item (ROADMAP A19).

Chapter 11 says the Studio "should connect those signals to the release model" (`index.html:963-967`) without
saying how signals cross the site boundary, who hosts the correlating service, or how this coexists with the
org's PN-2 positioning (local-first, air-gapped-capable operations). A Git-first central control plane and a
disconnected-site posture are not automatically compatible; the deck is silent on the tension.

This is the largest architectural silence in the document, and it blocks the fleet, drift, and
"promote and observe" screens — roughly half the product surface.

### W2 — The runtime-evidence affordances assume wire surfaces that do not exist, and the deck never prices them

What a component actually publishes today: the `state` keepalive body is `{"status","uptimeSecs"}` plus
optional `instances[]` connectivity (`core/libs/java/.../Heartbeat.java:215-251`); the `cfg` class publishes
the full **redacted** effective config with no hash (`EffectiveConfigPublisher.java:85-86`, redaction at
`:127-159`). Nothing on any wire carries a config hash, artifact version, digest, or release tag — verified
by repo-wide search.

So "config hash 7a4dd1 matches render" (`mock-app/fleet.html:220, 245`) is achievable only if the Studio
recomputes a hash over the *redacted* cfg body and applies identical redaction to its rendered config before
hashing — feasible, but a subtle contract that deserves a paragraph and gets none. "Artifact hashes match
lock" as runtime-health evidence (`app.js:254`) and the per-line "release lock … at render hash 2fc1e9"
(`app.js:601, 645-650`) have **no wire source on any platform**, and on HOST no control-plane source either.

The honest options are:

- **(a)** a core wire change to the state body — which under the org's own rules is a four-language parity
  change requiring the full interop matrix plus lab-5950x deployed regression; or
- **(b)** per-target control-plane queries (Greengrass deployment status API, Kubernetes labels/annotations —
  the mock's `edgecommons.io/config-hash` annotation at `mock-app/app.js:16-17` is the right k8s-native move)
  with HOST explicitly deferred.

The deck should choose. Instead the mock displays the evidence as if it were free.

### W3 — The Dataflows screen is the least-grounded surface, and the flagship policy feature depends on it

The mock's dataflow edges declare message contracts (`southbound.signal.update`, `processed.batch`,
`uns.event`), a topic expression `edge/{site}/{line}/signals/update` (`mock-app/definition-map.html:114`),
per-edge transport patterns, backpressure (`bounded queue / drop oldest / block publisher`) and retry
policies (`:115-117`). Almost none of this exists:

- `southbound.signal.update` is a protobuf body lane, not a declarable per-edge contract.
- `processed.batch` and `uns.event` are invented.
- The topic expression **violates the ecv1 UNS grammar** (`ecv1/{device}/{component}/{instance}/{class}[/channel]`)
  that `gg.uns()` enforces at build time — an operator cannot type that topic into a compliant component.
- Backpressure vocabulary maps to nothing; the real knobs are MQTT QoS 0/1/2 and the stream buffer's `on_full`.
- "Runtime capability" claims have no backing: the registry schema carries name/repo/language/category/
  platforms/topics and rejects anything more (`registry/registry.schema.json:16-65`, `additionalProperties:false`),
  while the `describe`/`discovery` facades that could self-report capabilities are explicitly deferred
  (ROADMAP A20, A36).

Now the dependency chain. The deck's showcase policy warning — "Greengrass SubscribeToTopic scope is broader
than **generated topic map**" (`app.js:487, 501`) — presupposes exactly this nonexistent contract model,
because you cannot derive a least-privilege topic map without knowing who talks to whom. Without it, the
renderer can only emit template-level ACLs, i.e. the status quo the warning is meant to fix.

The deck presents its least-real feature as load-bearing for its most-advertised gate.

### W4 — The config-layer screens exceed the shipped hierarchical contract in three specific, uncosted ways

1. **Device-scope layers.** The mock shows `device/gw-fill-01` as a guarded, config-carrying layer
   (`mock-app/hierarchy-config.html:51`; `app.js:753-754, 771`), but the shipped contract explicitly excludes
   the device from the catalog — "The runtime device is … not repeated as a catalog node"
   (`core/docs/HIERARCHICAL_CONFIG.md:14-15`); nodes end above device, components are leaves.
2. **Blocked overrides and per-layer ownership.** "Device is not allowed to override heartbeat cadence in
   prod" (`app.js:740-741`), the ownership/editability matrix (`app.js:764-773`), and the `blocked` value
   state have no counterpart anywhere — the shipped merge is unconditional later-wins (`DeepMerge.java:10-13`)
   and `config-component` has zero policy machinery.
3. **Per-layer hashes.** The mock's "runtime wire shape" shows `layers[].hash` and `effectiveHash`
   (`app.js:786-788`); the real bundle carries only a bundle-level `catalogVersion` content fingerprint — no
   per-layer hashes exist (`config-component/src/catalog.rs:192-223`).

Each of these is fine as an *authoring-side* construct enforced by the Studio and Git review — but then the
design must say so. Presented as runtime wire shapes and runtime guarantees, they are four-language
wire-contract changes wearing UI clothing.

### W5 — The ReleaseLock model contradicts RM-002's own recorded refinement, silently

`ROADMAP.md` RM-002 explicitly corrected its first draft: do **not** fuse component artifact version and
config into one atomic transaction — "that's precisely the GG model and it's the conceptual complexity that
bites users"; treat them as two independently versioned, independently reconciled streams, each with its own
drift signal and rollback target (`ROADMAP.md:149-152`).

The deck's ReleaseLock binds source commit + render hash + artifact digests + config into one promoted unit
with one rollback lock (`app.js:645-650`; release gate throughout). There are defensible reasons to prefer the
fused shape (GMP evidence bundling, single audit object), but the deck never engages the register entry it
overrides. By the org's own fidelity rules, that is a renegotiation to surface, not a default to slip in.

Notably, the shipped architecture naturally supports the two-stream model: the hierarchical catalog *is* the
config stream (push a new catalog without touching artifacts), and platform deployments are the artifact
stream.

### W6 — Target-semantics leaks the deck's honesty doesn't fully cover

The deck deserves credit for saying renderers "should not pretend those targets behave the same"
(`index.html:414-419`), but several divergences still go unnamed.

**Greengrass target granularity.** The model assigns components per edge node (`nodes[].components[]`,
`index.html:277-295`; the wizard assigns to `gw-fill-01`), while Greengrass deploys to thing groups where a
device's effective component set is the **union of all deployments across its groups**, and version conflicts
fail the deployment. Per-node assignment implies per-thing deployments or a group per node, each with real
operational limits. The mock mixes both bindings — thing group `dallas-prod` at line scope, "Greengrass thing
gw-fill-01" at node scope (`mock-app/index.html:246`, `fleet.html:209`) — without a mapping rule. This must
be a modeled decision, not a rendering detail.

**Atomicity and partial failure.** A Greengrass deployment is transactional per target with health-based
rollback; Kubernetes converges object-by-object (mid-rollout, old and new coexist); `supervisorctl
reread/update` has no transactionality at all — a six-program change can strand a mixed state. The normalized
plan's "rollback affordances" therefore mean three different things, and the plan schema as sketched has no
vocabulary for partial-failure semantics.

**Rollback vs durable state.** "Rollback means selecting a previous release manifest and … reapplying its
artifacts" (`index.html:977-979`) ignores that PVCs, stream buffers, Greengrass artifact/work directories, and
file-replicator spools do not roll back. Config + artifact rollback over stale durable state is precisely
where edge systems hurt themselves; the design needs at least a stance (e.g. rollback plans must enumerate
stateful resources and declare keep/wipe).

**Offline and intermittent connectivity.** Greengrass deployments queue in the cloud and land on reconnect;
GitOps pull requires the cluster to reach Git; HOST bundles need a human or orchestrator. "Promote and observe
convergence" spans minutes to days depending on target and connectivity, and the drift taxonomy will
misreport an offline site as target-apply drift. The taxonomy needs a reachability dimension; the deck (and
PN-2) demand it, and it's absent.

### W7 — Remaining fidelity items

Three stale current-state claims were corrected on 2026-07-09 (see the note at the top). Two related items
remain open:

1. **The deck's Greengrass-standard scenario assumes a bridge variant that does not exist.** The corrected
   `uns-bridge` CLI claim originated in the component's Greengrass *stub* recipe (`uns-bridge/recipe.yaml:1-6, 63`).
   That stub is a real blocker, not a documentation slip: the IPC-primary bridge variant is deferred
   (ROADMAP A52), and the deck's Greengrass scenario quietly assumes it away. This belongs in the
   dependency register, not the doc-sync list.
2. **The mock renders artifacts that don't match the real ones.** `mock-app/app.js:18-24` shows the Rust
   telemetry-processor's recipe as `com.edgecommons.TelemetryProcessor` with `Run: python3 -m telemetry_processor`,
   versus the real `com.mbreissi.edgecommons.*` binary lifecycle at `telemetry-processor/recipe.yaml:126-130`.
   A mock whose pitch is "native artifacts operators recognize" should show the real ones.

Separately, chapter 4's "moving toward full hierarchical config" (`index.html:317-320`) still *under*-claims
the shipped state (§2). The design is stronger than its own current-state chapter says, and should claim that
credit accurately.

### W8 — Concurrent drafts have no story

The fleet mock shows two open drafts touching the same line (`fleet.html:227-234`); the draft model is "a Git
branch that freezes the base release" (`app.js:735-738`). Two branches editing the same layer file merge
textually, not semantically; nothing addresses definition-level conflict detection, rebase semantics, or lock
scope. For a multi-owner site — which the ownership matrix implies — this will surface in week one of real use.

---

## 4. Gaps

**The Studio's own backend and deployment story.** ~~A UI that creates branches, runs renders, evaluates
policy, and holds Git credentials is a service, not a static page — yet the deck specifies no service
topology, no storage for the drafts index / render cache / audit stream, and no deployment shape for the
Studio itself.~~ **CLOSED 2026-07-11 by deck ch. 12:** service topology is one `axum` binary with an embedded
Carbon SPA; storage is Git (durable) plus an embedded SQLite derived cache and nothing else; the deployment
shape is one OCI image plus a Helm chart, a compose file, and a supervisord conf. The interim answer before
the UI slice is that there *is* no service — the CLI does the whole job.

The ironic footnote still stands and got worse on inspection: **no EdgeCommons component publishes a
container image today.** edge-console ships no Dockerfile / k8s manifest / recipe, and `config-component`'s
Dockerfile is CI-only — built by `core/test-infra/k8s/hierarchical-config/run.sh:87` as
`edgecommons-config-component:hierarchical-ci` and side-loaded into kind, never published. So the Studio
would be the org's first published image. The *pattern* for containerizing a Rust component from the umbrella
root exists and is proven (and re-implemented independently in `bottling-company-test/dockerfiles/`), but the
release plumbing is new work that ch. 12 now records rather than assumes.

**Authentication to each target control plane.** Apply mode needs AWS credentials for `greengrassv2`,
kube-apiserver access, and some host path. The deck's instinct — approved runners, "apply credentials not
loaded in this browser session" (`app.js:604`) — is right, but the runner identity model, per-environment
credential scoping, and how *generate-only* mode obtains credentials for its own target-smoke gates (smoke
requires deploying somewhere) are absent.

**Identity, RBAC, and audit for the Studio.** The ownership/editability matrix and approval lanes
(`app.js:764-773, 1007-1016`; `release-gate.html:53-58`) presuppose an identity model that exists nowhere in
the stack: edge-console's IdP seam is deferred and its command audit log is confirmed unbuilt
(`edge-console/README.md:315`; `edgecommons-buildout-nextsteps.md`, "Regulated Operator Actions Need Audit").
Generate-only mode can honestly delegate all of this to the Git host — PR approvals, protected branches,
CODEOWNERS mapped onto the `layers/` tree — and the design should say so explicitly, because it converts a gap
into a feature. Delegated apply cannot ship until the same identity/audit gap blocking the pharma track
closes; the deck should cross-reference that dependency rather than leaving "approval lane" floating.

**Migration/import is casually scoped and is actually research-grade.** "Import generated artifacts — map an
existing supervisord, Kubernetes, or Greengrass deployment back into the model"
(`mock-app/index.html:83-85`; empty-state rules `app.js:571-572`). Reverse-compiling arbitrary artifacts into
a semantic model is a hard inference problem. The realistic v1 is "import as opaque exception target + manual
modeling", and the wizard should say that.

**Environment/promotion mechanics.** The Environment node exists in the model (`app.js:71-79`) but nothing
specifies how lab vs prod renders differ (per-env overlay files? bindings in
`targets/{host,kubernetes,greengrass}/prod.yaml`?), how promotion across environments interacts with
branches/tags, or what release-lock *scope* is — the mock shows line-scoped locks ("Filling line 7 reports the
selected lock"), implying partial-scope releases whose granularity model (site? line? node?) is undefined and
which collides directly with the Greengrass thing-group question in W6.

**Registry metadata.** The component catalog screens need per-component config-schema refs, required-field
metadata, command verbs, health endpoints, and artifact metadata (`app.js:344-357`; wizard catalog table).
`registry/components.json` carries none of this and its schema forbids additions
(`registry/registry.schema.json:16-65`). Extending the registry is a real, separate workstream the roadmap
chapter doesn't mention.

**A wire-contract impact register.** The design implies, but never lists, the core changes that would trigger
the org's heaviest gates (four-language parity, interop matrix, lab-5950x): state-body evidence fields (W2),
per-layer/effective hashes if wire-visible (W4), runtime-enforced override blocking (W4), and possibly the
long-deferred `publish_retained` (ROADMAP A43) if fleet views ever want retained desired-state markers. Each
is a line item with a cost an order of magnitude above a Studio-side feature; the design should carry that
register so nobody discovers it mid-slice.

**Testing strategy for the Studio itself.** Determinism ("deterministic render", `index.html:62`) is asserted,
never operationalized: byte-stable serialization rules, golden-file suites per renderer, and a policy for
renderer-version bumps invalidating hashes. Also unstated: whose infrastructure runs "target smoke" in a
customer environment that has no lab-5950x — the deck generalizes the org's own dev lab into a product gate.

---

## 5. Implementability

Ratings per major piece, judged against verified current state.

### Already supported (consume, don't build)

The hierarchical config substrate — four-language lineage merge + validation + vectors, ConfigComponent
lineage serving with keep-last-good, k8s/GG harnesses (citations in §2). The effective-config assembly the
renderer needs *is* this code. Also already supported: schema strictness for validating rendered effective
configs (`core/schema/edgecommons-config-schema.json:495-496`), and hierarchy-driven fleet grouping on the
console side.

### Straightforward

- The deployment model + `edgecommons deployment validate` CLI. Note the CLI has no config-schema validation
  today (`validate.py:28-38` is recipe lint only), so effective-config validation must be reimplemented or
  delegated to a library shell-out.
- **The HOST renderer in generate-only mode** — supervisord INI + config packs + ConfigComponent catalogs +
  checksums, with `bottling-company-test` as a byte-comparable oracle (including the catalog files the harness
  already hand-writes, e.g. `configs/packaging-line/config-catalog.tmpl.json`).
- The Kubernetes renderer — the chart and four repos' raw manifests are direct precedents. The one design/code
  gap is that StatefulSet + PVC exists only as an illustrative example explicitly "NOT part of the smoke"
  (`core/test-infra/k8s/streaming-statefulset-example.yaml:1-13`), not a chart template — modest new work.
  GitOps handoff is just writing files to a release path.
- Evidence bundles / release manifests in CI — hashing and JSON in GitHub Actions.
- `GitCatalogSource` — the trait seam is clean and snapshot-based, so a git backend slots in without touching
  serving code. But `config-component` is ~1.8k LOC with ~22 tests and **no CI of its own**, so giving it a
  production Git dependency raises its maturity bar first. Cheaper still is the deck's own "second path"
  (`index.html:329-331`): render Git content into the existing file/ConfigMap sources from CI — zero new
  runtime dependencies at the edge.

### Hard but tractable

- The Greengrass renderer. Recipe / gdk / deployment-JSON templating is mechanical against uniform per-repo
  precedents, and `deploy.py:103-123` is the apply precedent. The genuinely hard parts are per-language
  artifact packaging (binary vs shaded jar vs pip-venv wheel — enumerable but real), the thing-group mapping
  decision (W6), and accessControl derivation, which should ship as template-level ACLs plus the
  access-control *report* until a contract model exists.
- Plan-JSON schema + OPA policy gate.
- The read-only UI pair (config layers + render review) against Git, with identity delegated to the Git host.
- Greengrass drift via deployment-status APIs joined to core device state; Kubernetes drift via GitOps
  controllers (ecosystem-provided).

### Requires new substrate

- **HOST apply and HOST drift.** A host agent or SSH orchestrator with a stage/verify/reload/report protocol
  is a new distributed component with its own security model. The deck's "narrow apply adapter" framing is
  right but should be costed as a component, not a feature.
- **Runtime evidence beyond config-hash.** Release/artifact identity on the wire is a four-language wire change
  gated by the full interop matrix and lab regression, per the org's validation matrix.
- **The cross-site evidence aggregation tier** (W1). Nothing in the stack does this, and the console design
  explicitly refuses to.

### Research-grade (descope from v1)

- The prescriptive dataflow/contract/capability model (W3) — gated on the deferred describe/discovery facades,
  RM-005, and registry metadata. A *descriptive* graph derived from existing configs is tractable and still
  useful.
- Artifact import / reverse-compilation.

### Load-bearing risks that decide whether this ships

1. **The hosting/aggregation decision.** It blocks the fleet, drift, and observe screens, and nothing else
   forces it early — so it will be deferred by default and then poison slice 4.
2. **The Greengrass thing-group granularity rule.** It constrains the *model*, so it must be decided in slice 1,
   not discovered in the renderer.
3. **Determinism discipline.** Stable serialization from day one, or the entire hash/evidence edifice wobbles.
4. **The identity/audit gap** for anything beyond generate-only — shared with the pharma track, not solvable
   inside this project.
5. **Scope containment on the dataflow/capability model** — the design's biggest "quietly becomes a platform
   rewrite" magnet.

### Sequencing and the first vertical slice

The deck's five slices are broadly right, with two amendments.

**Slice 1 should build one renderer, not three:** the deployment model + `edgecommons deployment validate/render`
+ the **HOST renderer**, with the acceptance test being regeneration of `bottling-company-test/sites/dallas-site`
— supervisord confs, per-line config JSONs, and the ConfigComponent catalog — from a definition, verified
against the hand-written files.

Rationale: the oracle is in-tree; it exercises the whole model (multi-device site, hierarchy, config lineage,
per-component config) on shipped substrate with zero cloud control plane; it converts the E2E harness into the
renderer's first permanent consumer; and HOST is where the marginal value is highest — RM-002's own motivation
is that Greengrass and Kubernetes have native deployment mechanisms and HOST has none.

Greengrass comes second (release locks, evidence, generate-only PR flow — the governance showcase, and the lab
exists). Kubernetes third (lowest marginal value; the ecosystem carries most of it). UI only after the CLI
proves the model, starting with config-layers + render-review as a standalone read-only app. Dataflows and
import stay out of the first product cut entirely. First component: telemetry-processor (present in every mock,
has a recipe, k8s manifests, and supervisord presence).

### Parity note

The Studio itself — CLI renderer, server, UI — is a tool/component, not the core library, so the four-language
parity rule does not bind it (`config-component` being Rust-only is the precedent). Parity is only triggered by
the wire items in the gap register above. Keep the deployment model out of the language libraries and this
design stays parity-cheap; let evidence fields creep into the state body casually and it stops being cheap
immediately.

---

## 6. Decisions to make before implementation starts

1. **Where does the Studio run, and where does live evidence come from?** — **RESOLVED 2026-07-11, deck ch. 12.**
   *Decision:* a standalone single-binary `axum` service with an embedded Carbon UI, shipped as one OCI image
   that runs identically on a laptop and on any container host; Git is the only durable state and SQLite is a
   rebuildable cache; five ports (Git / Identity / Blob / Runner / Targets) each have a zero-cost local
   adapter, and no cloud SDK may be linked above the port boundary. Because the CLI is the product and the
   server is a shell around it, v1 is still **pure Git + CI with no service** — as this review recommended —
   but the hosting question is now *decided* rather than deferred, which is what stops it from poisoning
   slice 4. Live evidence: **Git-only default mode**, plus a snapshot port fed by each site's edge-console.
   No enterprise aggregation tier is built, and no core wire change is required.
   *New decision this forces:* the CLI is rewritten in Rust and becomes the single binary (see the update
   note at the top).

2. **Fused ReleaseLock vs RM-002's two-stream refinement.** — **RESOLVED 2026-07-11.**
   *Decision:* **two-stream, do not fuse.** Config releases and artifact releases are independently versioned
   and independently reconciled, each with its own drift signal and rollback target. The ReleaseLock is a
   **correlation/evidence envelope over both, not an atomic apply unit** — it records what was in effect
   together, and does not force the two to move together.
   *Consequence:* a config change ships without reshipping the artifact, and vice versa. The cost is a second
   drift signal, which the four-way drift taxonomy already accommodates. The fused branch is rejected because
   it buys a single audit object at the price of exactly the Greengrass-style coupling RM-002 rejected.

3. **Greengrass target granularity.** — **RESOLVED 2026-07-11.**
   *Decision:* **per-thing deployments only. Thing groups are not used.**
   *Rationale (user, 2026-07-11):* IIoT edge devices each carry a **unique configuration**, and the members
   of a thing group necessarily share **one deployment document** — so a group cannot express per-device
   config. Grouping is the wrong primitive for this fleet.
   *Consequence:* the union-semantics problem disappears entirely, and the modeling constraint that was
   blocking slice 1 dissolves — a definition's `nodes[]` map **1:1 onto Greengrass deployments**
   (`targetArn` = a thing ARN). N devices means N deployments, one apply record per node in the plan, and
   partial failure is per-node — which is *better* for the staged/selectable rollout the deck already wants.

   *Correction to a claim made while resolving #2 (user, 2026-07-11):* **Greengrass does not technically fuse
   config and binary.** A deployment can carry a new `configurationUpdate` against an unchanged
   `componentVersion`, or a new `componentVersion` retaining existing config. **It is the tooling and UI that
   combine them.** Two things follow, and they are recorded as decisions in
   `core/docs/platform/DESIGN-cli.md` §8.5.2 (D-CLI-13, D-CLI-14):
   - **Separation is a *model* invariant, not a *transport* one.** The model, release streams, evidence,
     drift signals, and rollback targets keep config and artifact strictly distinct — but the **Greengrass
     adapter MAY coalesce them into a single native deployment** when that suits a given command. The
     `ReleaseLock`'s correlation envelope is what makes a coalesced apply auditable against two streams, and
     either stream can still be rolled back alone.
   - **Config delivery is per *provider*; `config-component` is preferred but NOT required** (user,
     2026-07-11). Customers may keep the native Greengrass config source or any supported provider, so the
     deployment system must not make one component mandatory. The config stream is therefore **one model with
     N delivery adapters**: the effective config is computed once (`layered.rs`), and the component's declared
     config source selects delivery — `CONFIG_COMPONENT` → catalog push (no deployment at all); `GG_CONFIG` →
     a config-only deployment; `CONFIGMAP` → the k8s ConfigMap; `FILE` → a staged, checksummed file; `ENV` →
     unit/manifest environment; `SHADOW` → a shadow update. This also agrees with **decision #6**, which
     already preferred rendering into the existing file/ConfigMap sources over building `GitCatalogSource`.
   - **The restart caveat.** A pure config update does **not reliably restart the component** — which is the
     reason EdgeCommons has the **dynamic config (hot-reload)** feature. And **whether hot reload applies is a
     property of the config source, not the platform** (`FILE`/`CONFIGMAP` are watched; `ENV` is not; a GG
     `configurationUpdate` is not reliably a restart). So **restart impact becomes a first-class field of the
     plan**, computed per component from its config source, feeding the `diff`'s existing *restart*
     consequence group.

4. **Dataflows: descriptive or prescriptive.** — **RESOLVED 2026-07-22 (PLAN step 2.4).**
   *Decision:* **descriptive and derived only, in the product.** The Topology view renders a read-only graph
   derived from the configured components, scoped to a selection, for explanation and verification, with deep
   links into the config surfaces that own the writes. The prescriptive contract/capability model is extracted
   whole to `FUTURE-dataflows.md`, gated on describe/registry metadata that does not exist yet; derived
   least-privilege ACLs remain its eventual justification. Deck ch. 10 contracts and the workflow strip
   updated; the mock screen catches up in the step-4 UI pass.

5. **Device layers and blocked overrides: authoring-side or runtime contract.** — **RESOLVED 2026-07-22
   (user, PLAN step 4 / UI ruling 5A).**
   *Decision:* **authoring-side only.** Device-scope fragments and override policy are Studio validation +
   Git ownership (CODEOWNERS over `layers/`); the UI says "rejected at save/review" and names the
   enforcement locus. Mechanically, the compiler materializes an authored device fragment into that node's
   rendered catalog leaves — per-node catalogs (proven by the step-3 kernel) make device-scope config
   expressible with **zero runtime-contract change**.
   *Explicitly revisitable, not foreclosed (user question, answered):* the authored artifacts are exactly
   what a runtime-enforced contract would consume; choosing runtime enforcement later (the W4 wire work — a
   device layer kind, client policy checks, four-language parity + interop) is **additive** on top of this,
   with no re-authoring and no migration. Trigger: a concrete driver such as defending against out-of-band
   catalog edits.

6. **Config delivery of rendered content: render-into-existing-sources vs `GitCatalogSource`.**
   *Recommendation:* CI renders catalogs into file/ConfigMap first (the deck's second path); build
   `GitCatalogSource` later, when on-edge ref pinning earns its keep — and record the ref in the catalog's
   existing `provenance`/`version` fields meanwhile.

7. **Runtime evidence: wire change or control-plane-derived.**
   *Recommendation:* control-plane-derived first — cfg-body hash comparison (with matched redaction), Greengrass
   deployment status, Kubernetes annotations. Take the state-body wire change (with its parity/interop/lab cost)
   only when HOST drift becomes a funded requirement.

   *Refinement (user, 2026-07-22) — HOST delivery evidence: **degrade honestly, build nothing.*** Delivery
   evidence is a **per-target capability**: Kubernetes and Greengrass have control planes that report it; HOST
   has none, and HOST is development / small-deployment territory. So the Studio mandates no receipt files, no
   agents, no collectors for control-plane-less targets — their delivery verdict is **unverified**, rendered as
   a distinct state (never "none", never inferred, never a pass), with every drift verdict naming its evidence
   source. An optional inspection utility component that examines a HOST deployment in place (staged files,
   checksums, supervisor state) and emits delivery evidence for developers or small sites is **demand-gated**,
   not part of the model. This supersedes ch. 11's earlier "may need an agent or command collector" language,
   which is corrected in the deck.

8. **Render snapshots in Git** (the deck's own open card). — **RESOLVED 2026-07-22, by construction
   (slice 2).**
   *Decision:* commit at release boundaries, keep previews ephemeral — exactly the deck's leaning,
   now implemented: `edgecommons deployment release --stream config|artifact` writes
   `releases/<tag>/{manifest.json, evidence.json, rendered/**}` (deterministic, no timestamps; the
   Git commit carries the time), correlating the two streams without fusing them. Determinism is
   enforced by core's Dallas golden test (`cli/crates/ec-deploy/tests/dallas_golden.rs`), which
   byte-compares a render against a committed snapshot. Previews (`deployment render`) remain
   uncommitted.

9. **Studio vs edge-console hosting.** — **RESOLVED 2026-07-11, deck ch. 12.**
   *Decision:* standalone app for v1, as recommended. The Studio and the console share a *stack* (Rust/`axum`
   backend, React/Carbon UI, shared TS protocol package, brand tokens) and the evidence formats — but not a
   process and not code. Two fleet trees will exist temporarily, which is acceptable because one is explicitly
   desired-state and the other observed-state. Revisit convergence only after the console's identity/audit
   work lands.

10. **Approvals.** — **RESOLVED 2026-07-22 (PLAN step 2.1).**
    *Decision:* **Git-host PR reviews are the approval system; no parallel Studio subsystem in v1.** Approver
    roles map to CODEOWNERS and branch protection, required approvals are required reviews, and the audit
    record is the merged PR. The Studio's gate surface renders that state and links to it. A Studio-native
    approval object is a renegotiation reserved for compliance regimes Git-host review semantics cannot
    express. (Also settles REVIEW-UI §5 decision 6.) Deck ch. 9 + decision card updated.

11. **Kubernetes delivery.** — **RESOLVED 2026-07-22 (PLAN step 2.2).**
    *Decision:* **one renderer, N delivery modes, demand-sequenced.** The renderer is the semantic compiler —
    effective-config ConfigMap with reload semantics, Downward-API identity, probes, named-node placement,
    config-hash annotation — emitting plain deterministic manifests to a release path. kubectl-from-CI and
    Argo CD/Flux handoff are delivery adapters over that one output (the only tool-specific artifact is a
    small Application resource). Sequenced behind HOST and Greengrass until a concrete consumer exists; first
    candidate is the org's own hand-maintained Kubernetes test chart. Deck ch. 7 + ch. 13 slice 4 + card
    updated.

12. **IaC boundary.** — **RESOLVED 2026-07-22 (PLAN step 2.3).**
    *Decision:* **three files are the whole contract** — `requirements.json` (what a release needs from
    infrastructure), `bindings.json` (what infrastructure answered, keyed by node and environment), and
    `plan.json` (the normalized policy input) — versioned in the release path. Tools integrate on their side
    of the boundary; EdgeCommons ships one worked Terraform example as documentation, no generated CDK/HCL
    deliverables, no cloud SDK above the port boundary. Deck ch. 8 rewritten accordingly; the IaC lab's
    snippets are explicitly customer-side patterns.

13. **The Studio/Console bright line.** — **RESOLVED 2026-07-22 (PLAN step 2.5).**
    *Decision:* **the Studio holds intent and adjudicates delivery from evidence; the Console observes live
    state and never learns intent.** The Studio compares three Git-holdable records — intended (release lock),
    delivered (apply records, control-plane status), reported (Console snapshot) — and renders verdicts.
    Practical test: observed data appears in the Studio only paired with an intent comparison; bare live
    telemetry is Console territory, deep-linked rather than duplicated. Deck ch. 11 lead + ch. 12 + Live
    evidence card updated.

14. **Node identity.** — **RESOLVED 2026-07-22 (PLAN step 2.6).**
    *Decision:* the **node key** is a stable, human-assigned identifier that outlives hardware; the machine's
    platform identity (thing / node label / hostname) binds to it via `bindings.json`, with provisioning owned
    by infrastructure. Default convention: platform identity equals the node key, because the runtime's
    device-level identity — and every UNS topic — resolves from the thing name. Replacement = same key, new
    provisioning material; rename = definition edit with a surfaced runtime-identity consequence; decommission
    retires the key and keeps its history. New ch. 3 section "Node identity is the load-bearing object"; the
    step-1 definition schema carries the fields.

15. **Recipe ownership on Greengrass.** — **RESOLVED 2026-07-23 (user).**
    *Decision:* **the deployment renderer emits per-thing deployment documents and does not generate
    recipes.** A recipe carries `ComponentDependencies`, `accessControl`, `Manifests`
    (platform/artifact/lifecycle), and the component's *default* configuration — all component
    packaging facts, all already hand-authored in every component repo beside a `gdk-config.json`,
    and none of them deployment intent. Producing and publishing a recipe is release engineering
    (`component package|release`, RM-013). Greengrass takes per-device configuration through
    `configurationUpdate`, which overrides the recipe's `DefaultConfiguration`, so a deployment never
    needs a bespoke recipe to carry site-specific config.
    *Evidence:* surveyed all six component recipes — dependencies differ (`>=0.0.0` / `>=2.0.0` /
    `>=2.0.0 <3.0.0`, and `uns-bridge` declares none), four of six need `mqttproxy` access, platform
    is `linux` or `all`, lifecycle differs per language, and the component name is not derivable
    (`opcua-adapter` → `OpcUaAdapter`).
    *Consequence:* the renderer needs exactly one new fact — the Greengrass component name. Canonical
    home is the registry's `greengrassComponentName` (registry PR #7, harvested from each repo's own
    recipe); `deployment lock` resolves it into the lock, and a definition may still override with
    `artifact.greengrassName` (override first, lock second). The renderer errors naming both sources
    rather than guessing.
    *This is a deviation from the deck*, which said the renderer emits "recipes, GDK config,
    deployment JSON"; the deck's ch. 7, roadmap slice, and decision surface are corrected in the same
    change, and DESIGN-cli gains §8.5.6. Revisit only if per-deployment recipe customization (site
    access-policy narrowing) acquires a driver — the cheap path then is publishing each component's
    existing recipe in its release descriptor and overlaying version/artifact/config.

---

## Open doc-sync item — CLOSED 2026-07-22

Chapter 4's current-state prose described hierarchical config as in progress; it shipped (`424bf84`). Chapter 4
and the chapter 2 framing now state the shipped contract (`core/docs/HIERARCHICAL_CONFIG.md`,
`core/docs/HIERARCHICAL_CONFIG_IMPLEMENTATION_SPEC.md`), and the mock renders the real telemetry-processor
recipe (W7.2). See the 2026-07-22 update at the top.

## Known dead code

The deck's `app.js` still carries the `mockScreens` object and its `renderMock*` functions (~620 lines), but
`index.html` has no `#mockScreen` element — the inline mock widget was replaced by links to `mock-app/`, so
that block never renders. It was updated in place for consistency rather than deleted, because deleting a
chunk of the design record is the user's call. It is a live source of future drift: the same screens now exist
twice, and only the `mock-app/` copy is visible.
