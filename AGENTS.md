# Deployment Studio — agent guidance

This repo is the working home of the EdgeCommons Deployment Studio: design deck, mock app, reviews,
the deployment-definition schema, and the Dallas golden fixture. It is a local Git repo with no
remote. The org-wide rules in `../AGENTS.md` apply in full — especially design fidelity (agreed
designs are binding; deviations are surfaced, never slipped in) and doc-sync (stale status is a
defect; update docs in the same change as the work).

Ground rules specific to this repo:

- **`PLAN.md` is the canonical four-step plan.** Read it before starting work here; update its
  status checkboxes in the same commit as the work they describe.
- **`design/REVIEW.md` §6 is the decision register** for the deck. A decision recorded there or on
  the deck's decision surface must be propagated everywhere it binds (deck chapters, mock screens,
  reviews) in one change — the 2026-07-22 sessions exist because that discipline slipped.
- The deck (`design/index.html` + `app.js`) renders standalone in a browser; the mock links need the
  folder served (any static server). Verify deck edits render clean (no console errors) before
  committing. `design/app.js` still carries a dead `mockScreens` block (~620 lines, documented in
  REVIEW.md "Known dead code") — the live mock is `design/mock-app/`; keep both consistent or note
  why not.
- The definition schema (`schema/`) and the Dallas fixture (`fixtures/dallas/`) are a pair: schema
  changes re-verify the fixture, and fixture-blocking gaps are recorded in
  `fixtures/dallas/TRACEABILITY.md`, not papered over.
- Validation substrate for this repo's claims: `../bottling-company-test/` (the Dallas harness),
  `../core/docs/HIERARCHICAL_CONFIG.md` and `../core/schema/edgecommons-config-schema.json` (the
  shipped config contract), `../config-component/` and `../core/libs/rust/src/config/layered.rs`
  (the shipped lineage implementation). Verify against source, not against other docs.
