# The deployment definition — what each element means and which decision it encodes

**Schema:** `deployment-definition.schema.json` (`edgecommons.io/v1alpha1`, JSON Schema 2020-12).
**Golden fixture:** `../fixtures/dallas/` — the Dallas bottling site expressed in this language, with a
hand-verified traceability proof against `bottling-company-test/`.

This document is the explainer and the home of the **semantic rules (S-1…S-9)** that JSON Schema cannot
express; the kernel validator enforces both. It replaces the deck's old illustrative fragment, whose four
modeling flaws this schema exists to fix: nodes floated free of the hierarchy, config lineage was
enumerated per component (a second source of truth against the catalog), per-node `targets` arrays
contradicted standard-plus-exceptions, and dataflow capability vocabulary leaked in.

## The shape, element by element

### `hierarchy` — the level vocabulary and the scope tree

`levels` is the customer's ordered vocabulary (any depth) and **must end with `device`** (S-1), matching
the shipped hierarchical-config contract: the device is never a catalog node; it resolves from the running
platform's thing name. `scopes` is the instance tree above the device level — the *authoring form of
ConfigComponent catalog nodes* — each with an optional `layer` file holding that scope's authored config
fragment.

Two things are **forbidden in layer files** because they are derived (S-4): `hierarchy` (the per-node
truncated level list) and `identity` (the scope values restated as config). The Dallas extraction proved
this the hard way — those two keys were the *only* difference between the "duplicated" enterprise/site
nodes across the three hand-maintained catalogs. The compiler stamps both per node from placement.

### `nodes[].scope` — placement is the source of lineage

A node attaches to exactly one scope (S-8). Everything lineage-related **derives** from that single fact:

- the node's catalog `hierarchy.levels` = the levels of its scope chain + `device` — which is why the
  Dallas site node legitimately has `[enterprise, site, device]` while the line gateways have
  `[enterprise, site, line, device]`;
- the node's `identity` values = the chain's scope values;
- the node's config lineage = the chain's layer files, in order, then each component's leaf.

Config lineage is therefore **never enumerated per component** (S-7). One placement, one derivation, one
source of truth — the definition compiles into per-node catalogs; nobody hand-maintains three copies of
the enterprise layer again.

### `nodes[].key` and `identity.thingName` — the load-bearing object

The node key is stable and human-assigned; it outlives hardware (deck ch. 3, REVIEW #14). The platform
identity binds to it via the environment's `bindings.json`, and the default convention is
`thingName == key` because the runtime's device-level identity — and every UNS topic — resolves from the
thing name. Replacement = same key, new provisioning material. Rename = definition edit with a surfaced
runtime-identity consequence.

### `targetStandard` — one family, governed exceptions

One enterprise standard; exceptions are explicit, scoped, and reasoned. There are no per-node target
arrays. On GREENGRASS, targets are **thing ARNs, never thing groups** (REVIEW #3): N nodes → N deployment
documents, per-node partial failure.

### Two streams inside `components[]`

`artifact` (version/digest/source) is the artifact stream; `layer` (+ the derived lineage) is the config
stream. They are versioned, released, drifted, and rolled back independently (REVIEW #2); a release lock
correlates them without fusing them. `artifact.source` (S-6: version or source required) is the
development shape — the Dallas fixture builds every component from sibling source, exactly as the harness
does; promotion requires version + digest.

### `configSource` — delivery adapter and restart impact

Each component's declared source selects how its effective config reaches it (catalog push, rendered
FILE, GG_CONFIG deployment, ConfigMap, env, shadow) **and** classifies restart impact in the plan —
hot-reload is a property of the source, not the platform (config-delivery decision). A component using
`FILE` receives a **rendered effective config**: the compiler merges the scope chain + leaf and writes the
single document — decision #6's render-into-existing-sources path, and precisely what the harness's
hand-written `config-component-config.json` files turn out to be.

### `nodes[].configProvider` — the bootstrap that cannot recurse

When a node's components use `CONFIG_COMPONENT`, the node carries its ConfigComponent instance. Its own
bootstrap config is a rendered effective config delivered by a non-recursive source (S-9, the deck's
"important boundary" callout), and its `catalog.path` is where the compiled per-node catalog is staged.

### `environments[].bindings` — the answered half of the IaC handshake

`bindings.json` is one of the three handshake files (REVIEW #12). Layer files reference its values with
`${binding:<dotted.path>}` tokens; rendering fails while a referenced binding is missing (S-5). The Dallas
packaging line's `__KEPWARE_ENDPOINT__` / `__MODBUS_HOST__` / `__MODBUS_PORT__` template placeholders are
the hand-rolled ancestor of exactly this mechanism.

### `localBroker`, `auxiliaries`, `launch` — the HOST bundle's honest remainder

The node-local broker is first-class in the HOST story ("starts a local broker and a set of component
processes" — deck ch. 7). Auxiliaries are *declared* controlled processes (the deck's negative-space rule:
no smuggled scripts) — the Dallas filling line's field simulator is one. `launch` captures per-process
orchestration intent (order, TCP gates, settle time, working dir, env) that the supervisord renderer emits
verbatim; deriving order from dependencies instead is a future refinement, not v1.

### What is deliberately absent

- **Dataflow/capability vocabulary** — extracted to `../design/FUTURE-dataflows.md` (REVIEW #4). The old
  fragment's `runtime: {messaging: "local-mqtt"}` strings do not exist here.
- **Per-component lineage lists, per-node target arrays** — replaced by derivation and
  standard-plus-exceptions, as above.
- **Secret values** — references only, per the deck's negative-space rule.
- **Release/lock state** — releases are separate artifacts that *reference* a definition commit; the
  definition never records its own promotion.

## Semantic rules (kernel validator, beyond JSON Schema)

| # | Rule |
|---|---|
| S-1 | `hierarchy.levels` ends with `device`; entries unique (schema asserts uniqueness only). |
| S-2 | Every scope id is `<level>/<value>` with `<level>` ∈ `levels[..-1]` (never `device`). |
| S-3 | Scope parents exist, are acyclic, and step down the level order; roots sit at the first level. |
| S-4 | Layer files must not contain top-level `hierarchy` or `identity` — both are derived from placement. |
| S-5 | Every `${binding:…}` token in every referenced layer resolves against the environment's bindings; a missing binding fails the render, and the requirement is published in `requirements.json`. |
| S-6 | `artifact` carries `version` and/or `source`; promotion to a release requires `version` + `digest`. |
| S-7 | Nothing in a component entry enumerates lineage; only `layer` (the leaf) is component-owned. |
| S-8 | Every `nodes[].scope` references an existing scope id; node keys are unique. |
| S-9 | `configProvider.configSource` ≠ `CONFIG_COMPONENT` (no recursive bootstrap). |
