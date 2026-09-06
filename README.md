# Deployment Studio

The EdgeCommons deployment control plane: a typed deployment definition compiled deterministically
into platform-native artifacts (HOST/supervisord bundles, Greengrass per-thing
deployments, Kubernetes manifests), with Git as the audit substrate, generate-only before apply, and
evidence-gated releases. The CLI is the product; the server is a shell around it.

This public repository is `edgecommons/deployment-studio`. It owns the design records, schema
mirror and Dallas fixture; the executable product lives in `edgecommons/edgecommons`. The org
`AGENTS.md` design-fidelity and doc-sync rules apply. Component release engineering owns
Greengrass recipes; deployment rendering selects versions and supplies per-thing configuration.

## Current implementation

Reviewed 2026-09-06 against core `77518bc`. The core CLI implements deployment validation, locking,
HOST/Greengrass/Kubernetes rendering, planning and two-stream releases. Studio has the agreed fleet
selection rail, scoped Overview/Config/Render views, Releases gate, config-layer editing, named
drafts, presence and conflict checks. Main derives a Git-host PR-create URL for a draft.

Branch publication and PR creation are implemented on the open core
[PR #77](https://github.com/edgecommons/edgecommons/pull/77), not on main. `deployment diff` is
implemented on core's unmerged `feat/deployment-diff` branch; no PR was found in the September 6
audit. Components, Topology, History, Operations, Registry, Settings and the Create/Connect wizard
remain incomplete. The agreed global evidence-provenance indicator and live delivery comparison
also remain outstanding. [PLAN.md](PLAN.md) separates this baseline from the dated implementation
and validation history.

## Layout

| Path | What it is |
|---|---|
| `PLAN.md` | **The four-step build plan.** Canonical; statuses updated in the same change as the work. Start here. |
| `design/index.html` | The design deck (13-chapter HTML book + interactive panels). Open in a browser; serve the folder for the mock links. |
| `design/mock-app/` | The current static mock of the agreed context-spine UI, including designed degraded states. |
| `design/REVIEW.md` | Code-grounded review of the deck; §6 is the living decision register. |
| `design/REVIEW-UI.md` | Historical feature/function review; §5 records the seven settled UI decisions. |
| `schema/` | The deployment-definition schema (canonical design copy), its explainer, and the Python authoring-side validator. The engine embeds a synced copy; CI checks they match. |
| `fixtures/dallas/` | The Dallas golden fixture: `bottling-company-test/` expressed in the definition language, with a traceability proof. It is the source of the byte-for-byte golden test that now lives in the engine repo. |

## The engine lives in `edgecommons/edgecommons`

The deployment kernel and all three renderers live in the `edgecommons` CLI (core,
`cli/crates/ec-deploy`); the Studio server and UI live in `cli/crates/ec-studio`:

```
edgecommons deployment validate <definition.yaml>
edgecommons deployment lock     <definition.yaml>
edgecommons deployment render   <definition.yaml> --env <name> --target HOST
edgecommons deployment plan      <definition.yaml> --env <name> --target HOST
edgecommons deployment release   --help
```

The Dallas byte-for-byte proof is core's `ec-deploy` golden test (`cli/crates/ec-deploy/tests/dallas_golden.rs`). This repo remains the **design home**: the deck, the reviews, the decision registers, the definition schema, and the golden fixture.

See the [CLI documentation](https://github.com/edgecommons/edgecommons/blob/main/cli/docs/README.md)
for current commands. Historical test results in this repository retain their original dates;
this documentation review did not rerun device or deployment validation.

## Provenance

Moved from `roadmap/deployment-abstraction-design/` on 2026-07-22; pre-move history lives in the
roadmap repo (branch `work/deployment-studio-fidelity`).
