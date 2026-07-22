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
| `schema/` | The deployment-definition schema, its explainer, and the Python authoring-side validator (Step 1). |
| `fixtures/dallas/` | The Dallas golden fixture: `bottling-company-test/` expressed in the definition language, with a traceability proof and the oracle map (Steps 1 and 3). |
| `kernel/` | The Rust kernel + HOST renderer (`ec-deploy`): validate, render, and prove against the Dallas oracle (`cargo test` inside `kernel/`). Step 3. |

## Provenance

Moved from `roadmap/deployment-abstraction-design/` on 2026-07-22; pre-move history lives in the
roadmap repo (branch `work/deployment-studio-fidelity`).
