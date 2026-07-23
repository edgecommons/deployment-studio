//! Slice-1 acceptance: render the Dallas golden fixture and prove it against the
//! bottling-company-test harness (PLAN.md step 3).
//!
//! Since harness PR #4 (adopt/studio-rendered-configs, merged 2026-07-22), the harness files ARE
//! this renderer's output — so the expectation is total: **all 22 oracle files byte-identical**
//! (CRLF-normalized). Any regression in the renderer, the fixture, or a hand edit sneaking back
//! into the harness fails this test.

use std::path::{Path, PathBuf};

use edgecommons_deploy::{context::Workspace, oracle, render, validate};

fn fixture_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../fixtures/dallas")
}

fn harness_dir() -> Option<PathBuf> {
    let dir = match std::env::var("BOTTLING_HARNESS_DIR") {
        Ok(v) => PathBuf::from(v),
        Err(_) => Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../bottling-company-test/sites/dallas-site"),
    };
    dir.is_dir().then_some(dir)
}

#[test]
fn dallas_fixture_regenerates_the_harness() {
    let Some(harness) = harness_dir() else {
        eprintln!("SKIP: bottling-company-test harness not found (set BOTTLING_HARNESS_DIR)");
        return;
    };

    let ws = Workspace::load(&fixture_dir().join("definition.yaml")).expect("load fixture");
    let findings = validate::validate(&ws, Some("local")).expect("validate");
    assert!(findings.ok(), "fixture must validate: {:?}", findings.errors);

    let output = render::render(&ws, "local", "initial").expect("render");
    let out = std::env::temp_dir().join(format!("ec-deploy-oracle-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&out);
    for file in &output.files {
        let path = out.join(&file.path);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, &file.text).unwrap();
    }

    let map: oracle::OracleMap = serde_json::from_str(
        &std::fs::read_to_string(fixture_dir().join("oracle-map.json")).unwrap(),
    )
    .unwrap();
    let bindings = ws.load_bindings("local").unwrap();
    let reports = oracle::compare(&map, &out, &harness, &bindings).expect("compare");
    assert_eq!(reports.len(), 22, "oracle map covers all 22 files");

    let failures: Vec<String> = reports
        .iter()
        .filter(|r| !r.byte_equal)
        .map(|r| format!("{}: not byte-identical; semantic diffs: {:?}", r.rendered, r.diffs))
        .collect();
    assert!(failures.is_empty(), "oracle failures:\n{}", failures.join("\n"));

    eprintln!("oracle: 22/22 byte-identical (CRLF-normalized)");
    let _ = std::fs::remove_dir_all(&out);
}
