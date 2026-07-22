const stationData = {
  source: {
    title: "Deployment Definition",
    body: "Names the solution, environments, nodes, components, runtime inputs, policies, secret references, and target renderers."
  },
  profile: {
    title: "Runtime Profile",
    body: "Reuses the existing EdgeCommons platform x transport resolver. Deployment is above it, not parallel to it."
  },
  host: {
    title: "HOST / supervisord renderer",
    body: "Emits process groups, wait gates, FILE config, MQTT messaging files, directories, and audit-ready start commands."
  },
  kubernetes: {
    title: "KUBERNETES renderer",
    body: "Emits ConfigMaps, Deployments or StatefulSets, ServiceAccounts, probes, PVCs, Services, and optional ServiceMonitor objects."
  },
  greengrass: {
    title: "GREENGRASS renderer",
    body: "Emits recipes, GDK config, artifact manifests, access control, deployment JSON, and merge/reset configuration updates."
  },
  evidence: {
    title: "Validation Evidence",
    body: "Stores schema, semantic, render, smoke, and runtime health results beside the definition commit that produced them."
  }
};

const platformData = {
  HOST: {
    summary: "Plain host, Docker, or bare gateway processes. supervisord is a HOST artifact emitter, not a new EdgeCommons platform.",
    facts: [
      ["Runtime args", "--platform HOST --transport MQTT <messaging.json> -c CONFIG_COMPONENT -t <thing>"],
      ["Config delivery", "CONFIG_COMPONENT lineage served by the on-device catalog server, which itself bootstraps from -c FILE <config.json> under /config"],
      ["Identity", "Explicit -t/--thing or AWS_IOT_THING_NAME fallback"],
      ["Operational shape", "One local broker plus supervised component processes, with readiness gates such as wait-for-tcp"]
    ],
    source: "Grounded in the supervisord process groups and EdgeCommons command lines a HOST deployment already uses."
  },
  KUBERNETES: {
    summary: "Cluster-native runtime profile with MQTT transport, CONFIGMAP config source, health probes, Prometheus metrics, and Downward API identity.",
    facts: [
      ["Runtime args", "--platform KUBERNETES -c CONFIGMAP /etc/edgecommons config.json"],
      ["Config delivery", "ConfigMap mounted as a whole volume so kubelet ..data swaps hot-reload in-process"],
      ["Identity", "EDGECOMMONS_THING_NAME, then POD_NAME from the Downward API"],
      ["Operational shape", "Deployment for stateless, StatefulSet plus PVC for durable stream buffers"]
    ],
    source: "Grounded in core/test-infra/k8s chart, smoke README, templates, and Kubernetes docs."
  },
  GREENGRASS: {
    summary: "Nucleus-managed deployment profile with IPC transport and component configuration delivered through Greengrass deployment state.",
    facts: [
      ["Runtime args", "--platform GREENGRASS -c GG_CONFIG"],
      ["Config delivery", "Recipe DefaultConfiguration plus deployment configurationUpdate merge/reset"],
      ["Identity", "Nucleus-provided thing name and IPC environment"],
      ["Operational shape", "GDK build/publish, recipe lifecycle, accessControl, target thing or thing group deployment"]
    ],
    source: "Grounded in component recipe.yaml files, deploy.py, and AWS Greengrass recipe/deployment docs."
  }
};

const modelNodes = [
  {
    id: "definition",
    label: "Deployment Definition",
    sub: "source of truth",
    x: 41,
    y: 8,
    detail: "A single reviewable document or folder describing what should run for a solution and how it should be rendered.",
    bullets: ["solution name and ownership", "environments and promotion rules", "component graph", "target renderers", "validation policy"]
  },
  {
    id: "environment",
    label: "Environment",
    sub: "dev, lab, prod",
    x: 8,
    y: 28,
    detail: "A named set of values that can vary safely across deployments without cloning the solution design.",
    bullets: ["site names and thing names", "broker endpoints", "AWS regions and target ARNs", "image registries", "namespace or host paths"]
  },
  {
    id: "node",
    label: "Edge Node",
    sub: "device or cluster scope",
    x: 38,
    y: 32,
    detail: "The place components run. On HOST this may be a gateway box. On KUBERNETES it may be a namespace or workload group. On GREENGRASS it is one thing, and one thing only: a node maps 1:1 onto a Greengrass deployment.",
    bullets: ["thing identity", "local broker", "resource budgets", "storage mounts", "placement labels"]
  },
  {
    id: "component",
    label: "Component Instance",
    sub: "EdgeCommons app",
    x: 68,
    y: 28,
    detail: "A deployable component plus its EdgeCommons config, business instances, artifact version, and runtime service needs.",
    bullets: ["component token", "global config", "instances[]", "command verbs", "metrics and health", "streaming buffers"]
  },
  {
    id: "layers",
    label: "Config Layer Ref",
    sub: "raw layers",
    x: 13,
    y: 58,
    detail: "A reference to ordered raw config layers resolved from the deployment hierarchy. The shipped split-config foundation becomes enterprise/site/building/zone/line/device/component lineage, still producing one effective runtime config.",
    bullets: ["ordered ancestry", "component leaf", "same provider family", "raw controls stripped before validation", "effective config is what runtimes publish"]
  },
  {
    id: "policy",
    label: "Policy",
    sub: "safety rails",
    x: 40,
    y: 62,
    detail: "Reusable rules that bound rendering and promotion instead of relying on reviewer memory.",
    bullets: ["least privilege", "IPC only on GREENGRASS", "no subPath ConfigMap mounts", "no wildcard access without justification"]
  },
  {
    id: "renderer",
    label: "Renderer",
    sub: "target adapter",
    x: 68,
    y: 58,
    detail: "A deterministic adapter that turns semantic intent into platform-native files.",
    bullets: ["supervisord INI", "Helm/raw Kubernetes manifests", "Greengrass recipe and deployment JSON", "artifact manifest and lock file"]
  },
  {
    id: "secrets",
    label: "Secret Ref",
    sub: "never value",
    x: 18,
    y: 76,
    detail: "Secrets are referenced by name, provider, and mount/use policy. The model never stores the secret value.",
    bullets: ["AWS Secrets Manager", "Kubernetes Secret or ExternalSecret", "env KeyProvider", "Greengrass TES/KMS path", "host-local secure file"]
  },
  {
    id: "catalog",
    label: "Git Catalog",
    sub: "ConfigComponent seam",
    x: 63,
    y: 76,
    detail: "ConfigComponent already abstracts catalog sources as a trait. A future GitCatalogSource can load a pinned ref/commit and serve the same raw layer bundles without changing runtime clients.",
    bullets: ["source URI", "ref and commit SHA", "tree hash", "catalog path", "reject invalid and keep last good"]
  },
  {
    id: "evidence",
    label: "Evidence Bundle",
    sub: "release gate",
    x: 41,
    y: 88,
    detail: "Machine-readable validation output tied to the exact definition commit and renderer version.",
    bullets: ["schema validation", "semantic checks", "artifact lint", "smoke run", "runtime health snapshot"]
  }
];

const modelLinks = [
  ["definition", "environment"],
  ["definition", "node"],
  ["definition", "component"],
  ["environment", "layers"],
  ["node", "policy"],
  ["component", "renderer"],
  ["layers", "catalog"],
  ["secrets", "renderer"],
  ["catalog", "renderer"],
  ["policy", "renderer"],
  ["renderer", "evidence"]
];

const timelineData = [
  {
    id: "draft",
    title: "Draft",
    meta: "branch: deploy/filling-line",
    definition: "+ component.telemetry.instances[archive]\n+ target.HOST.supervisord.priority = 40\n+ target.KUBERNETES.workload.kind = StatefulSet",
    rendered: "HOST: adds [program:telemetry-processor]\nK8S: adds PVC + StatefulSet\nGG: no release artifact yet"
  },
  {
    id: "review",
    title: "Reviewed",
    meta: "PR approved",
    definition: "+ validation.policy.requires.k8sSmoke = true\n+ secretRefs.kinesisRole = aws:iam-role\n~ streaming.buffer.maxDiskBytes 256Mi -> 1Gi",
    rendered: "helm template diff: storage request 5Gi\nrecipe diff: TokenExchangeService dependency\nsupervisord diff: stopwaitsecs 15"
  },
  {
    id: "promote",
    title: "Promoted",
    meta: "tag: deploy-prod-2026.07.08",
    definition: "+ lock.imageDigest = sha256:8fb...\n+ evidence.kindSmoke = passed\n+ evidence.greengrassLab = passed",
    rendered: "snapshots/prod/k8s/*.yaml\nsnapshots/prod/gg/deployment.json\nsnapshots/prod/host/supervisord.conf"
  }
];

const rendererData = {
  HOST: {
    title: "HOST / supervisord renderer",
    body: "This renderer formalizes the standard HOST pattern: one edge device hosts a local MQTT broker plus multiple EdgeCommons processes. supervisord supplies process supervision; EdgeCommons still sees platform HOST.",
    artifacts: [
      ["supervisord.conf", "program blocks, priority, startsecs, autorestart, stopwaitsecs"],
      ["config/", "component JSON and messaging JSON, with env templating when required"],
      ["command adapters", "standard EdgeCommons CLI for every component; the variation is per-language launchers (native binary, java -jar, python -m) and readiness gates, not the argument contract"],
      ["install script", "directories, users, binaries, broker package, local service wrapper"],
      ["health manifest", "ports, wait gates, broker dependencies, console endpoints"]
    ],
    preview: `[program:telemetry-processor]\ncommand=/usr/local/bin/wait-for-tcp localhost:1883 -- \\\n  telemetry-processor --platform HOST \\\n  --transport MQTT /config/telemetry-messaging.json \\\n  -c CONFIG_COMPONENT -t gw-fill-01\npriority=40\nautorestart=true\nstartsecs=5\nstopwaitsecs=15`
  },
  KUBERNETES: {
    title: "KUBERNETES renderer",
    body: "This renderer builds on the existing chart and templates. The important invariant is that the ConfigMap is mounted as a whole directory, health and metrics ports are explicit, and durable stream buffers select a StatefulSet plus PVC.",
    artifacts: [
      ["ConfigMap", "config.json with component, messaging.local, heartbeat, metrics, credentials refs"],
      ["Workload", "Deployment or StatefulSet, probes, security context, args, Downward API env"],
      ["ConfigComponent", "optional catalog server manifest when centralized config is part of the solution"],
      ["Service/RBAC", "ClusterIP service, optional ServiceMonitor, RBAC off unless required"],
      ["Storage", "PVCs for stream buffers, tmp emptyDir for read-only root filesystems"]
    ],
    preview: `apiVersion: apps/v1\nkind: StatefulSet\nspec:\n  template:\n    spec:\n      containers:\n        - args: [\"--platform\", \"KUBERNETES\", \"-c\", \"CONFIGMAP\", \"/etc/edgecommons\", \"config.json\"]\n          readinessProbe: { httpGet: { path: /readyz, port: health } }\n          volumeMounts:\n            - { name: edgecommons-config, mountPath: /etc/edgecommons, readOnly: true }\n  volumeClaimTemplates:\n    - metadata: { name: edgecommons-buffer }`
  },
  GREENGRASS: {
    title: "GREENGRASS renderer",
    body: "This renderer preserves the current recipe and deploy.py path, then adds a richer deployment JSON output for configuration merge/reset, policies, runWith, artifact URIs, and target ARNs.",
    artifacts: [
      ["recipe.yaml", "ComponentConfiguration, accessControl, dependencies, lifecycle, artifact URIs"],
      ["gdk-config.json", "build and publish metadata with concrete component version"],
      ["deployment.json", "targetArn, components, configurationUpdate, policies, runWith"],
      ["local deployment script", "greengrass-cli deployment create command for on-device validation"]
    ],
    preview: `"components": {\n  "com.mbreissi.edgecommons.TelemetryProcessor": {\n    "componentVersion": "1.0.0",\n    "configurationUpdate": {\n      "reset": ["/ComponentConfig/component/instances"],\n      "merge": "{\\"ComponentConfig\\":{\\"component\\":{\\"instances\\":[...]}}}"\n    },\n    "runWith": { "posixUser": "ggc_user:ggc_group" }\n  }\n}`
  }
};

const validationData = [
  {
    title: "Schema",
    detail: "Validate EdgeCommons config documents against the canonical schema before rendering.",
    examples: ["component is required", "top-level unknown keys fail", "metricEmission.target permits prometheus"]
  },
  {
    title: "Semantic",
    detail: "Validate cross-field invariants that JSON Schema cannot express.",
    examples: ["IPC is valid only with GREENGRASS", "supervisord renderer must use HOST", "KUBERNETES ConfigMap mount must not use subPath", "hierarchical config lineage must be acyclic and ordered"]
  },
  {
    title: "Render",
    detail: "Parse and lint generated artifacts.",
    examples: ["no unsubstituted template tokens", "recipe lint passes", "helm template parses", "supervisord INI sections are unique"]
  },
  {
    title: "Deploy smoke",
    detail: "Run target-specific smoke tests using the existing infrastructure where possible.",
    examples: ["kind smoke for KUBERNETES", "supervisord container smoke for HOST", "device regression for GREENGRASS", "ConfigComponent GitCatalogSource load/reject/keep-last-good"]
  },
  {
    title: "Runtime health",
    detail: "Capture what actually came up after deployment.",
    examples: ["state keepalive observed", "edge-console model shows component fresh", "command ping succeeds", "artifact hashes match lock"]
  }
];

const workflowData = [
  {
    group: "Workspace",
    title: "Workspace setup",
    route: "mock-app/index.html",
    status: "empty system path",
    note: "When no deployment definitions exist, the app shows a page-local setup path with one decision panel at a time.",
    scope: "New organization",
    primary: "Create a Git-backed deployment workspace, then define the first hierarchy levels and instances.",
    secondary: [
      "Create or connect storage before any authoring happens.",
      "Model hierarchy levels separately from concrete instances.",
      "Choose the enterprise target standard once; per-edge exceptions are rare and explicit.",
      "Assign multiple components to a selected edge node and configure each instance before render."
    ],
    inspector: [
      "Current step, missing prerequisites, and generated files are visible in the right rail.",
      "No fleet tree is shown until at least one real hierarchy instance exists.",
      "The final setup step renders a lab bundle for the chosen target standard only."
    ]
  },
  {
    group: "Assets",
    title: "Fleet",
    route: "mock-app/fleet.html",
    status: "operational entry",
    note: "For an existing system, the user starts from the fleet and sees runtime truth beside definition state.",
    scope: "Acme / Dallas / Filling line 7",
    primary: "Browse enterprise, site, line, device, and component instances as operational assets.",
    secondary: [
      "Show release lock, target standard, health, and open drafts for the selected node.",
      "Treat target-family exceptions as explicit flags, not as normal comparison columns.",
      "Open a draft from the selected node without losing the operational context.",
      "Correlate edge-console keepalive and release evidence back to the definition commit."
    ],
    inspector: [
      "Selected node identity and release lock.",
      "Runtime freshness and apply posture.",
      "Open draft and release evidence shortcuts."
    ]
  },
  {
    group: "Assets",
    title: "Dataflows",
    route: "mock-app/definition-map.html",
    status: "semantic graph",
    note: "This replaces the vague definition map with a graph for component instances, ports, topics, and config bindings.",
    scope: "Line or device scope",
    primary: "Draw what runs on the selected edge and how signals move through adapters, processors, bridges, and storage.",
    secondary: [
      "Nodes are deployed component instances, not platform artifacts.",
      "Edges are EdgeCommons message flows, UNS paths, command paths, and durable stream links.",
      "Runtime requirements are expressed semantically and rendered for the selected target family later.",
      "Selecting a node opens its ports, config bindings, secrets, health, and release impact."
    ],
    inspector: [
      "Selected component instance and assigned edge device.",
      "Message classes, topics, and schema contracts.",
      "Warnings for missing required config or incompatible target capabilities."
    ]
  },
  {
    group: "Assets",
    title: "Config layers",
    route: "mock-app/hierarchy-config.html",
    status: "scoped authoring",
    note: "This screen edits effective config at a selected hierarchy node; it does not define the hierarchy topology.",
    scope: "Acme / Dallas / Filling line 7 / gw-fill-01",
    primary: "Select a concrete hierarchy node, inspect inherited layers, and edit only the local overrides for that scope.",
    secondary: [
      "The left context is a hierarchy instance tree, not a level-definition table.",
      "The center shows inherited, local, and effective values side by side.",
      "Config ownership follows the hierarchy model; the user does not choose redundant ownership columns.",
      "Changes are validated against the EdgeCommons config schema before render."
    ],
    inspector: [
      "Override count and source layer for every edited value.",
      "Effective runtime config preview for selected components.",
      "Schema and semantic validation results."
    ]
  },
  {
    group: "Assets",
    title: "Components",
    route: "mock-app/component-editor.html",
    status: "instance detail",
    note: "Component editing is scoped to a selected deployed instance, with catalog metadata and runtime config in one place.",
    scope: "gw-fill-01 / telemetry-processor",
    primary: "Configure a component instance after it has been assigned to an edge node.",
    secondary: [
      "Use the component catalog to populate required config, command verbs, health, metrics, and artifact metadata.",
      "Render impact is shown for the selected target standard only.",
      "Secrets are references with provider policy, never raw values.",
      "Changing component config updates dataflow and render-review warnings immediately."
    ],
    inspector: [
      "Catalog version and source commit.",
      "Required vs optional fields.",
      "Selected-target artifact impact."
    ]
  },
  {
    group: "Delivery",
    title: "Render review",
    route: "mock-app/render-review.html",
    status: "selected target",
    note: "Render review focuses on the enterprise's chosen target family and the selected release scope.",
    scope: "Greengrass standard / Dallas prod",
    primary: "Render deterministic artifacts, show diffs, and explain consequences before anything is promoted or applied.",
    secondary: [
      "HOST, Kubernetes, and Greengrass are separate renderer families, but the normal page shows the selected standard.",
      "Artifact previews include native files, generated config, IaC handshakes, and lock hashes.",
      "Policy, schema, render-lint, and smoke evidence are attached to the render result.",
      "Target exceptions are opened as explicit exceptions when they exist."
    ],
    inspector: [
      "Render hash and source commit.",
      "Files changed and policies triggered.",
      "Missing evidence blocking promotion."
    ]
  },
  {
    group: "Delivery",
    title: "Releases",
    route: "mock-app/release-gate.html",
    status: "promotion gate",
    note: "Promotion is a Git-first release decision backed by rendered artifacts, IaC evidence, and runtime validation.",
    scope: "deploy-prod-2026-07-08",
    primary: "Compare draft, rendered output, policy decisions, approvals, and apply readiness in one release gate.",
    secondary: [
      "Generate-only mode opens a pull request with definition and artifact changes.",
      "Apply mode still writes to Git first, then hands off to an approved runner or external deployment system.",
      "IaC plans and external controller status are evidence, not hidden side effects.",
      "Rollback and promotion history are tied to immutable release locks."
    ],
    inspector: [
      "Required approvers and policy decisions.",
      "Terraform, CDK, GitOps, Greengrass, or host orchestrator status.",
      "Apply identity, audit trail, and rollback candidate."
    ]
  },
  {
    group: "Operations",
    title: "Drift",
    route: "mock-app/plan-drift.html",
    status: "truth reconciliation",
    note: "Drift is shown after render and apply, comparing source definition, generated artifacts, external target state, and runtime evidence.",
    scope: "Dallas prod",
    primary: "Detect where the running system no longer matches the intended definition or the generated artifact bundle.",
    secondary: [
      "Definition drift means a branch or release lock differs from the promoted source.",
      "Artifact drift means generated files no longer match the render hash.",
      "Target drift means Kubernetes, Greengrass, or host state diverged from the applied bundle.",
      "Runtime drift means the edge-console evidence disagrees with target status or expected keepalive."
    ],
    inspector: [
      "Which layer drifted and who can resolve it.",
      "Suggested action: reconcile, rerender, rollback, or accept as exception.",
      "Links back to the exact asset surface that owns the fix."
    ]
  }
];

const iacData = {
  terraform: {
    title: "Terraform module and output handshake",
    body: "Use Terraform when the organization already manages shared AWS, Kubernetes, registry, network, and identity infrastructure through remote state and provider credentials. Deployment Studio should generate module inputs and consume outputs, not silently become the state owner.",
    responsibilities: [
      "Generate typed input variables from DeploymentDefinition and EnvironmentBinding.",
      "Read outputs such as artifact bucket, the provisioned IoT thing ARNs, namespace, registry, and IAM role ARNs.",
      "Attach Terraform plan summary to the release gate when apply mode is enabled."
    ],
    preview: `module "edgecommons_filling_line" {\n  source = "git::ssh://git@example.com/iac/edgecommons-edge-target.git"\n\n  site             = "dallas"\n  thing_arns       = var.greengrass_thing_arns  # one per node, no groups\n  namespace        = "edge-prod"\n  artifact_bucket  = aws_s3_bucket.greengrass_artifacts.bucket\n  release_lock_sha = "9dd4f4..."\n}\n\noutput "edgecommons_target_binding" {\n  value = {\n    namespace = "edge-prod"\n    artifact_bucket = aws_s3_bucket.greengrass_artifacts.bucket\n  }\n}`
  },
  cdk: {
    title: "AWS CDK construct for AWS-owned edge resources",
    body: "Use CDK when the team wants a higher-level, language-native construct for AWS resources around Greengrass, IoT, IAM, S3, KMS, logs, and deployment automation. Deployment Studio can generate construct props or a small synthesized app.",
    responsibilities: [
      "Emit construct props for Greengrass component versions, artifact buckets, IoT policies, and deployment targets.",
      "Keep CloudFormation as the apply system and surface stack events back into release evidence.",
      "Use CDK for AWS resources, but still render EdgeCommons runtime config from the deployment source."
    ],
    preview: `new EdgeCommonsGreengrassTarget(this, "DallasFillingLine", {\n  thingArns: props.thingArns,        // one deployment per thing\n  artifactBucket: props.artifactBucket,\n  releaseLock: "deploy-prod-2026-07-08",\n  components: [{\n    name: "com.mbreissi.edgecommons.TelemetryProcessor",\n    recipePath: "render/greengrass/recipe.yaml"\n  }]\n});`
  },
  gitops: {
    title: "Helm/Kustomize with GitOps reconciliation",
    body: "Use GitOps when Kubernetes clusters already reconcile from Git. Deployment Studio should generate values, overlays, or plain manifests into a promoted release path, then let Argo CD or Flux own synchronization and drift reporting.",
    responsibilities: [
      "Generate Helm values or Kustomize overlays with stable labels, annotations, and config hashes.",
      "Create one Application or Kustomization boundary per environment and release policy.",
      "Show out-of-sync and health data from the GitOps controller instead of hiding it."
    ],
    preview: `apiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources:\n  - ../../base\nconfigMapGenerator:\n  - name: telemetry-processor-config\n    files:\n      - config.json=rendered/config/telemetry-processor.json\npatches:\n  - path: patches/prod-resources.yaml\ncommonLabels:\n  edgecommons.io/release: deploy-prod-2026-07-08`
  },
  greengrass: {
    title: "Greengrass component and deployment IaC",
    body: "Greengrass deployment spans generated component artifacts and AWS-managed target state. The renderer should produce recipe, GDK config, deployment JSON, and access-control review material; apply should call Greengrass APIs only from a locked release. Targets are things, not thing groups, so a definition with N nodes renders N deployment documents and fails or succeeds per node.",
    responsibilities: [
      "Render recipes with concrete component versions and artifact URIs.",
      "Generate configurationUpdate merge/reset from effective EdgeCommons config.",
      "Validate accessControl, TokenExchangeService needs, and the per-node target thing ARN."
    ],
    preview: `{\n  "targetArn": "arn:aws:iot:us-east-1:111122223333:thing/gw-fill-01",\n  "deploymentName": "deploy-prod-2026-07-08",\n  "components": {\n    "com.mbreissi.edgecommons.TelemetryProcessor": {\n      "componentVersion": "1.4.2",\n      "configurationUpdate": {\n        "merge": "{\\"ComponentConfig\\":{\\"component\\":{...}}}"\n      }\n    }\n  }\n}`
  },
  host: {
    title: "Host fleet orchestration boundary",
    body: "HOST targets often have a pre-existing path for device imaging, package install, SSH, MDM, Ansible, or site operations. Deployment Studio should generate a portable host bundle and checksums, then optionally hand it to that orchestrator.",
    responsibilities: [
      "Render supervisord files, config packs, messaging files, directory manifests, and checksums.",
      "Stage changes and validate supervisor syntax before reload.",
      "Report file hash, process status, broker status, and EdgeCommons keepalive back as runtime evidence."
    ],
    preview: `host-bundle/\n  supervisor/filling-line.conf\n  config/telemetry-processor.json\n  config/telemetry-messaging.json\n  scripts/stage.ps1\n  scripts/reload-supervisor.sh\n  checksums.sha256\n\napply: stage -> verify hashes -> supervisorctl reread -> update -> health`
  }
};

const gateData = [
  {
    title: "Source schema",
    state: "pass",
    summary: "Deployment schema validates first, then every generated effective EdgeCommons runtime config validates against the strict config schema.",
    checks: ["DeploymentDefinition shape", "EnvironmentBinding references", "runtime config schema", "unknown field rejection"],
    sample: `edgecommons deployment validate definitions/dallas-filling-line.yaml\nPASS deployment schema\nPASS runtime config: telemetry-processor\nPASS runtime config: modbus-adapter`
  },
  {
    title: "Semantic policy",
    state: "warn",
    summary: "Cross-field rules catch things JSON Schema cannot express, including platform/transport compatibility, hierarchy integrity, and apply safety.",
    checks: ["IPC only on GREENGRASS", "HOST supervisord still uses platform HOST", "hierarchical config lineage is acyclic", "secret values are forbidden"],
    sample: `WARN greengrass.accessControl uses wildcard topic\nPASS k8s config mount avoids subPath\nPASS no inline secret values\nPASS hierarchy lineage enterprise/site/line/device/component`
  },
  {
    title: "Render lint",
    state: "pass",
    summary: "Generated files are parsed, stable, sorted, hashable, and free of unresolved template tokens.",
    checks: ["YAML and JSON parse", "supervisord INI sections unique", "recipe contains concrete version", "stable serialization hash"],
    sample: `renderHash: sha256:2fc1...\nhost/supervisord.conf OK\nkubernetes/statefulset.yaml OK\ngreengrass/recipe.yaml OK`
  },
  {
    title: "IaC policy",
    state: "warn",
    summary: "Rendered plans become policy input so security rules can reason across target resources, not just scan text.",
    checks: ["Kubernetes security context", "RBAC scope", "PVC sizing", "Greengrass least privilege", "host file ownership"],
    sample: `deny: []\nwarn:\n  - ServiceMonitor enabled without prod monitoring owner approval\n  - Greengrass SubscribeToTopic scope is broader than generated topic map`
  },
  {
    title: "Supply chain",
    state: "pass",
    summary: "Release locks pin artifact versions and digests; published artifacts carry SBOM, vulnerability scan, signature, and provenance references when available.",
    checks: ["image digest pinned", "component artifact hash", "SBOM attached", "signature verified", "builder provenance recorded"],
    sample: `image: ghcr.io/edgecommons/telemetry-processor@sha256:8fb...\nsbom: cyclonedx-json sha256:6aa...\nsignature: cosign verified\nprovenance: slsa build attestation present`
  },
  {
    title: "Target smoke",
    state: "pass",
    summary: "Target-specific validation proves the generated output works where the runtime contract matters.",
    checks: ["HOST supervisor container", "Kubernetes kind or k3s", "Greengrass test device", "ConfigComponent load/reject/keep-last-good"],
    sample: `HOST: local broker reachable, processes RUNNING\nKUBERNETES: startupz/livez/readyz passed\nGREENGRASS: device deployment SUCCEEDED\nCONFIG_COMPONENT: rejected bad catalog and kept last good`
  }
];

const runtimeData = {
  laptop: {
    title: "Tier 0 — Laptop / CI runner",
    cost: "no cloud spend",
    body: "The default, and the tier every other tier is a re-binding of. The CLI does the whole model-to-artifact job with no server and no network, so slices 1 and 2 need no hosting decision to be paid for at all. <code>docker compose up</code> adds the surrounding cast when you want the full loop.",
    runs: [
      "<code>edgecommons deployment validate | render | plan | diff</code> — one static binary, no daemon.",
      "Optional: <code>edgecommons studio serve --repo .</code> for the UI, against a local clone.",
      "Compose brings Gitea (real PR, protected-branch, and CODEOWNERS flow, offline), kind, and a containerized supervisord site.",
      "All three renderers are developable and verifiable here: HOST against containers running supervisord, Kubernetes against kind, Greengrass against a device running <code>greengrass-cli</code> local deployment."
    ],
    ports: [
      ["Git", "local clone, or Gitea in compose"],
      ["Identity", "static dev users"],
      ["Blob", "filesystem"],
      ["Runner", "local subprocess"],
      ["Targets", "kind · greengrass-cli local deploy · supervisord containers"]
    ],
    preview: `# nothing but the binary is required\nedgecommons deployment render --env lab --target host\nedgecommons deployment diff  --against release/deploy-lab-2026-07-08\n\n# the full loop, still $0\ndocker compose up   # studio + gitea + kind + a supervisord HOST site\nedgecommons studio serve --repo . --git file://./deployment`
  },
  team: {
    title: "Tier 1 — Shared team instance",
    cost: "a small VM or container host",
    body: "The same image, one replica, pointed at a real Git host. Nothing about the app changes — only which adapter each port is bound to. One replica is the correct answer, not a limitation: the Git host performs concurrency control, so there is no session, HA, or database story to have.",
    runs: [
      "One container on any generic container host, a small VM, or an existing build server.",
      "Git host owns review, approval, protected branches, and CODEOWNERS over layers/.",
      "Apply runs in a CI runner holding the target credentials — never in the Studio process.",
      "Evidence is optional: with no snapshot feed, the Studio degrades cleanly to Git-only mode."
    ],
    ports: [
      ["Git", "GitHub / GitLab / Gitea"],
      ["Identity", "the Git host's identity, or an OIDC IdP"],
      ["Blob", "filesystem volume, or MinIO / S3-compatible"],
      ["Runner", "GitHub Actions, GitLab CI, Jenkins, or a self-hosted runner"],
      ["Targets", "kind or k3s · a Greengrass test device · a staging HOST site"]
    ],
    preview: `docker run -d --name edgecommons-studio \\\n  -p 8443:8443 \\\n  -v /srv/studio:/var/lib/edgecommons-studio \\\n  -e STUDIO_GIT_URL=https://github.com/acme/edge-deployment.git \\\n  -e STUDIO_OIDC_ISSUER=https://idp.example.com \\\n  ghcr.io/edgecommons/deployment-studio:0.1.0\n\n# state: the Git repo (durable) + one SQLite file (derived cache, rebuildable)`
  },
  enterprise: {
    title: "Tier 2 — Customer / regulated site",
    cost: "customer infrastructure",
    body: "The same image again, installed into infrastructure the customer already owns, via the Helm chart. This is the tier that makes cloud-neutrality a requirement rather than a preference: a regulated pharma customer will not accept a vendor-hosted SaaS control plane, and an air-gapped plant cannot reach one.",
    runs: [
      "Their Kubernetes or their Docker host; their Git; their IdP; their runners.",
      "Fully air-gappable: Git-only mode needs no network beyond the Git remote, and the CLI alone works from a Git bundle on removable media.",
      "Live evidence, where wanted, arrives from each site's edge-console as a signed site-state snapshot over the snapshot port.",
      "No multi-tenant SaaS. That shape would force the identity, audit, and tenancy work that is already the blocking gap on the pharma track, and it contradicts PN-2."
    ],
    ports: [
      ["Git", "customer GitLab / GitHub Enterprise / Gitea"],
      ["Identity", "customer OIDC IdP (Entra, Okta, Keycloak)"],
      ["Blob", "customer S3-compatible object store (MinIO, Ceph, S3, R2)"],
      ["Runner", "customer CI, or an on-prem runner inside the plant"],
      ["Targets", "customer cluster · their Greengrass account · their gateways"]
    ],
    preview: `helm install edgecommons-studio edgecommons/deployment-studio \\\n  --set git.url=https://gitlab.acme.internal/edge/deployment.git \\\n  --set oidc.issuer=https://keycloak.acme.internal/realms/edge \\\n  --set blob.endpoint=https://minio.acme.internal \\\n  --set mode=git-only          # no live evidence plane required\n\n# the same image as Tier 0 and Tier 1. Only the port bindings differ.`
  }
};

const mockScreens = {
  firstRun: {
    title: "First run workspace",
    status: "empty system: no deployment definitions yet",
    path: "New organization / No sites configured / No release locks",
    summary: "When the system is empty, the UI becomes a guided setup path. The user should not see a blank fleet tree or a YAML editor; they should be led through the minimum decisions needed to produce a first safe deployment definition and render preview.",
    action: "Start setup",
    tree: [
      ["Step 1", "Create workspace", "required"],
      ["Step 2", "Name hierarchy", "next"],
      ["Step 3", "Choose target", "locked"],
      ["Step 4", "Add components", "locked"],
      ["Step 5", "Render lab", "locked"]
    ],
    targets: ["No repo connected", "No target binding", "No components"],
    inspectorTitle: "Start here",
    inspector: [
      "First create or connect the Git-backed deployment repository.",
      "Then define the organization, site, line, and first edge node scopes.",
      "Target-specific deployment details stay hidden until a target family is chosen."
    ],
    panels: [
      {
        kind: "list",
        size: "wide hero",
        title: "Day-zero setup path",
        eyebrow: "empty state",
        items: [
          ["1. Create or connect storage", "Create a new deployment repository, connect an existing Git repo, or import generated artifacts from a lab folder."],
          ["2. Define the hierarchy", "Name the enterprise, first site, optional building/zone/line scopes, and the first edge node or target group."],
          ["3. Pick the target standard", "Choose HOST/supervisord, Kubernetes, or Greengrass as the enterprise standard so the UI can ask only relevant questions."],
          ["4. Add components", "Select one or more registry components for the first edge node, configure each assigned instance, and render a lab-only preview before promotion."]
        ]
      },
      {
        kind: "table",
        title: "What the wizard asks first",
        headers: ["Decision", "Why it is first", "Example"],
        rows: [
          ["Repository mode", "Everything else needs versioning, diff, and audit history.", "Create deployment repo"],
          ["Hierarchy names", "Config lineage and identity cannot be explained without scopes.", "enterprise/acme/site/dallas/line/filling-7"],
          ["Target standard", "Most enterprises standardize on one target family and treat exceptions explicitly.", "Greengrass, one deployment per thing"],
          ["Component assignments", "A deployment definition needs runnable workloads assigned to concrete edge nodes.", "telemetry-processor and opcua-adapter on gw-fill-01"],
          ["Validation mode", "A lab render can be generated before apply credentials exist.", "generate-only"]
        ]
      },
      {
        kind: "list",
        title: "Empty-state UX rules",
        items: [
          ["No blank dashboard", "The empty fleet view is replaced by a guided setup checklist and import options."],
          ["Progressive questions", "The wizard asks target-specific details only after the user picks HOST, Kubernetes, or Greengrass."],
          ["Safe first success", "The first milestone is a validated render bundle, not a live production deployment."],
          ["Import is first-class", "A team can import existing supervisord, Kubernetes, or Greengrass artifacts and map them back to the model."]
        ]
      },
      {
        kind: "code",
        title: "First generated workspace",
        label: "after setup",
        code: `deployment/\n  workspace.yaml\n  hierarchy/\n    enterprise-acme.yaml\n    site-dallas.yaml\n    line-filling-7.yaml\n  targets/\n    lab-greengrass.yaml\n  components/\n    telemetry-processor.yaml\n  releases/\n    draft-first-render/manifest.json`
      }
    ]
  },
  inventory: {
    title: "Fleet overview",
    status: "current release: deploy-prod-2026-07-08",
    path: "Acme Manufacturing / Dallas / North packaging hall / Bottling area / Filling line 7",
    summary: "Start from a business hierarchy. A user selects an enterprise, site, building, area, line, edge node, or component; deployment bindings and exceptions are detail for that selected asset, not peers in the fleet tree.",
    action: "Open draft",
    tree: [
      ["Enterprise", "Acme Manufacturing", "2 sites"],
      ["Site", "Dallas", "fresh"],
      ["Building", "North packaging hall", "4 lines"],
      ["Area", "Bottling area", "2 lines"],
      ["Line", "Filling line 7", "1 warning"],
      ["Edge node", "Filler gateway 01", "gw-fill-01"],
      ["Component", "Telemetry processing", "running"]
    ],
    targets: ["Greengrass standard", "runtime fresh", "1 policy warning"],
    inspectorTitle: "Selected: Filling line 7",
    inspector: [
      "Release lock: deploy-prod-2026-07-08 at render hash 2fc1e9.",
      "One runtime warning is attached to Greengrass access control.",
      "No apply credentials are loaded in this browser session."
    ],
    panels: [
      {
        kind: "list",
        size: "wide",
        title: "Operational snapshot",
        eyebrow: "line state",
        items: [
          ["Current release", "Filling line 7 reports the selected lock across both edge nodes."],
          ["Runtime evidence", "State keepalive is fresh for the local broker, telemetry processor, file replicator, and UNS bridge."],
          ["Open draft", "deploy/add-file-replicator is waiting on Greengrass lab smoke evidence before promotion."],
          ["Operator posture", "Read-only until a draft is opened or an apply credential is explicitly attached."]
        ]
      },
      {
        kind: "table",
        title: "Selected asset deployment context",
        headers: ["Business item", "Level", "Runtime state", "Deployment detail", "Next action"],
        rows: [
          ["Filling line 7", "Line", "1 warning", "inherits Dallas production edge fleet", "review ACL scope"],
          ["Filler gateway 01", "Edge node", "fresh keepalive", "stable key gw-fill-01", "review component"],
          ["Telemetry processing", "Component", "running", "Greengrass access policy warning", "resolve warning"]
        ]
      },
      {
        kind: "list",
        title: "Deployment bindings for selected line",
        items: [
          ["Dallas production edge fleet", "Business label for the normal production rollout binding. Technical target: one Greengrass deployment per AWS IoT thing, one thing per edge node."],
          ["Quality lab validation environment", "Approved exception for smoke tests. Technical target: Kubernetes namespace dallas-quality-validation."],
          ["Legacy gateway migration lane", "Approved exception for rollback evidence. Technical artifact: HOST bundle gateway-17."]
        ]
      },
      {
        kind: "list",
        title: "Questions answered here",
        items: [
          ["Can I safely edit?", "Only by opening a draft branch from the selected release lock."],
          ["What changed?", "The UI separates desired-state draft changes from target reconciliation and runtime telemetry."],
          ["Where do I click next?", "Warnings, drafts, and targets are links into the deeper task screens."]
        ]
      },
      {
        kind: "code",
        title: "Release lock excerpt",
        label: "render lock",
        code: `release: deploy-prod-2026-07-08\nsourceCommit: 4b91a3e\nconfigStream:\n  catalogVersion: dallas-line-7-v14\n  effectiveHash: sha256:7a4dd1\nartifactStream:\n  componentVersion: 1.4.2\n  renderHash: sha256:2fc1e9\nselectedAsset:\n  level: line\n  name: Filling line 7\nbinding:\n  standard: greengrass\n  businessName: Dallas production edge fleet\n  technicalTarget: 7 things, one deployment each\n  state: policy-warning`
      }
    ]
  },
  topology: {
    title: "Dataflows",
    status: "draft: deploy/add-file-replicator",
    path: "Acme Manufacturing / Dallas / Filling line 7",
    summary: "The desired edge behavior is edited as component instances, ports, message flows, and config bindings. Platform files are generated later; they are not the authoring surface.",
    action: "Add component",
    tree: [
      ["Draft", "deploy/add-file-replicator", "dirty"],
      ["Graph", "line-7-runtime", "5 components"],
      ["Flow", "edge telemetry", "required"],
      ["Runtime need", "durable-stream", "2 bindings"],
      ["Target standard", "Greengrass", "selected"]
    ],
    targets: ["Dataflow valid", "2 runtime needs", "Greengrass impact"],
    inspectorTitle: "Selected edge: telemetry -> file-replicator",
    inspector: [
      "This dependency adds durable stream output from telemetry-processor.",
      "The selected Greengrass target standard will render recipe dependency and IPC authorization changes.",
      "Other target renderers are not shown unless this edge is explicitly marked as an exception."
    ],
    panels: [
      {
        kind: "map",
        size: "wide",
        title: "Component topology",
        nodes: [
          ["opcua-adapter", "southbound Java adapter", "publishes signal updates"],
          ["modbus-adapter", "southbound Python adapter", "publishes signal updates"],
          ["telemetry-processor", "Rust processor", "filters, aggregates, scripts"],
          ["file-replicator", "artifact/runtime sidecar", "durable local output"],
          ["uns-bridge", "northbound bridge", "publishes UNS topics"]
        ],
        edges: [
          "opcua-adapter -> telemetry-processor as signal updates",
          "modbus-adapter -> telemetry-processor as signal updates",
          "telemetry-processor -> file-replicator via durable stream",
          "telemetry-processor -> uns-bridge as UNS publications"
        ]
      },
      {
        kind: "table",
        title: "Runtime requirements",
        headers: ["Requirement", "Requested by", "Semantic meaning", "Greengrass render impact"],
        rows: [
          ["message-flow", "all components", "components exchange typed EdgeCommons messages", "IPC accessControl and generated topic map"],
          ["durable-stream", "telemetry, replicator", "local persistent stream buffer is required", "artifact path, lifecycle env, and file permissions"],
          ["health-http", "processors", "component exposes runtime health", "lifecycle health command and release evidence check"]
        ]
      },
      {
        kind: "list",
        title: "Screen behavior",
        items: [
          ["Drag is not enough", "Every edge must declare transport, message class, backpressure, and recovery expectations."],
          ["Target consequences stay visible", "Selecting a node shows only the selected target standard deltas caused by that node."],
          ["Invalid topology is local", "A missing broker or unsupported IPC transport is attached to the edge that caused it."]
        ]
      },
      {
        kind: "code",
        title: "Definition fragment",
        label: "semantic source",
        code: `components:\n  telemetry-processor:\n    artifact: edgecommons/telemetry-processor:1.4.2\n    needs: [local-mqtt, durable-stream, health-http]\n    outputs:\n      - to: file-replicator\n        class: southbound.signal.update\n        durability: at-least-once`
      }
    ]
  },
  hierarchy: {
    title: "Config layers",
    status: "lineage: enterprise/site/building/zone/line/device/component",
    path: "enterprise/acme/site/dallas/building/north/zone/paint/line/filling-7/device/gw-fill-01/component/telemetry-processor",
    summary: "This screen edits config at a selected hierarchy instance. The hierarchy level model and instance graph are defined in workspace setup or fleet administration, not here.",
    action: "Explain value",
    tree: [
      ["Enterprise", "acme", "policy"],
      ["Site", "dallas", "broker + identity"],
      ["Building", "north", "storage defaults"],
      ["Zone", "paint", "topic prefix"],
      ["Line", "filling-line-7", "heartbeat"],
      ["Device", "gw-fill-01", "target binding"],
      ["Component", "telemetry-processor", "instances"]
    ],
    targets: ["Effective hash 7a4dd1", "1 blocked override", "5 winning layers"],
    inspectorTitle: "Selected path: /heartbeat/intervalSecs",
    inspector: [
      "Enterprise default is 30 seconds; line layer overrides to 10 seconds.",
      "Device is not allowed to override heartbeat cadence in prod.",
      "Only the merged effective config is validated; layer metadata never reaches it."
    ],
    panels: [
      {
        kind: "lineage",
        size: "wide",
        title: "Resolved lineage",
        nodes: [
          ["enterprise", "acme", "base"],
          ["site", "dallas", "wins identity"],
          ["building", "north", "inherits"],
          ["zone", "paint", "wins topics"],
          ["line", "filling-line-7", "wins heartbeat"],
          ["device", "gw-fill-01", "target binding"],
          ["component", "telemetry-processor", "wins instances"]
        ],
        values: [
          ["/identity/site", "dallas", "site/dallas", "Locked because target binding and runtime identity must match."],
          ["/heartbeat/intervalSecs", "10", "line/filling-line-7", "Overrides enterprise default of 30 for high-rate processor visibility."],
          ["/messaging/local/broker", "tcp://emqx.edge.svc:1883", "site/dallas + target facet", "Rendered by the selected Greengrass target standard."],
          ["/component/instances/archive/streaming/buffer/maxDiskBytes", "1073741824", "component/telemetry-processor", "Leaf value affects Greengrass artifact path, file permissions, and smoke evidence."]
        ]
      },
      {
        kind: "table",
        title: "Ownership and editability",
        headers: ["Layer", "Editable here", "Review owner", "Typical fields"],
        rows: [
          ["enterprise", "no", "platform architecture", "schema profile, topic conventions, policy defaults"],
          ["site", "yes", "site operations", "identity, local broker, time zone, observability target"],
          ["line", "yes", "line owner", "heartbeat cadence, hierarchy labels, component defaults"],
          ["device", "limited", "edge operations", "target binding, filesystem paths, resource caps"],
          ["component", "yes", "component owner", "instances, routes, commands, buffer settings"]
        ]
      },
      {
        kind: "list",
        title: "Conflict and safety handling",
        items: [
          ["Blocked override", "A device layer attempted to change /identity/site to dallas-test; the policy blocks it because target identity would no longer match deployment binding."],
          ["Explain before raw", "The first click shows ownership, winning layer, overridden values, affected artifacts, and validation status. Raw JSON is one drawer deeper."],
          ["Atomic reload", "An invalid catalog is rejected at the ConfigComponent. If the resulting lineage or merged effective config fails validation at the client, the component keeps its previous effective config and does not notify listeners."]
        ]
      },
      {
        kind: "code",
        title: "Runtime wire shape",
        label: "CONFIG_COMPONENT lineage bundle, exactly as shipped",
        code: `{\n  "lineageVersion": 1,\n  "catalogVersion": "dallas-line-7-v14",\n  "component": "telemetry-processor",\n  "provenance": { "source": "file", "uri": "/etc/edgecommons/catalog.json" },\n  "layers": [\n    { "id": "enterprise/acme", "kind": "scope",\n      "scope": { "enterprise": "acme" },\n      "config": { "heartbeat": { "intervalSecs": 30 } } },\n    { "id": "site/dallas", "kind": "scope",\n      "scope": { "enterprise": "acme", "site": "dallas" },\n      "config": { "identity": { "site": "dallas" } } },\n    { "id": "line/filling-line-7", "kind": "scope",\n      "scope": { "enterprise": "acme", "site": "dallas", "line": "filling-line-7" },\n      "config": { "heartbeat": { "intervalSecs": 10 } } },\n    { "id": "component/telemetry-processor", "kind": "component",\n      "component": "telemetry-processor",\n      "config": { "component": { "token": "telemetry-processor", "instances": [] } } }\n  ]\n}\n\n// The bundle carries no per-layer hash and no effectiveHash. The\n// layer and effective hashes this screen shows are computed by the\n// Studio over the authored layer files, and live in release evidence.`
      }
    ]
  },
  component: {
    title: "Component editor",
    status: "selected: telemetry-processor",
    path: "Draft deploy/add-file-replicator / Component telemetry-processor",
    summary: "A component edit focuses on business intent, runtime service needs, target compatibility, and the effective EdgeCommons config leaf that will be merged into the hierarchy.",
    action: "Validate component",
    tree: [
      ["Component", "telemetry-processor", "Rust"],
      ["Artifact", "1.4.2", "signed"],
      ["Instance", "archive", "dirty"],
      ["Command", "reload-routes", "enabled"],
      ["Secret ref", "northbound/api-token", "external"]
    ],
    targets: ["Greengrass revision", "configurationUpdate", "accessControl review"],
    inspectorTitle: "Selected instance: archive",
    inspector: [
      "Changing buffer size affects persistent storage for the selected Greengrass target standard.",
      "Command verbs are rendered as EdgeCommons command metadata, not ad hoc scripts.",
      "Secret values are never stored; only provider references are allowed."
    ],
    panels: [
      {
        kind: "form",
        size: "wide",
        title: "Instance form",
        fields: [
          ["Instance id", "archive", "Stable runtime identity used in topics and health."],
          ["Input class", "southbound.signal.update", "Must match publisher contract."],
          ["Script engine", "Rhai", "Rendered as component config; no platform artifact difference."],
          ["Durable buffer", "1 GiB", "Creates storage impact in the Greengrass recipe and deployment configuration."],
          ["Northbound token", "secret://prod/northbound/api-token", "Reference only; value is resolved by the target runtime."]
        ]
      },
      {
        kind: "table",
        title: "Selected target impact",
        headers: ["Area", "Impact", "Generated controls", "Operator note"],
        rows: [
          ["Configuration", "deployment revision", "configurationUpdate merge/reset", "review effective config before promotion"],
          ["Storage", "artifact path and file permission change", "recipe lifecycle env, runWith, artifact directory", "lab smoke required"],
          ["Messaging", "IPC authorization review", "accessControl topic map", "TES role unchanged"]
        ]
      },
      {
        kind: "list",
        title: "Expected controls",
        items: [
          ["Schema-aware form", "Fields come from the component schema and shared EdgeCommons config schema, with allowed values and examples inline."],
          ["Diff by effect", "The right rail says restart, storage, permission, or network before showing YAML."],
          ["Escape hatch", "A raw JSON editor exists for advanced users but must still validate through the same model and policies."]
        ]
      },
      {
        kind: "code",
        title: "Component leaf preview",
        label: "component layer",
        code: `component:\n  instances:\n    - id: archive\n      inputClass: southbound.signal.update\n      scripting:\n        engine: rhai\n      streaming:\n        buffer:\n          maxDiskBytes: 1073741824\n      northbound:\n        tokenRef: secret://prod/northbound/api-token`
      }
    ]
  },
  render: {
    title: "Render review",
    status: "mode: generate-only",
    path: "Draft deploy/add-file-replicator / Render preview",
    summary: "The renderer turns one desired-state definition into platform-native artifacts for the selected target standard. The UI groups output by operational consequence before showing raw files.",
    action: "Render again",
    tree: [
      ["Render set", "deploy/add-file-replicator", "hash dirty"],
      ["Target standard", "Greengrass", "enterprise default"],
      ["Artifacts", "recipe + deployment", "revision"],
      ["Evidence", "lab smoke", "required"],
      ["Release lock", "not promoted", "draft"]
    ],
    targets: ["Greengrass standard", "4 artifacts", "2 warnings"],
    inspectorTitle: "Selected consequence: storage",
    inspector: [
      "The durable-stream requirement is rendered as a Greengrass artifact path and lifecycle configuration.",
      "A storage change requires Greengrass lab smoke evidence before promotion.",
      "Raw artifacts are attached below the consequence summary."
    ],
    panels: [
      {
        kind: "matrix",
        size: "wide",
        title: "Selected-target artifact review",
        platforms: [
          ["GREENGRASS recipe", "recipe.yaml and accessControl report", "component deployment revision", "artifact URI, IPC policy, and runWith"],
          ["GREENGRASS deployment", "one deployment.json and configurationUpdate per thing", "per-thing deployment revision", "merge/reset safety and rollback lock"],
          ["IaC handshake", "module inputs or external output references", "no direct cloud ownership unless enabled", "thing ARNs, artifact bucket, and role bindings"]
        ]
      },
      {
        kind: "table",
        title: "Changes by consequence",
        headers: ["Consequence", "Greengrass artifact", "Runtime/apply effect", "Evidence"],
        rows: [
          ["Revision", "recipe.yaml", "nucleus deploys new component revision", "recipe lint + lab deploy"],
          ["Storage", "artifact path + recipe env", "component writes to configured durable path", "file permission smoke"],
          ["Permission", "accessControl report", "SubscribeToTopic warning", "policy review"],
          ["Config", "deployment.json", "configurationUpdate merge", "effective config hash"]
        ]
      },
      {
        kind: "list",
        title: "Why this screen reduces complexity",
        items: [
          ["Consequence first", "Operators compare restart, storage, permission, and config impact before reading YAML."],
          ["Stable hashes", "Every generated file is hashable and tied to the release lock."],
          ["Target focus", "The normal review stays on the selected target standard; exceptions open their own focused review."]
        ]
      },
      {
        kind: "code",
        title: "Output tree",
        label: "generated artifacts",
        code: `render/\n  release-lock.json\n  greengrass/\n    recipe.yaml\n    gdk-config.json\n    deployment.json\n    access-control-report.json\n  iac/\n    greengrass-target-inputs.json`
      }
    ]
  },
  drift: {
    title: "Drift",
    status: "analysis: 1 warning, 0 blockers",
    path: "Draft deploy/add-file-replicator / Drift review",
    summary: "The UI separates four kinds of disagreement: source definition drift, rendered artifact drift, target applied-state drift, and runtime evidence drift.",
    action: "Create plan",
    tree: [
      ["Definition", "Git branch", "dirty"],
      ["Artifacts", "render hash", "changed"],
      ["Target", "Greengrass applied state", "one pending"],
      ["Runtime", "edge evidence", "fresh"],
      ["Audit", "append event", "ready"]
    ],
    targets: ["Definition changed", "Greengrass pending", "Runtime fresh"],
    inspectorTitle: "Selected drift: Greengrass deployment",
    inspector: [
      "The repository contains a promoted Greengrass deployment artifact, but two of the seven target things have not converged to their deployment id. Because targets are per-thing, drift is reported per node rather than as one group verdict.",
      "Because runtime health is fresh, this is an apply/reconcile issue rather than component failure.",
      "The plan can watch Greengrass deployment status or produce an apply request, depending on environment policy."
    ],
    panels: [
      {
        kind: "drift",
        size: "wide",
        title: "Drift ledger",
        entries: [
          ["Definition drift", "warning", "Draft branch changes component graph and hierarchy layer leaf. Not promoted."],
          ["Artifact drift", "warning", "Kubernetes desired manifests are newer than applied cluster resources."],
          ["Target drift", "warning", "The Greengrass deployment service has not reported the expected deployment id for gw-fill-03 and gw-fill-06."],
          ["Runtime drift", "pass", "EdgeConsole telemetry shows fresh keepalive and matching effective config hash."]
        ]
      },
      {
        kind: "table",
        title: "Plan actions",
        headers: ["Action", "Owner", "Mode", "Evidence required"],
        rows: [
          ["Render preview", "platform", "local", "schema + semantic pass"],
          ["Greengrass deploy", "edge ops", "controlled apply", "deployment SUCCEEDED + IPC smoke"],
          ["Watch deployment", "edge ops", "external status", "Greengrass deployment status and nucleus report"],
          ["Runtime reconcile", "site ops", "observe", "edge-console keepalive and effective config hash"]
        ]
      },
      {
        kind: "list",
        title: "Plan UX rules",
        items: [
          ["No hidden apply", "Generate-only and apply-capable modes are visually distinct."],
          ["Evidence sticks to rows", "Each warning links to the generated file, policy rule, target object, and runtime metric."],
          ["Rollback is first-class", "The previous release lock and artifacts are shown before promotion, not after failure."]
        ]
      },
      {
        kind: "code",
        title: "Plan summary",
        label: "machine-readable",
        code: `plan:\n  mode: generate-only\n  warnings:\n    - id: greengrass.deployment-drift\n      target: greengrass/dallas-prod\n      evidence: greengrass.deployment.inProgress\n  blockers: []\n  rollbackLock: deploy-prod-2026-07-02`
      }
    ]
  },
  release: {
    title: "Release gate",
    status: "apply disabled until approval",
    path: "Draft deploy/add-file-replicator / Promote",
    summary: "Promotion is a protected action lane. The UI should make approvals, evidence, credentials, target mode, audit, and rollback impossible to miss.",
    action: "Request approval",
    tree: [
      ["Gate", "schema", "pass"],
      ["Gate", "semantic policy", "warn"],
      ["Gate", "render lint", "pass"],
      ["Gate", "target smoke", "missing"],
      ["Gate", "approval", "waiting"]
    ],
    targets: ["2 approvals needed", "Greengrass smoke missing", "apply locked"],
    inspectorTitle: "Selected gate: target smoke",
    inspector: [
      "Greengrass lab smoke is missing for the changed recipe and deployment configuration.",
      "Runtime health from the previous release is attached and current.",
      "Apply controls remain disabled until missing evidence and approvals are cleared."
    ],
    panels: [
      {
        kind: "gates",
        size: "wide",
        title: "Evidence gates",
        gates: [
          ["Source schema", "pass", "Deployment schema and generated effective runtime configs validate."],
          ["Semantic policy", "warn", "Greengrass subscription scope is broader than generated topic map."],
          ["Render lint", "pass", "All JSON, YAML, INI, and recipe outputs parse with stable hashes."],
          ["IaC policy", "pass", "Terraform/CDK/GitOps plan output has no deny findings."],
          ["Supply chain", "pass", "Artifacts are signed and SBOM references are attached."],
          ["Target smoke", "missing", "Kubernetes smoke has not been run for this render hash."],
          ["Runtime health", "pass", "Previous release is healthy; rollback lock is ready."]
        ]
      },
      {
        kind: "table",
        title: "Approval lane",
        headers: ["Approval", "Required when", "Current state", "What approver sees"],
        rows: [
          ["Platform owner", "all production releases", "waiting", "render review, target plan, rollback lock"],
          ["Security owner", "policy warnings", "waiting", "ACL warning, IaC policy input, mitigations"],
          ["Site operations", "Greengrass deployment", "scheduled", "per-node impact list and rollback lock"],
          ["Component owner", "component schema or route change", "approved", "component diff and smoke result"]
        ]
      },
      {
        kind: "list",
        title: "Apply semantics",
        items: [
          ["Generate-only", "Default mode writes artifacts and evidence to Git, then external platforms deploy them."],
          ["Delegated apply", "The platform can call the selected target runner only from a promoted ReleaseLock."],
          ["Audit before dispatch", "The audit record is appended before an irreversible deployment API call is made."],
          ["Rollback visibility", "The previous release lock, artifacts, and target health are displayed in the action lane."]
        ]
      },
      {
        kind: "code",
        title: "Audit event preview",
        label: "append-before-dispatch",
        code: `event: deployment.release.requested\nreleaseLock: deploy-prod-2026-07-08\nactor: user@example.com\nmode: delegated-apply\ntargets: [greengrass]\nevidenceHash: sha256:fb91...\nrollbackLock: deploy-prod-2026-07-02`
      }
    ]
  }
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function renderPlatform(platform) {
  const data = platformData[platform];
  qs("#platformCard").innerHTML = `
    <div class="platform-head">
      <div>
        <h3>${platform}</h3>
        <p>${data.summary}</p>
      </div>
      <span class="platform-token ${platform}">${platform}</span>
    </div>
    <div class="metric-grid">
      ${data.facts.map(([label, value]) => `
        <div class="metric-tile">
          <small>${label}</small>
          <b>${value}</b>
        </div>
      `).join("")}
    </div>
    <div class="source-note">${data.source}</div>
  `;
}

function setStation(id) {
  qsa(".station").forEach((node) => node.classList.toggle("active-station", node.dataset.station === id));
  const data = stationData[id];
  qs("#stationReadout").innerHTML = `<b>${data.title}</b><p>${data.body}</p>`;
}

function lineBetween(a, b) {
  const graph = qs("#modelGraph");
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  const gr = graph.getBoundingClientRect();
  const ax = ar.left + ar.width / 2 - gr.left;
  const ay = ar.top + ar.height / 2 - gr.top;
  const bx = br.left + br.width / 2 - gr.left;
  const by = br.top + br.height / 2 - gr.top;
  const length = Math.hypot(bx - ax, by - ay);
  const angle = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
  const line = document.createElement("span");
  line.className = "model-link";
  line.style.left = `${ax}px`;
  line.style.top = `${ay}px`;
  line.style.width = `${length}px`;
  line.style.transform = `rotate(${angle}deg)`;
  return line;
}

function renderModelGraph() {
  const graph = qs("#modelGraph");
  graph.innerHTML = "";
  modelNodes.forEach((node) => {
    const button = document.createElement("button");
    button.className = "model-node";
    button.dataset.node = node.id;
    button.style.left = `${node.x}%`;
    button.style.top = `${node.y}%`;
    button.innerHTML = `${node.label}<small>${node.sub}</small>`;
    button.addEventListener("click", () => setModelDetail(node.id));
    graph.appendChild(button);
  });
  requestAnimationFrame(() => {
    const nodeById = Object.fromEntries(qsa(".model-node", graph).map((node) => [node.dataset.node, node]));
    modelLinks.forEach(([from, to]) => graph.prepend(lineBetween(nodeById[from], nodeById[to])));
  });
  setModelDetail("definition");
}

function setModelDetail(id) {
  qsa(".model-node").forEach((node) => node.classList.toggle("active", node.dataset.node === id));
  const node = modelNodes.find((item) => item.id === id);
  qs("#modelDetail").innerHTML = `
    <h3>${node.label}</h3>
    <p>${node.detail}</p>
    <ul>${node.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

function renderTimeline(active = "draft") {
  qs("#timeline").innerHTML = timelineData.map((item) => `
    <button data-timeline="${item.id}" class="${item.id === active ? "active" : ""}">
      <b>${item.title}</b>
      <span>${item.meta}</span>
    </button>
  `).join("");
  qsa("[data-timeline]").forEach((button) => {
    button.addEventListener("click", () => renderTimeline(button.dataset.timeline));
  });
  const item = timelineData.find((entry) => entry.id === active);
  qs("#definitionDiff").textContent = item.definition;
  qs("#renderedDiff").textContent = item.rendered;
}

function renderRenderer(platform = "HOST") {
  const data = rendererData[platform];
  qs("#rendererBody").innerHTML = `
    <div class="renderer-copy">
      <h3 class="renderer-title">${data.title}</h3>
      <p>${data.body}</p>
      <div class="artifact-grid">
        ${data.artifacts.map(([name, desc]) => `
          <div class="artifact-card">
            <small>${name}</small>
            <p>${desc}</p>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="artifact-preview">
      <span class="code-label">render preview</span>
      <pre>${escapeHtml(data.preview)}</pre>
    </div>
  `;
}

function renderValidation(active = 0) {
  qs("#validationLadder").innerHTML = validationData.map((item, index) => `
    <button class="check-card ${index === active ? "active" : ""}" data-check="${index}">
      <span class="check-number">${index + 1}</span>
      <span><b>${item.title}</b></span>
    </button>
  `).join("");
  qsa("[data-check]").forEach((button) => {
    button.addEventListener("click", () => renderValidation(Number(button.dataset.check)));
  });
  const item = validationData[active];
  qs("#validationDetail").innerHTML = `
    <h3>${item.title}</h3>
    <p>${item.detail}</p>
    <ul>${item.examples.map((example) => `<li>${example}</li>`).join("")}</ul>
  `;
}

function renderWorkflow(active = 0) {
  qs("#workflowList").innerHTML = workflowData.map((item, index) => `
    <button class="workflow-button ${index === active ? "active" : ""}" data-workflow="${index}">
      <small>${item.group}</small>
      <b>${item.title}</b>
      <span>${item.note}</span>
    </button>
  `).join("");
  qsa("[data-workflow]").forEach((button) => {
    button.addEventListener("click", () => renderWorkflow(Number(button.dataset.workflow)));
  });
  const item = workflowData[active];
  const groups = [...new Set(workflowData.map((entry) => entry.group))];
  qs("#wireContent").innerHTML = `
    <div class="wire-title">
      <div>
        <h3>${item.title}</h3>
        <p>${item.note}</p>
      </div>
      <a class="mock-deep-link" href="${item.route}">open mock screen</a>
    </div>
    <div class="studio-preview" aria-label="${item.title} interaction treatment">
      <aside class="studio-rail">
        ${groups.map((group) => `
          <div class="studio-nav-group">
            <b>${group}</b>
            ${workflowData.filter((entry) => entry.group === group).map((entry, index) => {
              const originalIndex = workflowData.indexOf(entry);
              return `<button class="studio-nav-item ${originalIndex === active ? "selected" : ""}" data-workflow="${originalIndex}">${entry.title}</button>`;
            }).join("")}
          </div>
        `).join("")}
      </aside>
      <main class="studio-main">
        <div class="studio-toolbar">
          <div>
            <span class="studio-kicker">${item.status}</span>
            <h4>${item.title}</h4>
            <p>${item.scope}</p>
          </div>
          <div class="studio-actions">
            <span>draft branch</span>
            <button>review</button>
          </div>
        </div>
        <div class="studio-work-area">
          <section class="studio-canvas">
            <span class="code-label">primary work area</span>
            <h5>${item.primary}</h5>
            <div class="surface-rows">
              ${item.secondary.map((detail, index) => `
                <div class="surface-row">
                  <span>${index + 1}</span>
                  <p>${detail}</p>
                </div>
              `).join("")}
            </div>
          </section>
          <aside class="studio-inspector">
            <span class="code-label">inspector</span>
            <h5>What stays visible</h5>
            <ul>
              ${item.inspector.map((detail) => `<li>${detail}</li>`).join("")}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  `;
  qsa(".studio-nav-item").forEach((button) => {
    button.addEventListener("click", () => renderWorkflow(Number(button.dataset.workflow)));
  });
}

function renderIac(kind = "terraform") {
  const data = iacData[kind];
  qs("#iacPanel").innerHTML = `
    <div>
      <h4>${data.title}</h4>
      <p>${data.body}</p>
      <ul>${data.responsibilities.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="iac-output">
      <span class="code-label">integration shape</span>
      <pre>${escapeHtml(data.preview)}</pre>
    </div>
  `;
}

function renderRuntime(tier = "laptop") {
  const data = runtimeData[tier];
  qs("#runtimePanel").innerHTML = `
    <div>
      <h4>${data.title} <span class="runtime-cost">${escapeHtml(data.cost)}</span></h4>
      <p>${data.body}</p>
      <ul>${data.runs.map((item) => `<li>${item}</li>`).join("")}</ul>
      <table class="port-table">
        <thead><tr><th>Port</th><th>Adapter bound in this tier</th></tr></thead>
        <tbody>
          ${data.ports.map(([port, adapter]) => `<tr><td>${escapeHtml(port)}</td><td>${escapeHtml(adapter)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="iac-output">
      <span class="code-label">how it is started</span>
      <pre>${escapeHtml(data.preview)}</pre>
    </div>
  `;
}

function renderGate(active = 0) {
  qs("#gateList").innerHTML = gateData.map((item, index) => `
    <button class="gate-button ${index === active ? "active" : ""}" data-gate="${index}">
      <b>${item.title}</b>
      <span class="gate-state ${item.state === "warn" ? "warn" : ""}">${item.state}</span>
    </button>
  `).join("");
  qsa("[data-gate]").forEach((button) => {
    button.addEventListener("click", () => renderGate(Number(button.dataset.gate)));
  });
  const item = gateData[active];
  qs("#gateDetail").innerHTML = `
    <h4>${item.title}</h4>
    <p>${item.summary}</p>
    <ul>${item.checks.map((check) => `<li>${check}</li>`).join("")}</ul>
    <div class="gate-output">
      <span class="code-label">evidence sample</span>
      <pre>${escapeHtml(item.sample)}</pre>
    </div>
  `;
}

function renderMock(screen = "firstRun") {
  const target = qs("#mockScreen");
  if (!target) return;
  const data = mockScreens[screen] || mockScreens.inventory;
  target.innerHTML = `
    <div class="mock-app">
      <div class="mock-app-top">
        <div class="mock-context">
          <span>Deployment Studio</span>
          <h4>${escapeHtml(data.title)}</h4>
          <p>${escapeHtml(data.path)}</p>
        </div>
        <div class="mock-actions">
          <span class="status-pill">${escapeHtml(data.status)}</span>
          <button type="button">${escapeHtml(data.action)}</button>
        </div>
      </div>
      <div class="mock-app-body">
        <aside class="mock-tree" aria-label="Mock fleet tree">
          ${renderMockTree(data.tree)}
        </aside>
        <main class="mock-canvas">
          <div class="mock-canvas-header">
            <p>${escapeHtml(data.summary)}</p>
            <div>${data.targets.map((target) => `<span class="target-chip">${escapeHtml(target)}</span>`).join("")}</div>
          </div>
          <div class="mock-panels">
            ${data.panels.map(renderMockPanel).join("")}
          </div>
        </main>
        <aside class="mock-inspector" aria-label="Mock inspector">
          <span>Inspector</span>
          <h5>${escapeHtml(data.inspectorTitle)}</h5>
          <ul>
            ${data.inspector.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </aside>
      </div>
    </div>
  `;
}

function renderMockTree(tree = []) {
  return tree.map(([kind, label, status], index) => `
    <div class="mock-tree-item ${index === tree.length - 1 ? "active" : ""}">
      <small>${escapeHtml(kind)}</small>
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(status)}</span>
    </div>
  `).join("");
}

function renderMockPanel(panel) {
  const size = panel.size ? ` ${panel.size}` : "";
  const eyebrow = panel.eyebrow ? `<span class="panel-eyebrow">${escapeHtml(panel.eyebrow)}</span>` : "";
  return `
    <section class="mock-panel${size}">
      ${eyebrow}
      <h5>${escapeHtml(panel.title)}</h5>
      ${renderPanelBody(panel)}
    </section>
  `;
}

function renderPanelBody(panel) {
  if (panel.kind === "list") {
    return `<div class="mock-list">${panel.items.map(([title, body]) => `
      <article>
        <b>${escapeHtml(title)}</b>
        <p>${escapeHtml(body)}</p>
      </article>
    `).join("")}</div>`;
  }

  if (panel.kind === "table") {
    return `
      <div class="mock-table-wrap">
        <table class="mock-table">
          <thead><tr>${panel.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${panel.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  if (panel.kind === "code") {
    return `
      <div class="mock-code">
        <span>${escapeHtml(panel.label)}</span>
        <pre>${escapeHtml(panel.code)}</pre>
      </div>
    `;
  }

  if (panel.kind === "map") {
    return `
      <div class="mock-topology">
        <div class="mock-map-nodes">
          ${panel.nodes.map(([name, role, note]) => `
            <article>
              <b>${escapeHtml(name)}</b>
              <span>${escapeHtml(role)}</span>
              <p>${escapeHtml(note)}</p>
            </article>
          `).join("")}
        </div>
        <div class="mock-edge-list">
          ${panel.edges.map((edge) => `<span>${escapeHtml(edge)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  if (panel.kind === "lineage") {
    return `
      <div class="lineage-strip">
        ${panel.nodes.map(([scope, label, status]) => `
          <article>
            <small>${escapeHtml(scope)}</small>
            <b>${escapeHtml(label)}</b>
            <span>${escapeHtml(status)}</span>
          </article>
        `).join("")}
      </div>
      <div class="value-stack">
        ${panel.values.map(([path, value, source, note]) => `
          <article>
            <small>${escapeHtml(path)}</small>
            <b>${escapeHtml(value)}</b>
            <span>${escapeHtml(source)}</span>
            <p>${escapeHtml(note)}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  if (panel.kind === "form") {
    return `<div class="mock-form">${panel.fields.map(([label, value, help]) => `
      <label>
        <span>${escapeHtml(label)}</span>
        <b>${escapeHtml(value)}</b>
        <em>${escapeHtml(help)}</em>
      </label>
    `).join("")}</div>`;
  }

  if (panel.kind === "matrix") {
    return `<div class="render-matrix">${panel.platforms.map(([platform, artifacts, apply, risk]) => `
      <article>
        <b>${escapeHtml(platform)}</b>
        <p>${escapeHtml(artifacts)}</p>
        <span>${escapeHtml(apply)}</span>
        <small>${escapeHtml(risk)}</small>
      </article>
    `).join("")}</div>`;
  }

  if (panel.kind === "drift") {
    return `<div class="drift-ledger">${panel.entries.map(([title, state, body]) => `
      <article class="${state}">
        <span>${escapeHtml(state)}</span>
        <b>${escapeHtml(title)}</b>
        <p>${escapeHtml(body)}</p>
      </article>
    `).join("")}</div>`;
  }

  if (panel.kind === "gates") {
    return `<div class="release-gates">${panel.gates.map(([title, state, body]) => `
      <article class="${state}">
        <span>${escapeHtml(state)}</span>
        <b>${escapeHtml(title)}</b>
        <p>${escapeHtml(body)}</p>
      </article>
    `).join("")}</div>`;
  }

  return "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function wireInteractions() {
  qsa("[data-platform]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-platform]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderPlatform(button.dataset.platform);
    });
  });

  qsa(".station").forEach((node) => {
    node.addEventListener("click", () => setStation(node.dataset.station));
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setStation(node.dataset.station);
      }
    });
  });

  qsa("[data-renderer]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-renderer]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderRenderer(button.dataset.renderer);
    });
  });

  qsa("[data-iac]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-iac]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderIac(button.dataset.iac);
    });
  });

  qsa("[data-runtime]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-runtime]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderRuntime(button.dataset.runtime);
    });
  });

  qsa("[data-mock]").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("[data-mock]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      renderMock(button.dataset.mock);
    });
  });

  const sections = qsa("main section[id]");
  const navLinks = qsa(".topbar nav a");
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { threshold: [0.2, 0.4, 0.6] });
  sections.forEach((section) => observer.observe(section));
}

renderPlatform("HOST");
renderModelGraph();
renderTimeline();
renderRenderer("HOST");
renderValidation();
renderWorkflow();
renderIac();
renderRuntime();
renderGate();
renderMock();
wireInteractions();

window.addEventListener("resize", () => {
  renderModelGraph();
});
