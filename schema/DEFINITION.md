# The deployment definition — what each element means and which decision it encodes

**Schema:** `deployment-definition.schema.json` (`edgecommons.io/v1alpha1`, JSON Schema 2020-12), kept
byte-for-byte in sync with the copy the kernel embeds (`edgecommons/edgecommons`,
`cli/crates/ec-deploy/schema/`).
**Golden fixture:** `../fixtures/dallas/` — the Dallas bottling site expressed in this language, synced
from the kernel's fixture; `TRACEABILITY.md` records its provenance against `bottling-company-test/`.

A definition is **one shared plant `topology` deployed to any platform via per-platform `profiles`.** The
topology is the plant, platform-agnostic: the hierarchy of scopes, and per node the components that run
there with their functional config (`layer`). A profile supplies the *delivery* half for one platform —
node scaffolding, the artifact each component is built from, its `configSource`, and launch/orchestration
intent. `effective(<profile>)` merges the two (topology's functional half ⊕ the profile's delivery half)
into the flat document the renderers consume — HOST supervisord bundles, Greengrass per-thing deployments,
Kubernetes manifests. This is the north-star model proven end to end against Dallas; the design rationale
is in `edgecommons/edgecommons` `docs/platform/DESIGN-deployment-profiles.md` (decisions D-CLI-24/-25).

## Where each element is defined

The schema's own `description` fields are the element-by-element explainer — read
`deployment-definition.schema.json` alongside this document. In outline:

- **`hierarchy`** — the customer's ordered `levels` (any depth, **must end with `device`**, S-1) and the
  `scopes` tree above the device level, each scope carrying an optional `layer` fragment. The device is
  never a catalog node; it resolves from the running platform's thing name.
- **`topology.nodes[]`** — each node attaches to exactly one `scope` (S-8); everything lineage-related
  *derives* from that single placement (catalog levels, identity values, the layer chain), never
  enumerated per component (S-7). A node's `components[]` name what runs there and each component's
  functional `layer` (its config leaf). Node keys are stable and human-assigned; they outlive hardware
  (REVIEW #14), and a platform identity binds to the key via a profile's bindings (default
  `thingName == key`).
- **`profiles.<name>`** — delivery for one platform `family` (HOST / GREENGRASS / KUBERNETES): its
  `environments[]` (each with a `bindings` file answering `${binding:…}` tokens, S-5), `defaults`, and
  per-node `components` overlays supplying the `artifact` (version + digest, or `source`/`image` for the
  development shape, S-6), the `configSource` (which selects the delivery adapter and the plan's restart
  impact — hot-reload is a property of the source, not the platform), and `launch` orchestration intent.

### The two streams

`artifact` (version/digest/source/image) is the artifact stream; `layer` (+ the derived lineage) is the
config stream. They are versioned, released, drifted, and rolled back **independently** (REVIEW #2); a
release lock correlates them without fusing them (see the Studio's Evidence screen).

### What is deliberately absent

- **Dataflow / capability vocabulary** — extracted to `../design/FUTURE-dataflows.md` (REVIEW #4).
- **Secret values** — references only, per the deck's negative-space rule.
- **Release / lock state** — releases are separate artifacts that *reference* a definition commit; the
  definition never records its own promotion.

## Semantic rules (kernel validator, beyond JSON Schema)

These are enforced by the kernel (`edgecommons deployment validate`) over each profile's effective
document, not by this repo's structural checker — duplicating them in a second validator is the drift the
design warns against. They are recorded here as the design register of what "valid" means.

| # | Rule |
|---|---|
| S-1 | `hierarchy.levels` ends with `device`; entries unique (schema asserts uniqueness only). |
| S-2 | Every scope id is `<level>/<value>` with `<level>` ∈ `levels[..-1]` (never `device`). |
| S-3 | Scope parents exist, are acyclic, and step down the level order; roots sit at the first level. |
| S-4 | Layer files must not contain top-level `hierarchy` or `identity` — both are derived from placement. |
| S-5 | Every `${binding:…}` token in every referenced layer resolves against the environment's bindings; a missing binding fails the render, and the requirement is published in `requirements.json`. |
| S-6 | A component's artifact carries `version` (+ `digest` for promotion), or a development `source`/`image`. |
| S-7 | Nothing in a component entry enumerates lineage; only `layer` (the leaf) is component-owned. |
| S-8 | Every node's `scope` references an existing scope id; node keys are unique. |
| S-9 | A node's config provider is never itself `CONFIG_COMPONENT` (no recursive bootstrap). |
