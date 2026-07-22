const previews = {
  host: `host-bundle/
  supervisor/filling-line.conf
  config/telemetry-processor.json
  scripts/stage.ps1
  checksums.sha256

apply: stage -> verify -> supervisorctl update -> health`,
  kubernetes: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: telemetry-processor
spec:
  template:
    metadata:
      annotations:
        edgecommons.io/config-hash: sha256:7a4dd1`,
  greengrass: `RecipeFormatVersion: "2020-01-25"
ComponentName: "com.mbreissi.edgecommons.TelemetryProcessor"
ComponentVersion: "1.4.2"
Manifests:
  - Platform:
      os: linux
    Artifacts:
      - URI: "s3://acme-edge-artifacts/telemetry-processor/1.4.2/telemetry-processor"
    Lifecycle:
      Install:
        Script: "chmod +x {artifacts:path}/telemetry-processor"
      Run:
        Script: "{artifacts:path}/telemetry-processor --platform GREENGRASS -c GG_CONFIG"`
};

const filePreviews = {
  host: previews.host,
  kubernetes: previews.kubernetes,
  greengrass: previews.greengrass,
  greengrassDeployment: `{
  "targetArn": "arn:aws:iot:us-east-1:123456789012:thing/gw-fill-01",
  "deploymentName": "deploy-prod-2026-07-08",
  "components": {
    "com.mbreissi.edgecommons.TelemetryProcessor": {
      "componentVersion": "1.4.2",
      "configurationUpdate": {
        "merge": "{\\"ComponentConfig\\":{\\"heartbeat\\":{\\"intervalSecs\\":10}}}"
      }
    }
  }
}`,
  greengrassAccess: `{
  "component": "com.mbreissi.edgecommons.TelemetryProcessor",
  "finding": "subscription scope broader than derived topic map",
  "requiredApproval": "security-owner",
  "status": "warning"
}`,
  effective: `{
  "hierarchy": { "levels": ["enterprise", "site", "building", "area", "line", "device"] },
  "identity": { "enterprise": "acme", "site": "dallas", "building": "north", "area": "bottling", "line": "filling-line-7" },
  "heartbeat": { "intervalSecs": 10 },
  "messaging": {
    "local": { "host": "emqx.edge.svc", "port": 1883 }
  },
  "component": {
    "token": "telemetry-processor",
    "instances": [{ "id": "archive" }]
  }
}`,
  layers: `id: line/filling-line-7
kind: scope
scope:
  enterprise: acme
  site: dallas
  building: north
  area: bottling
  line: filling-line-7
owner: line owner
config:
  heartbeat:
    intervalSecs: 10`,
  lock: `{
  "release": "deploy-prod-2026-07-08",
  "sourceCommit": "4b91a3e",
  "standardTarget": "greengrass",
  "exceptionTargets": [],

  // A correlation envelope, not an atomic apply unit: it records what
  // was in effect together. Either stream can move, and roll back, alone.
  "configStream": {
    "catalogVersion": "dallas-line-7-v14",
    "effectiveHash": "sha256:7a4dd1",
    "rollbackTarget": "dallas-line-7-v13"
  },
  "artifactStream": {
    "componentVersion": "1.4.2",
    "renderHash": "sha256:2fc1e9",
    "rollbackTarget": "1.4.1"
  },

  "nodes": ["gw-fill-01", "gw-fill-02", "gw-fill-03"]
}`
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function activateWithin(button, selector) {
  const group = button.closest("[data-select-group]") || button.parentElement;
  qsa(selector, group).forEach((item) => item.classList.toggle("active", item === button));
}

function setupChoices() {
  qsa("[data-select-group] .selectable, [data-select-group] .target-card").forEach((button) => {
    button.addEventListener("click", () => {
      activateWithin(button, ".selectable, .target-card");
      const previewTarget = button.dataset.previewTarget;
      const preview = button.dataset.preview;
      if (previewTarget && preview && qs(previewTarget)) {
        qs(previewTarget).textContent = previews[preview] || preview;
      }
      const targetLabel = button.dataset.targetLabel;
      if (targetLabel) {
        qsa("[data-current-target]").forEach((node) => { node.textContent = targetLabel; });
        qsa("[data-standard-render-tab]").forEach((node) => {
          node.textContent = targetLabel;
          if (preview) node.dataset.code = preview;
        });
      }
    });
  });
}

function setupRows() {
  qsa("[data-row-detail]").forEach((row) => {
    row.addEventListener("click", () => {
      const table = row.closest("table");
      if (table) qsa("[data-row-detail]", table).forEach((item) => item.classList.toggle("active", item === row));
      const detailTarget = qs(row.dataset.detailTarget || "[data-selected-detail]");
      if (detailTarget) detailTarget.textContent = row.dataset.rowDetail;
    });
  });
}

function setupFleetSelection() {
  const buttons = qsa("[data-fleet-select]");
  if (!buttons.length) return;

  function showSelection(id) {
    buttons.forEach((button) => {
      const active = button.dataset.fleetSelect === id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    qsa("[data-fleet-panel]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.fleetPanel === id);
    });
    qsa("[data-fleet-inspector]").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.fleetInspector === id);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => showSelection(button.dataset.fleetSelect));
  });

  const active = buttons.find((button) => button.classList.contains("active")) || buttons[0];
  showSelection(active.dataset.fleetSelect);
}

function setupCodeTabs() {
  qsa("[data-code]").forEach((button) => {
    button.addEventListener("click", () => {
      activateWithin(button, "button");
      qsa("button", button.parentElement).forEach((item) => {
        item.setAttribute("aria-selected", item === button ? "true" : "false");
      });
      const target = qs(button.dataset.codeTarget || "[data-code-preview]");
      if (target) target.textContent = filePreviews[button.dataset.code] || "";
    });
  });
}

function setupChecklist() {
  const progress = qs("[data-setup-progress]");
  if (!progress) return;
  qsa("[data-step-check]").forEach((input) => {
    input.addEventListener("change", () => {
      const checked = qsa("[data-step-check]").filter((item) => item.checked).length;
      progress.textContent = `${checked} of ${qsa("[data-step-check]").length} setup prerequisites selected`;
    });
  });
}

function setupModeControls() {
  qsa("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      activateWithin(button, "button");
      const target = qs("[data-mode-readout]");
      if (target) target.textContent = button.dataset.mode;
    });
  });
}

function setTextOrValue(node, value) {
  if ("value" in node) {
    node.value = value;
  } else {
    node.textContent = value;
  }
}

function setupScopeSelector() {
  qsa("[data-scope-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const root = button.closest("[data-scope-root]") || document;
      qsa("[data-scope-select]", root).forEach((item) => item.classList.toggle("active", item === button));
      const label = button.dataset.scopeLabel || "";
      const detail = button.dataset.scopeDetail || "";
      const owner = button.dataset.scopeOwner || "";
      const mode = button.dataset.scopeMode || "";
      qsa("[data-scope-title], [data-scope-readout], [data-scope-input]", root).forEach((node) => setTextOrValue(node, label));
      qsa("[data-scope-detail-readout]", root).forEach((node) => { node.textContent = detail; });
      qsa("[data-scope-owner]", root).forEach((node) => { node.textContent = owner; });
      qsa("[data-scope-mode]", root).forEach((node) => { node.textContent = mode; });
    });
  });
}

function setupInstanceSelector() {
  qsa("[data-instance-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const root = button.closest("[data-instance-root]") || document;
      qsa("[data-instance-select]", root).forEach((item) => item.classList.toggle("active", item === button));
      const label = button.dataset.instanceLabel || "";
      const detail = button.dataset.instanceDetail || "";
      qsa("[data-selected-instance]").forEach((node) => { node.textContent = label; });
      qsa("[data-selected-instance-detail]").forEach((node) => { node.textContent = detail; });
    });
  });
}

function updateAssignedCount(root = document) {
  const count = qsa("[data-component-added]", root).filter((input) => input.checked).length;
  const label = `${count} assigned`;
  qsa("[data-assigned-count]").forEach((node) => { node.textContent = label; });
}

function selectComponentOption(row) {
  qsa("[data-component-option]", row.closest("[data-component-catalog]") || document).forEach((item) => item.classList.toggle("active", item === row));
  const detailTarget = qs("[data-selected-detail]");
  if (detailTarget) detailTarget.textContent = row.dataset.rowDetail || "";
  const mappings = [
    ["[data-config-component]", row.dataset.componentName],
    ["[data-config-instance]", row.dataset.componentInstance],
    ["[data-config-layer]", row.dataset.componentLayer],
    ["[data-config-input]", row.dataset.componentInput],
    ["[data-config-storage]", row.dataset.componentStorage],
    ["[data-config-health]", row.dataset.componentHealth]
  ];
  mappings.forEach(([selector, value]) => {
    qsa(selector).forEach((node) => setTextOrValue(node, value || ""));
  });
}

function setupComponentAssignments() {
  qsa("[data-component-option]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("[data-component-added]")) return;
      selectComponentOption(row);
    });
    const checkbox = qs("[data-component-added]", row);
    if (!checkbox) return;
    checkbox.addEventListener("change", () => {
      selectComponentOption(row);
      const status = qs("[data-component-status]", row);
      const label = checkbox.closest("label")?.querySelector("span");
      if (checkbox.checked) {
        if (status) {
          status.textContent = row.dataset.componentName === "opcua-adapter" ? "needs config" : "assigned";
          status.className = row.dataset.componentName === "opcua-adapter" ? "state warn" : "state pass";
        }
        if (label) label.textContent = "added";
      } else {
        if (status) {
          status.textContent = "available";
          status.className = "state";
        }
        if (label) label.textContent = "add";
      }
      updateAssignedCount(row.closest("[data-wizard-panel]") || document);
    });
  });
  updateAssignedCount();
}

function setupWizard() {
  const wizard = qs("[data-wizard]");
  if (!wizard) return;
  const steps = qsa("[data-wizard-go]", wizard);
  const panels = qsa("[data-wizard-panel]", wizard);
  const previous = qs("[data-wizard-prev]", wizard);
  const next = qs("[data-wizard-next]", wizard);
  const currentStep = qs("[data-current-step]", wizard);
  if (!steps.length || !panels.length) return;

  const hashKey = window.location.hash.replace(/^#/, "");
  const hashIndex = steps.findIndex((step) => step.dataset.wizardGo === hashKey);
  let index = hashIndex >= 0 ? hashIndex : Math.max(0, steps.findIndex((step) => step.classList.contains("active")));

  function showStep(nextIndex) {
    index = Math.min(Math.max(nextIndex, 0), steps.length - 1);
    const activeKey = steps[index].dataset.wizardGo;
    steps.forEach((step, stepIndex) => {
      const isActive = stepIndex === index;
      step.classList.toggle("active", isActive);
      step.classList.toggle("done", stepIndex < index);
      step.setAttribute("aria-current", isActive ? "step" : "false");
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.wizardPanel === activeKey);
    });
    if (window.location.hash !== `#${activeKey}`) {
      history.replaceState(null, "", `#${activeKey}`);
    }
    if (previous) previous.disabled = index === 0;
    if (next) next.textContent = index === steps.length - 1 ? "Finish setup" : "Next";
    if (currentStep) currentStep.textContent = steps[index].querySelector("b")?.textContent || "";
  }

  steps.forEach((step, stepIndex) => {
    step.addEventListener("click", () => showStep(stepIndex));
  });
  if (previous) previous.addEventListener("click", () => showStep(index - 1));
  if (next) next.addEventListener("click", () => showStep(index + 1));
  showStep(index);
}

function levelMarkup({ type = "site", label = "New level", description = "Describe what this level represents" } = {}) {
  const types = ["enterprise", "region", "site", "building", "zone", "line", "cell", "edge node"];
  return `
    <strong data-order></strong>
    <label>Level type<select data-level-type>${types.map((item) => `<option ${item === type ? "selected" : ""}>${item}</option>`).join("")}</select></label>
    <label>Display label<input data-level-label value="${label}"></label>
    <label>Description<input data-level-description value="${description}"></label>
    <div class="level-actions">
      <button type="button" data-move-up>Up</button>
      <button type="button" data-move-down>Down</button>
      <button type="button" data-delete-level>Delete</button>
    </div>
  `;
}

function updateHierarchyBuilder(builder) {
  const levels = qsa("[data-level]", builder);
  levels.forEach((level, index) => {
    const order = qs("[data-order]", level);
    if (order) order.textContent = String(index + 1);
    const up = qs("[data-move-up]", level);
    const down = qs("[data-move-down]", level);
    const del = qs("[data-delete-level]", level);
    if (up) up.disabled = index === 0;
    if (down) down.disabled = index === levels.length - 1;
    if (del) del.disabled = levels.length <= 1;
  });
  const lineage = levels.map((level) => {
    const type = qs("[data-level-type]", level)?.value || "level";
    return type.replace(/\s+/g, "-");
  }).join(" -> ");
  qsa("[data-lineage-preview]").forEach((node) => { node.textContent = lineage; });
  qsa("[data-inspector-hierarchy]").forEach((node) => { node.textContent = lineage; });
}

function setupHierarchyBuilder() {
  const builder = qs("[data-hierarchy-builder]");
  if (!builder) return;
  const chain = qs("[data-hierarchy-chain]", builder);
  const add = qs("[data-add-level]", builder);
  if (!chain || !add) return;

  add.addEventListener("click", () => {
    const level = document.createElement("div");
    level.className = "hierarchy-level";
    level.dataset.level = "";
    level.innerHTML = levelMarkup();
    chain.appendChild(level);
    updateHierarchyBuilder(builder);
  });

  chain.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const level = event.target.closest("[data-level]");
    if (!button || !level) return;
    if (button.matches("[data-delete-level]")) {
      level.remove();
    } else if (button.matches("[data-move-up]") && level.previousElementSibling) {
      chain.insertBefore(level, level.previousElementSibling);
    } else if (button.matches("[data-move-down]") && level.nextElementSibling) {
      chain.insertBefore(level.nextElementSibling, level);
    }
    updateHierarchyBuilder(builder);
  });

  chain.addEventListener("input", () => updateHierarchyBuilder(builder));
  chain.addEventListener("change", () => updateHierarchyBuilder(builder));
  updateHierarchyBuilder(builder);
}

setupChoices();
setupRows();
setupFleetSelection();
setupCodeTabs();
setupChecklist();
setupModeControls();
setupScopeSelector();
setupInstanceSelector();
setupComponentAssignments();
setupWizard();
setupHierarchyBuilder();
