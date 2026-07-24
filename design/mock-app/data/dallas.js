window.MOCK_DATA = window.MOCK_DATA || {};
window.MOCK_DATA.dallas =
{
  "workspace": "dallas-bottling",
  "repo": "bottling-company-test/sites/dallas-site",
  "description": "Bottles-R-Us Dallas plant — the north-star site.",
  "hierarchy": { "levels": ["enterprise", "site", "line", "device"] },
  "draft": { "branch": "deploy/add-file-replicator", "author": "@m.breissinger", "changed": 3 },
  "evidence": { "mode": "snapshot", "age": "02:15", "source": "dallas", "degraded": false },
  "scopes": [
    { "id": "enterprise/bottles-r-us", "parent": null, "layer": "layers/scopes/enterprise-bottles-r-us.json", "keys": 6 },
    { "id": "site/dallas", "parent": "enterprise/bottles-r-us", "layer": "layers/scopes/site-dallas.json", "keys": 4 },
    { "id": "line/filling-line", "parent": "site/dallas", "layer": "layers/scopes/line-filling-line.json", "keys": 3 },
    { "id": "line/packaging-line", "parent": "site/dallas", "layer": "layers/scopes/line-packaging-line.json", "keys": 3 }
  ],
  "nodes": [
    {
      "key": "dallas-console", "scope": "site/dallas",
      "components": [
        { "name": "edge-console", "layer": "layers/components/site/edge-console.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:edge-console" }, "hotReloads": true }
      ]
    },
    {
      "key": "gw-fill-01", "scope": "line/filling-line",
      "components": [
        { "name": "opcua-adapter", "layer": "layers/components/filling-line/opcua-adapter.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:opcua-adapter" }, "hotReloads": true },
        { "name": "modbus-adapter", "layer": "layers/components/filling-line/modbus-adapter.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:modbus-adapter" }, "hotReloads": true },
        { "name": "telemetry-processor", "layer": "layers/components/filling-line/telemetry-processor.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:telemetry-processor" }, "hotReloads": true },
        { "name": "file-replicator", "layer": "layers/components/filling-line/file-replicator.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:file-replicator" }, "hotReloads": true },
        { "name": "uns-bridge", "layer": "layers/components/filling-line/uns-bridge.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:uns-bridge" }, "hotReloads": true }
      ]
    },
    {
      "key": "gw-pack-01", "scope": "line/packaging-line",
      "components": [
        { "name": "opcua-adapter", "layer": "layers/components/packaging-line/opcua-adapter.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:opcua-adapter" }, "hotReloads": true },
        { "name": "modbus-adapter", "layer": "layers/components/packaging-line/modbus-adapter.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:modbus-adapter" }, "hotReloads": true },
        { "name": "telemetry-processor", "layer": "layers/components/packaging-line/telemetry-processor.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:telemetry-processor" }, "hotReloads": true },
        { "name": "uns-bridge", "layer": "layers/components/packaging-line/uns-bridge.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:uns-bridge" }, "hotReloads": true }
      ]
    },
    {
      "key": "gw-fill-02", "scope": "line/filling-line",
      "components": [
        { "name": "telemetry-processor", "layer": "layers/components/filling-line/telemetry-processor.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:telemetry-processor" }, "hotReloads": true },
        { "name": "uns-bridge", "layer": "layers/components/filling-line/uns-bridge.json", "configSource": "CONFIG_COMPONENT", "artifact": { "version": null, "source": "sibling:uns-bridge" }, "hotReloads": true }
      ]
    }
  ],
  "profiles": [
    { "name": "host", "family": "HOST", "environment": "local", "bindings": "bindings/local.json", "files": 24 },
    { "name": "greengrass", "family": "GREENGRASS", "environment": "prod", "bindings": "bindings/prod.json", "files": 6 },
    { "name": "kubernetes", "family": "KUBERNETES", "environment": "cluster", "bindings": "bindings/k8s.json", "files": 14 }
  ],
  "codeowners": {
    "path": "CODEOWNERS",
    "rules": [
      { "pattern": "/sites/dallas-site/", "owners": ["@bottles-r-us/dallas-deploy-leads"] },
      { "pattern": "/sites/dallas-site/layers/scopes/", "owners": ["@bottles-r-us/config-governance"] },
      { "pattern": "/sites/dallas-site/layers/provider/", "owners": ["@bottles-r-us/edge-platform"] },
      { "pattern": "/sites/dallas-site/layers/components/filling-line/", "owners": ["@bottles-r-us/filling-line-controls"] },
      { "pattern": "/sites/dallas-site/layers/components/packaging-line/", "owners": ["@bottles-r-us/packaging-line-controls"] },
      { "pattern": "/sites/dallas-site/layers/components/site/edge-console.json", "owners": ["@bottles-r-us/plant-ops-ui"] }
    ]
  },
  "releases": [
    {
      "stream": "config", "tag": "config-3a757efeb6a4", "commit": "3a757efeb6a4",
      "state": "awaiting-review", "devMode": true,
      "reviewers": ["@bottles-r-us/filling-line-controls", "@bottles-r-us/config-governance"],
      "approved": ["@bottles-r-us/config-governance"],
      "files": 24, "hash": "sha256:80c65c7090e4c189923fec62ba7ee1ebca10523ba3c0485e2c5f034c081dcd4b"
    },
    {
      "stream": "artifact", "tag": "artifact-3a757efeb6a4", "commit": "3a757efeb6a4",
      "state": "blocked", "devMode": true,
      "blockedReason": "10 of 10 components are source-form; promotion to a protected environment requires version + digest (deployment lock).",
      "reviewers": ["@bottles-r-us/dallas-deploy-leads"], "approved": [],
      "files": 24, "hash": "sha256:80c65c7090e4c189923fec62ba7ee1ebca10523ba3c0485e2c5f034c081dcd4b"
    }
  ],
  "evidenceBundle": {
    "schemaValidation": "pass",
    "semanticRules": "pass (S-1..S-9)",
    "renderDeterminism": "re-run at the same definition commit yields byte-identical output",
    "warnings": []
  }
}
;
