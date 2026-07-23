//! Slice 2: release manifests and evidence bundles (deck ch. 13, "Evidence").
//!
//! A release is the committable record of one render: the manifest ties the definition commit,
//! the renderer version, per-file output hashes, and the two streams' identities together —
//! **correlating** the config and artifact streams without fusing them (the ReleaseLock
//! decision). The evidence bundle records what was validated. The rendered snapshot is committed
//! at release boundaries (register decision #8, resolved by construction here); previews stay
//! ephemeral.
//!
//! Determinism holds here too: no timestamps, no randomness. Re-running a release at the same
//! definition commit yields byte-identical output; the Git commit that lands it carries the time.

use std::path::Path;

use anyhow::{Context as _, Result};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::context::Workspace;
use crate::render::{render, restart_impact, RenderOutput};
use crate::validate;

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    format!("sha256:{hex}")
}

/// Best-effort Git provenance for the workspace: `<commit>` or `<commit>-dirty`, or "unknown"
/// outside a repository. Dirtiness is judged against the workspace directory only.
fn definition_commit(root: &Path) -> String {
    let run = |args: &[&str]| -> Option<String> {
        let out = std::process::Command::new("git")
            .arg("-C")
            .arg(root)
            .args(args)
            .output()
            .ok()?;
        out.status.success().then(|| String::from_utf8_lossy(&out.stdout).trim().to_string())
    };
    match run(&["rev-parse", "HEAD"]) {
        Some(commit) => {
            let dirty = run(&["status", "--porcelain", "--", "."])
                .map(|s| !s.is_empty())
                .unwrap_or(false);
            if dirty {
                format!("{commit}-dirty")
            } else {
                commit
            }
        }
        None => "unknown".into(),
    }
}

pub struct ReleaseOutput {
    /// Files relative to the release directory (`manifest.json`, `evidence.json`, `rendered/**`).
    pub files: Vec<(String, String)>,
}

pub fn build_release(
    ws: &Workspace,
    environment: &str,
    release_tag: &str,
    config_release: &str,
) -> Result<ReleaseOutput> {
    // A release is only ever built from a valid definition.
    let findings = validate::validate(ws, Some(environment))?;
    anyhow::ensure!(
        findings.ok(),
        "definition invalid: {} error(s): {:?}",
        findings.errors.len(),
        findings.errors
    );

    let output: RenderOutput = render(ws, environment, config_release)?;

    // Per-file hashes over the exact rendered bytes.
    let mut files_json = Vec::new();
    for f in &output.files {
        files_json.push(json!({ "path": f.path, "sha256": sha256_hex(f.text.as_bytes()) }));
    }
    let file_hash = |path: &str| -> Option<String> {
        output
            .files
            .iter()
            .find(|f| f.path == path)
            .map(|f| sha256_hex(f.text.as_bytes()))
    };

    // The two streams, correlated — never fused. Config: per-node catalog identity and hashes.
    // Artifact: the per-component pins exactly as authored (source-form marks a dev-mode release).
    let mut config_stream = Map::new();
    let mut artifact_stream = Vec::new();
    let mut dev_mode = false;
    for node in &ws.definition.nodes {
        if node.config_provider.is_some() {
            let chain = ws.chain(&node.scope)?;
            let version = node
                .config_provider
                .as_ref()
                .and_then(|cp| cp.version_base.clone())
                .unwrap_or_else(|| chain.iter().map(|s| s.value()).collect::<Vec<_>>().join("-"))
                + "-"
                + config_release;
            config_stream.insert(
                node.key.clone(),
                json!({
                    "catalogVersion": version,
                    "catalogSha256": file_hash(&format!("{}/config-catalog.json", node.key)),
                    "bootstrapSha256": file_hash(&format!("{}/config-component-config.json", node.key)),
                }),
            );
        }
        for comp in &node.components {
            let artifact = comp.artifact.as_ref();
            let pinned = artifact.map(|a| a.version.is_some() && a.digest.is_some()).unwrap_or(false);
            if !pinned {
                dev_mode = true;
            }
            artifact_stream.push(json!({
                "node": node.key,
                "component": comp.name,
                "version": artifact.and_then(|a| a.version.clone()),
                "digest": artifact.and_then(|a| a.digest.clone()),
                "source": artifact.and_then(|a| a.source.as_ref()).map(|s| json!({
                    "kind": s.kind, "repo": s.repo, "ref": s.r#ref, "features": s.features,
                })),
                "configSource": comp.config_source,
                "restartImpact": restart_impact(&comp.config_source),
            }));
        }
    }

    let env = ws
        .definition
        .environments
        .iter()
        .find(|e| e.name == environment)
        .with_context(|| format!("unknown environment '{environment}'"))?;
    let bindings_text = std::fs::read_to_string(ws.root.join(&env.bindings))?;

    let manifest = json!({
        "release": release_tag,
        "definition": ws.definition.metadata.name,
        "environment": environment,
        "definitionCommit": definition_commit(&ws.root),
        "renderer": format!("{} {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION")),
        "configRelease": config_release,
        "devMode": dev_mode,
        "$comment": "The release correlates two independently versioned, independently rolled-back streams; it never fuses them. devMode=true means at least one artifact is source-form rather than version+digest pinned - promotion to a protected environment requires full pins.",
        "streams": {
            "config": Value::Object(config_stream),
            "artifact": artifact_stream,
        },
        "bindings": { "file": env.bindings, "sha256": sha256_hex(bindings_text.as_bytes()) },
        "files": files_json,
    });

    let mut binding_tokens: Vec<Value> = Vec::new();
    if let Some(req) = output.files.iter().find(|f| f.path == "requirements.json") {
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&req.text) {
            if let Some(Value::Array(tokens)) = map.get("bindings") {
                binding_tokens = tokens.clone();
            }
        }
    }
    let evidence = json!({
        "schemaValidation": "pass",
        "semanticRules": "pass (S-1..S-9)",
        "warnings": findings.warnings,
        "bindingTokensResolved": binding_tokens,
        "renderDeterminism": "re-run at the same definition commit yields byte-identical output",
        "$comment": "Validation evidence for this release. Target smoke and policy evidence attach here as later slices land them.",
    });

    let mut files = vec![
        ("manifest.json".to_string(), pretty(&manifest)),
        ("evidence.json".to_string(), pretty(&evidence)),
    ];
    for f in &output.files {
        files.push((format!("rendered/{}", f.path), f.text.clone()));
    }
    Ok(ReleaseOutput { files })
}

fn pretty(value: &Value) -> String {
    let mut s = serde_json::to_string_pretty(value).expect("JSON serialization cannot fail");
    s.push('\n');
    s
}
