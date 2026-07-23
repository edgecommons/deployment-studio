//! Slice-2 acceptance: releases are deterministic and internally consistent.

use std::path::Path;

use edgecommons_deploy::{context::Workspace, release};

fn fixture() -> Workspace {
    Workspace::load(
        &Path::new(env!("CARGO_MANIFEST_DIR")).join("../fixtures/dallas/definition.yaml"),
    )
    .expect("load fixture")
}

#[test]
fn release_is_deterministic_and_consistent() {
    let ws = fixture();
    let a = release::build_release(&ws, "local", "test-tag", "initial").expect("release a");
    let b = release::build_release(&ws, "local", "test-tag", "initial").expect("release b");

    // Determinism: identical inputs -> identical bytes, file for file.
    assert_eq!(a.files.len(), b.files.len());
    for ((pa, ta), (pb, tb)) in a.files.iter().zip(&b.files) {
        assert_eq!(pa, pb);
        assert_eq!(ta, tb, "release output differs between runs: {pa}");
    }

    // Structure: manifest + evidence + a rendered snapshot.
    let manifest_text = &a.files.iter().find(|(p, _)| p == "manifest.json").unwrap().1;
    let manifest: serde_json::Value = serde_json::from_str(manifest_text).unwrap();
    assert_eq!(manifest["release"], "test-tag");
    assert_eq!(manifest["definition"], "dallas-bottling");
    assert_eq!(manifest["devMode"], true, "Dallas fixture is source-form, so devMode");
    assert!(a.files.iter().any(|(p, _)| p == "evidence.json"));

    // Integrity: every manifest file hash matches the rendered snapshot's bytes.
    use sha2::{Digest, Sha256};
    for entry in manifest["files"].as_array().unwrap() {
        let path = entry["path"].as_str().unwrap();
        let expected = entry["sha256"].as_str().unwrap();
        let (_, text) = a
            .files
            .iter()
            .find(|(p, _)| p == &format!("rendered/{path}"))
            .unwrap_or_else(|| panic!("manifest lists {path} but snapshot lacks it"));
        let digest = Sha256::digest(text.as_bytes());
        let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
        let actual = format!("sha256:{hex}");
        assert_eq!(actual, expected, "hash mismatch for {path}");
    }

    // Two streams present and correlated, never fused: config per node, artifact per component.
    let config = manifest["streams"]["config"].as_object().unwrap();
    assert_eq!(config.len(), 3, "three nodes carry catalogs");
    assert_eq!(
        config["gw-pack-01"]["catalogVersion"],
        "bottles-r-us-dallas-packaging-line-initial"
    );
    let artifacts = manifest["streams"]["artifact"].as_array().unwrap();
    assert_eq!(artifacts.len(), 10, "ten component assignments");
}
