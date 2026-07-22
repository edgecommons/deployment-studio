# Review — Deployment Studio mock UI (feature/function)

**Reviewed:** 2026-07-22
**Artifacts:** the eight `mock-app/` screens plus `mock-app/app.js`, held against the deck's own product
contracts (ch. 10, `index.html:673-990`), the resolved decisions (`REVIEW.md` §6: per-thing targets,
two-stream releases, Git-only evidence with a snapshot port), and the shipped hierarchical-config contract
(`core/docs/HIERARCHICAL_CONFIG.md`).
**Scope:** low-fi feature/function only. No visual design commentary. Mock-content specifics (Dallas,
filling line 7) are treated as illustrative; findings are recorded only where the *structure* — not the
sample data — encodes a wrong or missing model.
**Trigger:** a cursory human review (2026-07-22) raised five items; all five are confirmed below and
expanded, alongside findings of the same classes elsewhere.

---

## Verdict

The bones are right and worth keeping: explain-before-raw everywhere (winning layer, "edit here?",
consequence grouping), promotion/apply/rollback as separate controls, evidence-gated releases, a
consistent three-pane anatomy (rail / workspace / inspector), and a fleet tree that leads with business
assets rather than files. No screen is a YAML editor in disguise, which was the deck's own bar.

Three structural problems undermine the whole surface, and they matter more than any per-screen issue:

1. **The screens float free of the context that gives them meaning.** Dataflows, Components, and (partly)
   Config are presented as global peer areas, but each is only coherent *at* a node or line. The deck's own
   rule — the operator must always know "where they are in the fleet" (`index.html:684-685`) — fails on
   most screens: no breadcrumb, no asset path, no scope selector. (The deck's earlier inline mock had a
   breadcrumb path line; the standalone mock pages dropped it.)
2. **The mock contradicts three already-settled decisions.** It renders an always-live evidence plane
   (against ch. 12's Git-only default), a single release scalar with single promote/rollback controls
   (against the two-stream ReleaseLock), and it hardcodes level names the deck itself says must be derived
   (`index.html:944-948`). The screens predate the decisions and were never revisited.
3. **The mock's screens don't even agree with each other.** Three different hierarchies for the same
   Dallas world (4-level wizard, 7-level fleet with "Area", 7-level config that had "Paint zone" until
   this review), and the deck's self-declared most important screen — the hierarchy editor — does not
   exist in the mock at all.

---

## 1. The five human-review items, confirmed

### U1 — Workspace setup: no open-existing flow; steps 4–5 overreach — CONFIRMED, and it renegotiates the deck

- "Connect existing repo" and "Import generated artifacts" exist as step-1 cards
  (`mock-app/index.html:79-86`), but they are dead branches: every subsequent step assumes authoring from
  scratch, and there is no validate-and-adopt variant (repo already has definitions → skip to Fleet).
  Worse, the **most common entry of all is missing entirely: the second user on day two**, who should
  never see a wizard — they need "connect and open," which is a Git clone plus the Fleet screen.
- "Workspace setup" is permanently first in the nav on every screen (`fleet.html:20` and siblings). A
  completed workspace showing a setup wizard forever is wrong; after day zero this area should become
  **workspace settings** (storage, target standard, evidence mode, credentials, approver mapping — see M3).
- Steps 4–5 duplicate other screens' jobs: step 4 embeds a component catalog *plus a per-component config
  mini-editor* (`mock-app/index.html:228-303`) that even links to the real editor ("Open full component
  editor", `:300`); step 5 embeds a render preview (`:305-323`) duplicating Render review.
- **Fidelity note:** this is not just a mock bug. The deck *mandates* steps 4–5 — the "Start with an empty
  system" journey card includes "assign and configure components … and produce a lab render"
  (`index.html:774-780`), and the Workspace-setup screen contract row lists "component assignment and setup
  fields" (`index.html:870-876`). Accepting U1 means editing the deck's journey card and contract row in the
  same change, not just the mock.
- "Import generated artifacts" presented as a day-one peer path contradicts the deck's own roadmap, which
  descopes artifact import as research-grade (`index.html:1246-1249`). If the card stays, it must be marked
  as not-in-v1; better, remove it from the wizard.
- Minor: the level-type dropdown is a closed enum (enterprise/region/site/building/zone/line/cell/edge
  node, `mock-app/index.html:103`) — the shipped contract allows arbitrary level names ending in `device`;
  the wizard also lets you delete/reorder the terminal level with no invariant messaging (levels must be
  unique and end with the device level).

**Proposed shape:** the wizard shrinks to three real steps — storage, hierarchy + first nodes, target
standard — and then becomes a **milestone checklist with handoffs**: "add your first component" links to
Components *scoped to the chosen node*; "render" links to Render review. The owning screens' empty states
do the teaching, which the deck already demands ("missing prerequisites are next steps, not errors",
`index.html:875`). Entry branches at the door: **Create** (wizard) / **Connect** (clone → validate → open
Fleet) / nothing else.

### U2a — Fleet: is live runtime status an open question? — ANSWERED: decided, but the mock ignores the decision

The architecture is settled (ch. 12, `index.html:1194-1207`; REVIEW decisions #1 and #7): the **default
mode is Git-only** — fleet views "degrade to desired state plus last-known evidence, and say so" — and live
evidence, where wanted, arrives as a **periodic signed site-state snapshot exported by each site's
edge-console** (file drop / S3 / MQTT). No always-on live plane exists in any mode.

The mock violates every part of that:

- Second-resolution keepalive ledgers ("02:12:44 telemetry-processor keepalive — fresh",
  `fleet.html:219-222`), "42 edge nodes reporting status" (`:67`), per-component RUN status (`:296`),
  "Input flow — active" (`:316`). A *periodic snapshot* cannot produce an "active" input-flow light; it can
  produce "active as of the 02:15 snapshot."
- Nothing anywhere shows **evidence mode** (Git-only vs snapshot-fed), **snapshot age**, or **source site**.
- The deck's own fleet contract requires "unknown runtime evidence is shown as missing evidence, not
  healthy or failed" (`index.html:882`) — no mock panel demonstrates the missing/degraded state, and the
  visual language implies a feed.
- Desired-state facts and observed facts are visually identical. "Config hash 7a4dd1 — matches render"
  (`fleet.html:246`) never says *reported by whom, when*.

**Required affordances (any redesign must carry these):** a workspace-level evidence-mode badge; per-datum
provenance ("site dallas snapshot, 02:15, signed") and staleness; explicit degraded rendering in Git-only
mode (desired state + last-known evidence, labeled); and a visual split between *expected* (from the
release) and *observed* (from a snapshot) values. Per-signal sourcing under current decisions: keepalive,
broker state, reported config hash, and input-flow all come only from the console snapshot; ACL findings
are Studio-side static analysis (always available); Greengrass deployment status comes from apply records/CI.
Anything not in the snapshot is *missing*, not implied.

### U2b — Fleet: hardcoded "site"/"line"/"LINES" — CONFIRMED: mock artifact, but symptomatic

Intent answer: the deck itself mandates level-agnosticism — "The UI should not assume this exact list is
universal; it renders whatever ordered parent chain the deployment definition resolves"
(`index.html:944-948`). The mock breaks the mandate structurally, not just cosmetically:

- The fleet header asserts a fixed 7-level hierarchy as *the* hierarchy users recognize (`fleet.html:38`),
  and the tree hardcodes it (`:47-54`).
- "Lines" appears as a baked metric/column at every level (`fleet.html:66, 73, 96, 103, 138, 145`) — 
  meaningless for a customer whose levels are region/plant/cell.
- Three screens, three hierarchies for the same world: the wizard defines **4 levels**
  (`mock-app/index.html:148`: enterprise → site → line → edge-node), Fleet shows **7 with "Area"**
  (`fleet.html:47-54`), Config showed **7 with "Zone"** — a *paint* zone above a bottling line
  (`hierarchy-config.html:50` pre-correction). Config is now aligned to Fleet's world (see Corrections);
  the wizard misalignment stands as a finding.

**Rule to state in the design:** every level label, tree tier, breadcrumb segment, aggregate column, and
scope chip derives from the workspace's `hierarchy.levels` (plus the two fixed leaves: node, component).
Aggregate counts become "descendants by level" chips computed per configured level — never named columns.
And the mock should model **one** canonical Dallas hierarchy on every screen (recommended: enterprise /
site / building / area / line / device, matching Fleet).

### U3 — Dataflows: purpose unclear, cannot be generic — CONFIRMED, twice over

The user's instinct matches the code-grounded review: REVIEW W3 found this the least-grounded surface, and
decision #4's recommendation is **descriptive v1** — a derived, read-only graph — with the prescriptive
contract model gated on RM-005/registry metadata that does not exist. The mock is 100% prescriptive:
"Add dataflow" (`definition-map.html:40`), editable producer/consumer/message-class/topic/backpressure/
retry (`:112-119`). None of those knobs map to any shipped runtime surface — a "retry policy: at least
once" dropdown on a local pub/sub edge writes to nothing.

Beyond that, three structural defects:

- **Scope incoherence (the user's exact point):** the header says "for an edge node" (`:37`) but the page
  has no node selector, the topbar shows only a draft name (`:15`), and the config-bindings table mixes
  line-scope and device-scope bindings (`:79-81`). Which node's solution is this? Undefined.
- **Undefined write path:** a "dataflow" edge is not an object in the shipped model. Prescriptively, editing
  an edge means writing *two* components' config leaves (producer's output route, consumer's input) — a
  cross-component, cross-*owner* transactional edit the design never addresses.
- **Invented topic grammar:** the edit form's topic expression `edge/{site}/{line}/signals/update`
  (`:115`) contradicts the UNS contract (`ecv1/{device}/{component}/{instance}/{class}[/channel]`).
  An EdgeCommons dataflow's topics are largely *derived from* component identity and class, not authored
  free-form.
- The device-scope config binding `device/gw-fill-01 + component/replicator` (`:81`) also carries the
  W4.1 device-layer assumption, still pending decision #5.

**Proposed shape (aligns with decision #4):** rename to **Topology**, make it a **read-only derived view,
scoped by the fleet selection** (node or line). Compute nodes and edges from actual effective configs
(adapter publish classes, processor routes, replicator inputs, bridge subscriptions). Its job is to
*explain and verify*: dangling consumers, topic/class mismatches, missing capability bindings — each
finding pinned to the edge and deep-linked to the Config screen at the owning scope/path, which is where
the write happens under ownership rules that already exist. The authoring variant returns only if the
prescriptive contract model lands.

### U4 — Components: needs the hosting device's full context — CONFIRMED, plus an identity crisis

- The rail lists component *types* with no node anywhere (`component-editor.html:46-52`). But
  `telemetry-processor` runs on **both** gateways with different purposes (`fleet.html:256` "filter,
  aggregate, publish" vs `:283` "inspection quality metrics"). Which one is "Instance id: archive"
  (`component-editor.html:59`) editing? Unanswerable from the screen.
- The screen conflates two different "instance" axes: the EdgeCommons config instance
  (`component.instances[].id = archive` — the inspector's own layer path, `:111`) and the deployment
  placement (which node hosts the component). "Duplicate instance" (`:40`) — which axis does it duplicate?
- **The artifact stream is missing.** Post two-stream decision, the component editor is exactly where the
  artifact side lives — version pin, artifact source, target compatibility — yet the screen has no version
  field at all. (The deck's earlier inline mock showed "Artifact 1.4.2 signed"; the standalone page
  dropped it.)
- The rail mixes observed status into an authoring list ("running", `:47-48`) — see U2a; "running" is
  snapshot-dependent and unlabeled.

**Proposed shape:** Components is not a global area. From the fleet selection (node), the node's components
list opens an editor **anchored to node + component + config-instance**, breadcrumbed. The editor gets two
explicit panels matching the two streams: **artifact** (version, source, compatibility) and **config leaf**
(schema-aware fields — which are, honestly, a specialized lens over the component layer that the Config
screen also edits; one substrate, two lenses, stated as such). Registry-level defaults ("edit what new
assignments start from") is a separate, explicitly-labeled surface, not this screen's implicit second job.

### U5 — Config: closest to right; findings below (§2, Config)

Confirmed as the strongest screen: scope-before-edit, winning-layer explanation, "edit here?" ownership
column, and effective-vs-raw tabs are the right model. The findings are contract fidelity (device layer,
instance-leaf scope, blocked-override language) and one real missing feature (blast radius). See §2.

---

## 2. Per-screen findings beyond the five

### Fleet

- **F1 — Two-stream never reached this screen.** "Current release: 07-08" as a single scalar per line
  (`fleet.html:193`). Under the decided model every node carries a *pair* (config release, artifact
  release), each with its own drift state. The fleet roll-up needs both, or it will actively mislead the
  first time a config release ships without an artifact release.
- **F2 — The draft list displays the exact hazard the design has no story for (W8).** Two drafts touch
  line 7 (`fleet.html:231-232`) with no overlap/conflict indicator. Until W8 is decided, the minimum is a
  conflict badge when two drafts modify the same layer file or definition object.
- **F3 — Components as tree leaves** (`fleet.html:54`) makes "Component" an eighth pseudo-level. Fine —
  but state the rule: tree tiers = `hierarchy.levels` + two fixed leaf kinds (node, component).
- **F4 — "Open draft" in the header routes to Dataflows** (`fleet.html:40`) — an arbitrary landing. Draft
  creation belongs to the selection context (deck journey: entry is the current release lock for a scope,
  `index.html:766-771`).
- Keep: warning propagation up the tree ("inherits warning"), bindings-as-detail-not-peers, quick-action
  links from the inspector.

### Config layers

- **G1 — Scope tree exceeds the shipped contract in two places.** The device layer (`device/gw-fill-01`,
  `hierarchy-config.html:52`) is W4.1 — pending decision #5, presented as fact. And
  `component/telemetry-processor:archive` (`:53`) invents an **instance-level leaf** finer than the
  contract's component layer — a new, unrecorded W4-class item. Cleanest resolution: the scope tree ends at
  the component layer; the instance is a *path facet within* the leaf, not a scope node.
- **G2 — "Blocked" language presumes decision #5.** "1 blocked override" (`:15`), "Device identity override
  blocked" (`:145`). The standing recommendation is authoring-side enforcement (Studio validation +
  CODEOWNERS) — so the honest verb is "rejected at save/review," and the screen should name the
  enforcement locus. If the runtime-contract branch is ever chosen, the wording can harden.
- **G3 — Scope-layer edits have fleet-wide blast radius, and the form hides it.** A line-layer fragment
  applies to *every component under the line* (the shipped bundle serves scope layers to all components).
  Yet the edit form pairs a scope with a single "Component instance" selector (`:98-99`), implying
  per-component scope edits that the contract cannot express — and shows no impact count. Required: the
  form states "this edit affects N components across M nodes," with a winners/losers preview (where the
  value lands vs. where a lower layer overrides it). The component selector is legitimate only as a *view*
  filter for the explain panes, never part of the scope-layer write.
- **G4 — No draft context.** The topbar shows hash/scope/override pills but no branch (`:15`), while the
  fleet screen links here *from a named draft* (`fleet.html:232`). The deck's four-things rule requires the
  draft to be visible on every screen.
- Keep: the effective-values table with "Edit here?" states, save-behavior choice (raw write vs approval
  request), effective/raw/binding tabs.

### Render review

- **R1 — Single-node view of a per-node plan.** Per-thing rendering means N deployment documents; the
  screen shows one node ("1 of 2") with no plan-level roll-up, no node navigation, no common-vs-node-specific
  split. Fine at 2 nodes, useless at Dallas's 26. Needed: two levels — plan summary (nodes affected,
  consequence counts, common changes) → per-node drill-down.
- **R2 — It reviews absolutes, not deltas.** No diff against the promoted release anywhere, despite "Diff by
  consequence" being a named deck pattern (`index.html:981-984`). Needed: a baseline selector and grouped
  diffs; unchanged artifacts collapse.
- **R3 — The config stream is invisible.** All four artifact rows are artifact-stream files
  (`render-review.html:57-60`); the effective-config change, per-node config diffs, and the decided
  **restart-impact-by-config-source** plan field (hot-reload vs restart, a first-class decision from the
  config-delivery ruling) are absent. The consequences table's "Restart" row covers only the deployment
  revision (`:73`).

### Releases (gate)

- **L1 — One promote button, one rollback target, for a two-stream model.** "Promote release"
  (`release-gate.html:40`), "Rollback… uses deploy-prod-2026-07-02" (`:66`, `:78`). Decided reality: each
  stream versions and rolls back independently; the lock is a correlation envelope. The gate needs
  stream-scoped cards (config vN→vN+1, artifact vA→vA+1), each with its own applicable gates and rollback
  target, plus one correlated promote that writes the envelope.
- **L2 — The approval lane's identity seam is undefined.** Four hardcoded approver roles (`:55-58`), but
  ch. 12 delegates identity to the Git host. Are approvals PR reviews surfaced here, or a parallel system?
  If the former (recommended — it needs no new identity model), the screen should *say* it and link the PR;
  if the latter, that's a new identity/authz subsystem nobody has priced.
- **L3 — Two buttons, one act?** "Promote release" (header, `:40`) vs "Write release lock" (inspector,
  `:90`). If they differ (request vs. execute?), name the difference; if not, one goes.

### Drift

- **P1 — The four-way taxonomy is five-way after two-stream.** Board rows (`plan-drift.html:46-49`):
  definition / rendered artifact / target apply / runtime. Config-release drift ("catalog v14 promoted,
  v13 delivered") has no row, and with N config-delivery adapters (catalog push, config-only deployment,
  ConfigMap, file, env, shadow) delivery drift is per-stream by construction. Proposal: stage × stream —
  definition → release (per stream) → delivery (per stream, per node) → runtime.
- **P2 — No per-node dimension.** Per-thing deployments fail per node; the board shows site-scalar verdicts.
  At line scope this should be a node × signal matrix; the roll-up states "2 of 26 nodes behind."
- **P3 — "Watch targets"** (`:40`) is meaningless in Git-only mode; gate the affordance by evidence mode
  (U2a).

---

## 3. Missing surfaces

- **M1 — Hierarchy/topology editor (the biggest).** The deck calls the hierarchy editor "the most
  important mock" (`index.html:930-932`) — and it does not exist. The wizard's level builder is day-zero
  only; the Config screen disclaims topology by design (`hierarchy-config.html:38`); Fleet is read-only.
  Nobody can: add line 9, add/replace a node, move a node, rename with stable keys, decommission. Node
  identity lifecycle (thing ↔ node-key binding, device replacement keeping the key) has no home either —
  and per-thing targeting makes node identity the single most load-bearing object in the model.
- **M2 — Day-two entry.** Join-existing-workspace flow (see U1).
- **M3 — Workspace settings.** Storage, target standard + exception policy, evidence mode, apply
  credentials, approver mapping. Today these exist only as wizard step remnants and a "credentials not
  loaded" warning (`plan-drift.html:80`).
- **M4 — Rollout monitor.** With N per-node deployments, an in-flight apply needs a surface: per-node
  pending/succeeded/failed, pause/abort, partial-failure handling. The timeline's "4 apply / 5 observe"
  cards (`plan-drift.html:56-57`) have no screen behind them. Even in generate-only v1, this is "link to
  the CI run + reflect its per-node results."
- **M5 — Release history.** The gate handles one pending release; nothing lists past releases per scope,
  their locks, evidence bundles, or offers rollback *from history* ("uses deploy-prod-2026-07-02" implies a
  history nobody can see).
- **M6 — Exception lifecycle.** Fleet shows "approved exception" bindings (`fleet.html:211-212`); no
  surface requests, approves, or expires one.
- **M7 — Secret provider management.** The component editor picks refs (`component-editor.html:81-90`);
  nothing defines providers.
- **M8 — Draft management (W8).** No draft detail view: dirty objects, base release, rebase state,
  conflicts with sibling drafts.
- **M9 — Day-two component addition.** Adding a component to an existing node lives only inside the wizard
  (U1); the component editor has no add flow, and "Add component instance" on Dataflows (`definition-map.html:40`)
  routes to an editor with no such capability.

---

## 4. Proposed structure — the context spine

One change fixes U2–U4, the four-things rule, and half the per-screen findings simultaneously: **stop
treating node-scoped views as global areas. Make the fleet tree the persistent context spine, and make
Dataflows/Components/Config/Render selection-scoped tabs.** This renegotiates the deck's anatomy prose
("independently reachable areas", `index.html:730-737`) — deliberately.

```
┌ top bar: workspace ▸ draft: deploy/add-file-replicator ▸ evidence: snapshot 02:15 (dallas) ▸ search
├ left rail (persistent)
│   FLEET TREE — the context spine; selection drives the workspace
│   ──────────
│   Releases      history + pending gates (global)
│   Operations    drift roll-up · rollouts · evidence feeds (global)
│   Registry      component catalog (global)
│   Settings      storage · standard · credentials · approvers · evidence mode
└ workspace: tabs over the current selection (tabs appear by level)
    Overview │ Components │ Config │ Topology │ Render │ History
```

- **Tabs by level:** Overview at every level (level-derived aggregates, bindings, drafts, evidence);
  Components/Topology at node (or line, aggregated); Config at any scope (pre-selected); Render at any
  scope (that scope's slice of the plan); History everywhere.
- **Breadcrumb always** (the deck's inline mock had it; restore it).
- **One editing substrate, two lenses, declared:** every editor states what it writes — a config-layer
  fragment (which file, which scope, blast radius N×M) or a definition/artifact-stream object — before the
  user commits. This is the honesty layer that keeps the UI from becoming "another hidden configuration
  system" (the deck's own fear, `index.html:930-932`).
- **Streams surfaced everywhere they exist:** fleet chips, render review, gate cards, drift matrix all
  show the (config, artifact) pair, never a fused scalar.
- **Evidence provenance everywhere it appears:** mode badge global; per-datum source + age; degraded
  states designed, not promised.
- The wizard becomes Create/Connect at the door + three steps + milestone handoffs (U1); Workspace-setup
  in the nav becomes Settings after day zero.

---

## 5. Decisions this review adds (beyond REVIEW.md §6)

1. **Wizard scope** — adopt U1's create/connect + milestones shape? Requires editing the deck's journey
   card (`index.html:774-780`) and screen-contract row (`:870-876`) in the same change. *Recommended: yes.*
2. **Dataflows fate** — confirm decision #4's descriptive-v1 as the *mock's* shape too: rename to Topology,
   read-only derived, selection-scoped. The prescriptive mock as it stands cannot be built on shipped
   substrate. *Recommended: descriptive, selection-scoped.*
3. **Component editor identity** — node-anchored lens (U4) vs. global component list. *Recommended:
   node-anchored; registry defaults as a separate labeled surface.*
4. **Instance-level config leaf (new W4-class item)** — `component/…:archive` as a scope node exceeds the
   shipped contract. *Recommended: instance is a path facet inside the component layer, not a layer.*
5. **Drift taxonomy post two-stream** — adopt the stage × stream model (P1)? Affects deck ch. 11's four-way
   language.
6. **Approval identity seam** — approvals are Git-host PR reviews surfaced in the gate, or a Studio-native
   approval object? *Recommended: PR reviews; zero new identity machinery, matches ch. 12.*
7. **Context-spine IA** — accept §4's restructure, which renegotiates the deck's "independently reachable
   areas" anatomy? All per-screen proposals above assume it.

---

## 6. Corrections applied with this review (mock-world consistency only — no design decisions taken)

- Line filling-7 node counts made consistent with its two gateways: fleet binding "7 things" → "2 things"
  (`fleet.html:210`), Dallas "24 things" → "26 things" (`:115`), render review "1 of 7" → "1 of 2" (two
  places), drift "all 7 per-node deployments" → "both" — all four were introduced by the 2026-07-22
  per-thing propagation pass and contradicted the fleet tree.
- `release-gate.html:49` "AWS IoT thing-group … plan input" — a hyphenated survivor of the per-thing
  sweep — corrected to per-node thing wording.
- Config screen moved into the same Dallas as the fleet screen: `zone/paint` → `area/bottling`,
  `filling-7` → `filling-line-7`, and the effective-config preview now declares the canonical six-level
  hierarchy (`enterprise, site, building, area, line, device`) with a matching five-key `identity` (both
  `hierarchy-config.html` and the shared previews in `mock-app/app.js`).
- Deliberately *not* fixed, because they are the open decisions themselves: the wizard's 4-level hierarchy
  (U1/U2b), the device layer and blocked-override language (G1/G2, decision #5), the Dataflows screen's
  prescriptive form (U3, decision #4).
