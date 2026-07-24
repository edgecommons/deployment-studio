window.MOCK_DATA = window.MOCK_DATA || {};
window.MOCK_DATA.northwind =
{
  "workspace": "northwind-press",
  "repo": "northwind-ops/press-fleet",
  "description": "A deliberately different hierarchy — proves no level name is special.",
  "hierarchy": { "levels": ["region", "plant", "cell", "device"] },
  "draft": null,
  "evidence": { "mode": "none", "age": null, "source": null, "degraded": true },
  "scopes": [
    { "id": "region/emea", "parent": null, "layer": "layers/scopes/region-emea.json", "keys": 5 },
    { "id": "plant/rotterdam", "parent": "region/emea", "layer": "layers/scopes/plant-rotterdam.json", "keys": 4 },
    { "id": "plant/hamburg", "parent": "region/emea", "layer": "layers/scopes/plant-hamburg.json", "keys": 4 },
    { "id": "cell/press-a", "parent": "plant/rotterdam", "layer": "layers/scopes/cell-press-a.json", "keys": 2 },
    { "id": "cell/press-b", "parent": "plant/rotterdam", "layer": null, "keys": 0 },
    { "id": "cell/coil-1", "parent": "plant/hamburg", "layer": "layers/scopes/cell-coil-1.json", "keys": 3 }
  ],
  "nodes": [
    {
      "key": "ctrl-rot-01", "scope": "plant/rotterdam",
      "components": [
        { "name": "edge-console", "layer": "layers/components/plant/edge-console.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/edge-console:0.2.0" }, "hotReloads": true }
      ]
    },
    {
      "key": "press-a-01", "scope": "cell/press-a",
      "components": [
        { "name": "opcua-adapter", "layer": "layers/components/press-a/opcua-adapter.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/opcua-adapter:0.2.0" }, "hotReloads": true },
        { "name": "telemetry-processor", "layer": "layers/components/press-a/telemetry-processor.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/telemetry-processor:0.2.0" }, "hotReloads": true },
        { "name": "uns-bridge", "layer": "layers/components/press-a/uns-bridge.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/uns-bridge:0.2.0" }, "hotReloads": true }
      ]
    },
    {
      "key": "press-b-01", "scope": "cell/press-b",
      "components": [
        { "name": "opcua-adapter", "layer": "layers/components/press-b/opcua-adapter.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/opcua-adapter:0.2.0" }, "hotReloads": true },
        { "name": "uns-bridge", "layer": "layers/components/press-b/uns-bridge.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/uns-bridge:0.2.0" }, "hotReloads": true }
      ]
    },
    {
      "key": "coil-1-01", "scope": "cell/coil-1",
      "components": [
        { "name": "modbus-adapter", "layer": "layers/components/coil-1/modbus-adapter.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/modbus-adapter:0.2.0" }, "hotReloads": true },
        { "name": "telemetry-processor", "layer": "layers/components/coil-1/telemetry-processor.json", "configSource": "CONFIGMAP", "artifact": { "version": "0.2.0", "source": "ghcr.io/edgecommons/telemetry-processor:0.2.0" }, "hotReloads": true }
      ]
    }
  ],
  "profiles": [
    { "name": "cluster", "family": "KUBERNETES", "environment": "prod", "bindings": "bindings/prod.json", "files": 22 }
  ],
  "codeowners": null,
  "releases": [
    {
      "stream": "config", "tag": "config-9f21ba04c7de", "commit": "9f21ba04c7de",
      "state": "awaiting-review", "devMode": false,
      "reviewers": [], "approved": [],
      "files": 22, "hash": "sha256:1d4f77aa0e2b93c5518e0a7f2b6c4419ab77c0e1d3f2a95b8c6e04d71fa3b820"
    },
    {
      "stream": "artifact", "tag": "artifact-9f21ba04c7de", "commit": "9f21ba04c7de",
      "state": "ready", "devMode": false,
      "reviewers": [], "approved": [],
      "files": 22, "hash": "sha256:1d4f77aa0e2b93c5518e0a7f2b6c4419ab77c0e1d3f2a95b8c6e04d71fa3b820"
    }
  ],
  "evidenceBundle": {
    "schemaValidation": "pass",
    "semanticRules": "pass (S-1..S-9)",
    "renderDeterminism": "re-run at the same definition commit yields byte-identical output",
    "warnings": ["no release index published for 7 components; digests recorded as unresolved (EC4006)"]
  }
}
;
