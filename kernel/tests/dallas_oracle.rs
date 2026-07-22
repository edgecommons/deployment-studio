//! Slice-1 acceptance: render the Dallas golden fixture and prove it against the
//! hand-maintained bottling-company-test harness (PLAN.md step 3).
//!
//! Expectations, exactly:
//! - all 13 messaging files are byte-identical (CRLF-normalized);
//! - all 3 catalogs are semantic-equal (the packaging one after template substitution);
//! - all 3 bootstrap configs differ ONLY by `tags.scenario` present in the render
//!   (documented harness drift, TRACEABILITY F-10);
//! - site + filling supervisord confs are semantic-equal; packaging differs ONLY in the
//!   config-component command, whose runtime template-render step the compiler replaces
//!   (TRACEABILITY F-3).

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

    let mut failures = Vec::new();
    for r in &reports {
        let is_messaging = r.rendered.ends_with("-messaging.json");
        let is_bootstrap = r.rendered.ends_with("config-component-config.json");
        let is_pack_conf = r.rendered == "gw-pack-01/supervisord.conf";
        let is_conf = r.rendered.ends_with("supervisord.conf");

        if is_messaging && !r.byte_equal {
            failures.push(format!("{}: expected byte-identical, diffs: {:?}", r.rendered, r.diffs));
        } else if is_bootstrap {
            // Exactly one known drift: the harness bootstraps dropped the enterprise
            // layer's tags.scenario by hand.
            if !(r.diffs.len() == 1 && r.diffs[0] == "tags.scenario: only in rendered") {
                failures.push(format!("{}: expected only tags.scenario drift, got {:?}", r.rendered, r.diffs));
            }
        } else if is_pack_conf {
            // Exactly one known difference: the compiler substitutes bindings at render
            // time, so the runtime render-packaging-catalog step disappears.
            let only_command_diff = r.diffs.len() == 1
                && r.diffs[0].starts_with("[program:config-component] command:");
            if !only_command_diff {
                failures.push(format!("{}: expected only the config-component command diff, got {:?}", r.rendered, r.diffs));
            }
        } else if is_conf || !is_messaging {
            // Catalogs and the remaining confs: fully semantic-equal.
            if !r.semantic_equal {
                failures.push(format!("{}: semantic diffs: {:?}", r.rendered, r.diffs));
            }
        }
    }
    assert!(failures.is_empty(), "oracle failures:\n{}", failures.join("\n"));

    let bytes = reports.iter().filter(|r| r.byte_equal).count();
    let semantic = reports.iter().filter(|r| r.semantic_equal).count();
    eprintln!("oracle: {bytes}/22 byte-identical, {semantic}/22 semantic-equal");
    let _ = std::fs::remove_dir_all(&out);
}
