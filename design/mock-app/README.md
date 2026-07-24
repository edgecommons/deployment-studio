# Deployment Studio — high-fidelity mock

A clickable design artifact for the Studio UI. Open `index.html` (it works straight from disk — the
fixtures are plain JS, not JSON, so no server is needed), or serve the directory if you prefer.

This mock exists because the shipped read-only UI was built to a **different information architecture**
than the one that was agreed. It is the reference the UI is rebuilt against.

## What it realises

Decision **1A** (REVIEW-UI §4) — the context spine:

- a **persistent left rail** whose fleet tree is the selection spine: selecting a scope or node drives
  the entire workspace;
- **Releases / Operations / Registry / Settings** as the only global areas, below the spine;
- a **breadcrumb that is always visible**;
- **tabs that appear by level** over the current selection — Overview / Config / Render / History
  everywhere, Components / Topology only where the selection is (or directly contains) nodes;
- **both streams, everywhere** — config and artifact are always a pair, never fused into one status
  (REVIEW #2);
- **evidence provenance always on screen** — a global chip carrying mode, age and source, with the
  degraded state designed rather than promised (REVIEW #13);
- **approvals in their agreed home** — rendered from `CODEOWNERS` on the Releases *gate*, not as a
  top-level area, and never as a parallel approval store (REVIEW #10);
- the **declared-write honesty layer** — every editing surface states which file it writes, at which
  scope, and its blast radius, before anything is committed.

## Design rationale is not in the product surface

The screens state **what the system does**, in the product's voice. They do not argue for the design,
cite the decision register, or mark what is coming later — that belongs in `REVIEW-UI.md`, not in a
surface an operator reads.

Reviewer rationale lives behind the **Design notes** toggle in the context bar, **off by default**.
Switch it on to see which agreed decision each region realises, rendered in a deliberately
non-product style (dashed copper, "design note" label) so it can never be mistaken for UI copy.

This matters for the mock's usefulness, not just tidiness: text density is one of the main things a
high-fidelity mock exists to let you judge. Rationale paragraphs above every table would overstate the
real copy budget and obscure the layout, density and visual hierarchy under review.

The one place register language survives with notes off is the evidence bundle's `semanticRules` value
(`pass (S-1..S-9)`) — that is the literal field the kernel's `evidence.json` records, shown as recorded.

## No level name is hardcoded

The mock ships **two hierarchies** and a workspace switcher in the context bar:

| Workspace | Levels |
|---|---|
| `dallas-bottling` | `enterprise / site / line / device` |
| `northwind-press` | `region / plant / cell / device` |

Both render through the same code. Level badges, breadcrumbs, tree depth, merge-order chains and
aggregates are all derived from each fixture's own `hierarchy.levels` and from scope ids of the form
`<level>/<value>`. This closes review finding **U2b** (the previous mock hardcoded "site"/"line"/"LINES"),
and matches the kernel, where the only special level is the terminal `device`.

`northwind-press` also carries the **degraded** states on purpose — no `CODEOWNERS`, no evidence source,
an unresolved-digest warning — so those paths are designed, not left to chance.

## Fidelity

`styles/product.css` is generated from the shipped Studio UI bundle. It is the same Carbon build and the
same EdgeCommons brand-token mapping the product uses, so the mock **cannot visually drift** from the
product. `styles/mock.css` adds layout only; every colour, font, radius and space value is a brand token.

## What this pass deliberately does not cover

Agreed scope was the shell plus the screens the kernel can already serve. Rendered as explicit
"not designed yet" states rather than invented content:

- **Components** — the node-anchored component editor (decision 3A), which belongs with the write path;
- **Topology** — the derived read-only graph (REVIEW #4);
- **History** — needs a git-log port the kernel does not expose;
- **Operations / Registry / Settings** — the remaining global areas;
- the **Create/Connect wizard** (decision 2A).

Interactions are hand-written for review, not production: no routing, no persistence, and the search box
is presentational. This is a design artifact — the product UI lives in
`edgecommons/edgecommons` at `cli/crates/ec-studio/ui`.
