# Dallas golden fixture — traceability and findings

**Date:** 2026-07-22. **Source of truth:** `bottling-company-test/sites/dallas-site/` (read in full by
a dedicated inventory pass; every claim below cites harness files). **Question answered:** could a
compiler regenerate the harness's hand-maintained files from `definition.yaml`? — **Yes**, with the
gaps recorded below, all additive rather than structural.

**Validation:** `python schema/validate.py fixtures/dallas/definition.yaml` → JSON Schema conformance,
semantic rules S-1..S-9, and all `${binding:…}` tokens resolved against `bindings/local.json`.

## Extraction

`layers/` was produced mechanically from the three harness catalogs (no hand transcription):
`configs/filling-line/config-catalog.json`, `configs/packaging-line/config-catalog.tmpl.json`,
`configs/site/config-catalog.json` → 4 single-sourced scope layers + 10 component leaves. The
packaging template's `__KEPWARE_ENDPOINT__` / `__MODBUS_HOST__` / `__MODBUS_PORT__` placeholders were
converted to `${binding:…}` tokens. The extractor asserts that scope nodes appearing in multiple
catalogs are semantically identical **after stripping `hierarchy` and `identity`** — see finding F-1.

## What the definition regenerates (the slice-1 oracle set)

| Definition element | Regenerates (harness path, all under `sites/dallas-site/`) |
|---|---|
| `hierarchy.scopes` chain per node + component `layer` leaves | The three per-node catalogs: `configs/filling-line/config-catalog.json`, `configs/packaging-line/config-catalog.tmpl.json`→rendered, `configs/site/config-catalog.json` — nodes from the scope chain (with derived `hierarchy.levels` + `identity` stamped per node), components from the leaves. |
| `nodes[].configProvider` + scope-chain merge | The three rendered-effective bootstrap configs: `configs/*/config-component-config.json` (hierarchy+identity derived; tags/logging/heartbeat/metricEmission merged from scope layers; `component.global.configComponent.catalogSource` from `configProvider.catalog`). |
| `components[].messaging` + `localBroker.port` | The 13 `configs/*/*-messaging.json` files (`messaging.local{host: localhost, port, clientId}`, plus `type:"mqtt"` for adapters and `requestTimeoutSeconds` where declared). |
| `localBroker` + `auxiliaries` + `configProvider` + `components[].launch` | The three supervisord confs `supervisor/{site,filling-line,packaging-line}.conf`: program blocks, `priority` = `launch.order`, `wait-for-tcp` gates = `launch.waitFor`, `sleep N; exec` = `settleSeconds`, `directory` = `workingDir`, per-program `environment`, stdout/stderr redirection. |
| `components[].launch` + `configSource` + `identity.thingName` | Every component launch line: `--platform HOST --transport MQTT <messaging.json> -c {FILE\|CONFIG_COMPONENT} -t <thingName>`. |
| `environments[].bindings` + tokens in packaging leaves | The `render-packaging-catalog` substitution step (`dockerfiles/bin/render-packaging-catalog`) and its compose env plumbing (`KEPWARE_ENDPOINT`, `HOST_MODBUS`) — replaced wholesale by S-5 binding resolution at render time. |
| `components[].files` | The Lua mounts: `configs/lua/**` staged to `/scripts` (`scriptsDir` in the telemetry leaves), checksummed under the HOST bundle contract. |
| `components[].artifact.source` | The sibling-source build reality: Rust crates path-patched to `../core/libs/rust` with the exact cargo feature sets (`dockerfiles/edge-node.Dockerfile:52-59`), Java via sibling `core/libs/java` + `mvn package`, Python run from copied source. Development shape; promotion requires `version`+`digest` (S-6). |

## What stays outside the definition (provisioning boundary)

`docker-compose.yml` (container/hostname wiring, port publishing, volumes, `depends_on`, healthcheck,
`extra_hosts`) and the Dockerfiles are the harness's *hardware*: they provision the devices the
definition deploys onto. In the model these feed the IaC handshake instead: the definition's
`requirements.json` would declare the mounts (`/mnt/replicated`, `/scripts`, `/out/*`), listening ports,
and reachability assumptions; compose is one way a lab satisfies them. The site container's
`hostname: dallas-site` is likewise provisioning-side — see F-4.

## Findings

- **F-1 — Derived keys were masquerading as authored config (model win, proven).** The harness's
  "duplicated" enterprise/site catalog nodes differ *only* in embedded `hierarchy.levels` and
  `identity` — per-node derived content hand-copied into authored layers, and the exact class of
  drift-by-duplication the definition eliminates. Hence S-4: those keys are forbidden in layers and
  stamped from placement.
- **F-2 — Placement-derived truncation reproduces the site catalog (model win).** `dallas-console`
  attaches at `site/dallas`, so its derived levels are `[enterprise, site, device]` — exactly what the
  hand-written site catalog declares (`configs/site/config-catalog.json:8-14`). No special case needed.
- **F-3 — The packaging template is a hand-rolled bindings.json (model win).** Its three placeholders
  plus `render-packaging-catalog` plus compose env vars collapse into S-5 token resolution.
- **F-4 — Cross-node service reference (schema gap, additive).** The uns-bridge leaves carry the site
  broker as a literal `"host": "dallas-site"` (catalog `UnsBridge` instances). The definition can only
  express this as a literal or a binding today; a first-class node-service reference
  (`${node:dallas-console.broker}`) that the renderer resolves per environment is the candidate
  v1alpha2 addition. Until then: bindings.
- **F-5 — Supervision detail is explicit intent, not derived (accepted for v1).** `launch.order`/
  `waitFor`/`settleSeconds` transcribe the harness's hand-tuned orchestration verbatim. Deriving order
  from the dependency graph is a future refinement; the oracle requires the explicit form anyway.
- **F-6 — clientId convention.** The harness uses `fill-*`/`pack-*`/`site-*` prefixes, not the
  schema's default `<node-key>-<component>`; the fixture carries explicit overrides. A `clientIdPrefix`
  per node would remove ~13 overrides — cosmetic, not blocking.
- **F-7 — Config-stream version strings.** Catalog `version` fields
  (`bottles-r-us-dallas-filling-line-initial`) are release identifiers: stamped by the renderer from
  the config-stream release, authored nowhere in the definition. Matches the two-stream model.
- **F-8 — Vestigial harness files.** `dockerfiles/bin/render-{opcua,modbus}-config` are baked into
  images but invoked nowhere; a compiler would not regenerate them. Flagged for harness cleanup.
- **F-9 — file-replicator egress.** The `/mnt/replicated` bind is a provisioning mount the definition's
  requirements would declare; the component's ingress/egress paths live in its leaf, already extracted.
- **F-10 — Bootstrap drift (found by the oracle run).** The three hand-written
  `config-component-config.json` files carry the enterprise layer's `tags.appId` but silently drop its
  `tags.scenario`, while every catalog-served component receives both. The rendered bootstrap (scope-chain
  merge + provider overlay) restores `scenario` — the render is *more* consistent than the hand files.
  This is precisely the class of hand-maintenance drift the compiler exists to eliminate.
- **F-11 — The site catalog's hand-named version.** Line catalog versions follow
  `<scope values joined>-<release>`; the site catalog's `bottles-r-us-dallas-site-initial` does not
  (a naming inconsistency, not a pattern). Covered by `configProvider.versionBase` as an explicit
  authored override; the derived pattern remains the default.
- **F-12 — Shorthand names are authored metadata.** The harness's messaging file names
  (`bridge-`, `filerep-`, `console-`, `opcua-`, `modbus-`, `telemetry-messaging.json`) and catalog
  display keys (`OpcUaAdapter`, …) are hand-chosen and not mechanically derivable; the schema carries
  them as `messaging.file` and `catalogKey` overrides with derivable defaults.

## Oracle results (2026-07-22, kernel slice 1)

`cargo test -p edgecommons-deploy` / `ec-deploy oracle` render the fixture and compare all **22**
oracle files (13 messaging + 3 bootstraps + 3 catalogs + 3 supervisord confs):

- **13/13 messaging files byte-identical** (CRLF-normalized).
- **3/3 catalogs semantic-equal** — packaging compared against its template after binding
  substitution; residual byte deltas are hand-formatting only (inline arrays, spacing).
- **3/3 bootstraps differ by exactly one path each** — `tags.scenario` present in the render (F-10).
- **site + filling confs semantic-equal; packaging conf differs in exactly one value** — the
  config-component command, where render-time binding substitution replaces the runtime
  `render-packaging-catalog` step (F-3). Comments and section ordering in hand confs are not compared.

Net: **18/22 fully semantic-equal, and all four remaining deltas are the two documented, deliberate
improvements.** Full byte-for-byte parity is reached by *adoption* — replacing the harness's hand
files with the generated canonical output (which also fixes F-10) and letting the harness E2E prove
behavioral equivalence. That is a bottling-company-test change, taken separately.

## Verdict

The definition language expresses the Dallas site cleanly: every hand-maintained config artifact in the
harness is derivable from `definition.yaml` + `layers/` + `bindings/local.json`, the two headline
mechanisms (placement-derived lineage, binding tokens) replace the two most error-prone hand-maintained
patterns (triplicated scope nodes, template substitution), and the only genuine gap found (F-4) is an
additive schema feature, not a structural correction. Step 1's acceptance criterion is met; slice 1's
oracle set is the **22 files** above (13 messaging + 3 bootstraps + 3 catalogs + 3 supervisor confs),
and the kernel's oracle run against it is recorded in "Oracle results".
