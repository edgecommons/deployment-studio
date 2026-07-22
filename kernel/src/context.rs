//! Loaded workspace: the parsed definition, its layer files, and an environment's bindings —
//! plus the derivation helpers (scope chains, per-node levels, identity) and `${…}` token
//! resolution. Placement is the single source of lineage: everything here derives from
//! `nodes[].scope` (schema rules S-4/S-7).

use std::path::{Path, PathBuf};

use anyhow::{bail, Context as _, Result};
use serde_json::Value;

use crate::model::{Definition, Node, Scope};

pub struct Workspace {
    pub definition: Definition,
    pub root: PathBuf,
}

impl Workspace {
    pub fn load(definition_path: &Path) -> Result<Self> {
        let text = std::fs::read_to_string(definition_path)
            .with_context(|| format!("reading {}", definition_path.display()))?;
        let definition: Definition =
            serde_yaml::from_str(&text).with_context(|| "parsing definition YAML")?;
        let root = definition_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf();
        Ok(Self { definition, root })
    }

    pub fn scope(&self, id: &str) -> Result<&Scope> {
        self.definition
            .hierarchy
            .scopes
            .iter()
            .find(|s| s.id == id)
            .with_context(|| format!("unknown scope '{id}'"))
    }

    /// Root-first chain of scopes ending at `scope_id`.
    pub fn chain(&self, scope_id: &str) -> Result<Vec<&Scope>> {
        let mut chain = Vec::new();
        let mut cur = Some(scope_id.to_string());
        while let Some(id) = cur {
            let scope = self.scope(&id)?;
            chain.push(scope);
            cur = scope.parent.clone();
            if chain.len() > 64 {
                bail!("scope chain too deep at '{scope_id}' (cycle?)");
            }
        }
        chain.reverse();
        Ok(chain)
    }

    /// The node's derived level list: its chain's levels plus the terminal `device` level.
    pub fn levels_for(&self, node: &Node) -> Result<Vec<String>> {
        let mut levels: Vec<String> = self
            .chain(&node.scope)?
            .iter()
            .map(|s| s.level().to_string())
            .collect();
        levels.push("device".into());
        Ok(levels)
    }

    /// Load a repo-relative layer file as a JSON object.
    pub fn load_layer(&self, rel: &str) -> Result<serde_json::Map<String, Value>> {
        let path = self.root.join(rel);
        let text = std::fs::read_to_string(&path)
            .with_context(|| format!("reading layer {}", path.display()))?;
        let value: Value =
            serde_json::from_str(&text).with_context(|| format!("parsing layer {rel}"))?;
        match value {
            Value::Object(map) => Ok(map),
            _ => bail!("layer {rel} must be a JSON object"),
        }
    }

    /// Load an environment's bindings file.
    pub fn load_bindings(&self, environment: &str) -> Result<Value> {
        let env = self
            .definition
            .environments
            .iter()
            .find(|e| e.name == environment)
            .with_context(|| format!("unknown environment '{environment}'"))?;
        let path = self.root.join(&env.bindings);
        let text = std::fs::read_to_string(&path)
            .with_context(|| format!("reading bindings {}", path.display()))?;
        Ok(serde_json::from_str(&text)?)
    }
}

/// Look up a dotted path inside a JSON value.
pub fn lookup<'v>(root: &'v Value, dotted: &str) -> Option<&'v Value> {
    let mut cur = root;
    for part in dotted.split('.') {
        cur = cur.as_object()?.get(part)?;
    }
    Some(cur)
}

/// Find `${namespace:path}` tokens in a string. Returns `(start, end, path)` triples.
fn find_tokens(s: &str, namespace: &str) -> Vec<(usize, usize, String)> {
    let prefix = format!("${{{namespace}:");
    let mut out = Vec::new();
    let mut from = 0;
    while let Some(rel) = s[from..].find(&prefix) {
        let start = from + rel;
        let path_start = start + prefix.len();
        match s[path_start..].find('}') {
            Some(rel_end) => {
                let end = path_start + rel_end + 1;
                out.push((start, end, s[path_start..path_start + rel_end].to_string()));
                from = end;
            }
            None => break,
        }
    }
    out
}

/// Collect every `${namespace:path}` token path appearing anywhere in a JSON tree.
pub fn collect_tokens(value: &Value, namespace: &str, out: &mut Vec<String>) {
    match value {
        Value::String(s) => {
            for (_, _, path) in find_tokens(s, namespace) {
                out.push(path);
            }
        }
        Value::Array(items) => items.iter().for_each(|v| collect_tokens(v, namespace, out)),
        Value::Object(map) => map.values().for_each(|v| collect_tokens(v, namespace, out)),
        _ => {}
    }
}

/// Resolve `${namespace:path}` tokens in a JSON tree against a source document.
///
/// A string that consists of exactly one token is replaced by the bound value with its type
/// preserved (numbers stay numbers — the packaging Modbus port relies on this). Tokens embedded
/// in longer strings are substituted textually.
pub fn resolve_tokens(value: &mut Value, namespace: &str, source: &Value) -> Result<()> {
    match value {
        Value::String(s) => {
            let tokens = find_tokens(s, namespace);
            if tokens.is_empty() {
                return Ok(());
            }
            let whole = tokens.len() == 1 && tokens[0].0 == 0 && tokens[0].1 == s.len();
            if whole {
                let bound = lookup(source, &tokens[0].2)
                    .with_context(|| format!("unresolved ${{{namespace}:{}}}", tokens[0].2))?;
                *value = bound.clone();
            } else {
                let mut rebuilt = String::new();
                let mut cursor = 0;
                for (start, end, path) in &tokens {
                    let bound = lookup(source, path)
                        .with_context(|| format!("unresolved ${{{namespace}:{path}}}"))?;
                    rebuilt.push_str(&s[cursor..*start]);
                    match bound {
                        Value::String(b) => rebuilt.push_str(b),
                        other => rebuilt.push_str(&other.to_string()),
                    }
                    cursor = *end;
                }
                rebuilt.push_str(&s[cursor..]);
                *value = Value::String(rebuilt);
            }
        }
        Value::Array(items) => {
            for v in items {
                resolve_tokens(v, namespace, source)?;
            }
        }
        Value::Object(map) => {
            for (_, v) in map.iter_mut() {
                resolve_tokens(v, namespace, source)?;
            }
        }
        _ => {}
    }
    Ok(())
}
