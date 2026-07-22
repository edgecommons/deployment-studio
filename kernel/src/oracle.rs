//! The oracle diff engine: compares rendered output against the hand-maintained harness files.
//!
//! Three comparison kinds:
//! - `json`: parse both sides, deep-compare order-insensitively; also report normalized byte
//!   equality (CRLF folded to LF) for the byte-for-byte tally.
//! - `json-template`: the harness side is a template whose `__PLACEHOLDER__` tokens are filled
//!   from the environment bindings before parsing (the packaging catalog).
//! - `ini`: supervisord conf comparison - sections and key=value pairs, comments and ordering
//!   ignored.

use std::collections::BTreeMap;
use std::path::Path;

use anyhow::{Context as _, Result};
use serde::Deserialize;
use serde_json::Value;

use crate::context::lookup;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OracleMap {
    pub entries: Vec<OracleEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OracleEntry {
    pub rendered: String,
    pub harness: String,
    pub kind: String,
    #[serde(default)]
    pub placeholders: BTreeMap<String, String>,
}

pub struct FileReport {
    pub rendered: String,
    pub harness: String,
    pub byte_equal: bool,
    pub semantic_equal: bool,
    pub diffs: Vec<String>,
}

fn normalize(text: &str) -> String {
    text.replace("\r\n", "\n")
}

pub fn compare(
    map: &OracleMap,
    rendered_root: &Path,
    harness_root: &Path,
    bindings: &Value,
) -> Result<Vec<FileReport>> {
    let mut reports = Vec::new();
    for entry in &map.entries {
        let rendered_path = rendered_root.join(&entry.rendered);
        let harness_path = harness_root.join(&entry.harness);
        let rendered = normalize(
            &std::fs::read_to_string(&rendered_path)
                .with_context(|| format!("reading rendered {}", rendered_path.display()))?,
        );
        let mut harness = normalize(
            &std::fs::read_to_string(&harness_path)
                .with_context(|| format!("reading harness {}", harness_path.display()))?,
        );

        if entry.kind == "json-template" {
            for (placeholder, binding_path) in &entry.placeholders {
                let bound = lookup(bindings, binding_path).with_context(|| {
                    format!("oracle template: unresolved binding '{binding_path}'")
                })?;
                let json_rendered = serde_json::to_string(bound)?;
                harness = harness.replace(&format!("\"{placeholder}\""), &json_rendered);
                let raw = match bound {
                    Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                harness = harness.replace(placeholder.as_str(), &raw);
            }
        }

        let mut diffs = Vec::new();
        let semantic_equal = match entry.kind.as_str() {
            "json" | "json-template" => {
                let ours: Value = serde_json::from_str(&rendered)
                    .with_context(|| format!("rendered {} is not JSON", entry.rendered))?;
                let theirs: Value = serde_json::from_str(&harness)
                    .with_context(|| format!("harness {} is not JSON", entry.harness))?;
                json_diff("", &ours, &theirs, &mut diffs);
                diffs.is_empty()
            }
            "ini" => {
                let ours = parse_ini(&rendered);
                let theirs = parse_ini(&harness);
                ini_diff(&ours, &theirs, &mut diffs);
                diffs.is_empty()
            }
            other => anyhow::bail!("unknown oracle kind '{other}'"),
        };

        reports.push(FileReport {
            rendered: entry.rendered.clone(),
            harness: entry.harness.clone(),
            byte_equal: rendered == harness,
            semantic_equal,
            diffs,
        });
    }
    Ok(reports)
}

fn json_diff(path: &str, ours: &Value, theirs: &Value, out: &mut Vec<String>) {
    match (ours, theirs) {
        (Value::Object(a), Value::Object(b)) => {
            for (k, va) in a {
                let child = if path.is_empty() { k.clone() } else { format!("{path}.{k}") };
                match b.get(k) {
                    Some(vb) => json_diff(&child, va, vb, out),
                    None => out.push(format!("{child}: only in rendered")),
                }
            }
            for k in b.keys() {
                if !a.contains_key(k) {
                    let child = if path.is_empty() { k.clone() } else { format!("{path}.{k}") };
                    out.push(format!("{child}: only in harness"));
                }
            }
        }
        (Value::Array(a), Value::Array(b)) => {
            if a.len() != b.len() {
                out.push(format!("{path}: array length {} vs {}", a.len(), b.len()));
            } else {
                for (i, (va, vb)) in a.iter().zip(b).enumerate() {
                    json_diff(&format!("{path}[{i}]"), va, vb, out);
                }
            }
        }
        (a, b) => {
            if a != b {
                out.push(format!("{path}: {a} vs {b}"));
            }
        }
    }
}

type Ini = BTreeMap<String, BTreeMap<String, String>>;

fn parse_ini(text: &str) -> Ini {
    let mut out: Ini = BTreeMap::new();
    let mut section = String::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
            continue;
        }
        if line.starts_with('[') && line.ends_with(']') {
            section = line[1..line.len() - 1].to_string();
            out.entry(section.clone()).or_default();
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            out.entry(section.clone())
                .or_default()
                .insert(key.trim().to_string(), value.trim().to_string());
        }
    }
    out
}

fn ini_diff(ours: &Ini, theirs: &Ini, out: &mut Vec<String>) {
    for (section, a) in ours {
        match theirs.get(section) {
            None => out.push(format!("[{section}]: only in rendered")),
            Some(b) => {
                for (k, va) in a {
                    match b.get(k) {
                        None => out.push(format!("[{section}] {k}: only in rendered")),
                        Some(vb) if va != vb => {
                            out.push(format!("[{section}] {k}: '{va}' vs '{vb}'"))
                        }
                        _ => {}
                    }
                }
                for k in b.keys() {
                    if !a.contains_key(k) {
                        out.push(format!("[{section}] {k}: only in harness"));
                    }
                }
            }
        }
    }
    for section in theirs.keys() {
        if !ours.contains_key(section) {
            out.push(format!("[{section}]: only in harness"));
        }
    }
}
