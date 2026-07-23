# Deployment Studio

The EdgeCommons deployment control plane: a typed deployment definition compiled deterministically
into platform-native artifacts (HOST/supervisord bundles, Greengrass recipes and per-thing
deployments, Kubernetes manifests), with Git as the audit substrate, generate-only before apply, and
evidence-gated releases. The CLI is the product; the server is a shell around it.

Local repo, no remote. Working conventions: design fidelity and doc-sync rules from the org
`AGENTS.md` apply — decisions propagate to deck, reviews, and mock together, in the same commit.

## Layout

| Path | What it is |
|---|---|
| `PLAN.md` | **The four-step build plan.** Canonical; statuses updated in the same change as the work. Start here. |
| `design/index.html` | The design deck (13-chapter HTML book + interactive panels). Open in a browser; serve the folder for the mock links. |
| `design/mock-app/` | The static mock of the product surface (eight screens). |
| `design/REVIEW.md` | Code-grounded review of the deck; §6 is the living decision register. |
| `design/REVIEW-UI.md` | Adversarial feature/function review of the mock UI; §5 holds the seven open UI decisions. |
| `schema/` | The deployment-definition schema (canonical design copy), its explainer, and the Python authoring-side validator. The engine embeds a synced copy; CI checks they match. |
| `fixtures/dallas/` | The Dallas golden fixture: `bottling-company-test/` expressed in the definition language, with a traceability proof. It is the source of the byte-for-byte golden test that now lives in the engine repo. |

## The engine lives in `edgecommons/edgecommons`

The deployment kernel and HOST renderer converged into the `edgecommons` CLI (core, `cli/crates/ec-deploy`). Run it there:

```
edgecommons deployment validate <definition.yaml>
edgecommons deployment render   <definition.yaml> --env <name> --target HOST
edgecommons deployment plan      <definition.yaml> --env <name> --target HOST
edgecommons deployment release   <definition.yaml> --stream config|artifact
```

The Dallas byte-for-byte proof is core's `ec-deploy` golden test (`cli/crates/ec-deploy/tests/dallas_golden.rs`). This repo remains the **design home**: the deck, the reviews, the decision registers, the definition schema, and the golden fixture.

## Provenance

Moved from `roadmap/deployment-abstraction-design/` on 2026-07-22; pre-move history lives in the
roadmap repo (branch `work/deployment-studio-fidelity`).
