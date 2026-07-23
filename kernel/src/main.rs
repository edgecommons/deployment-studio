//! `ec-deploy` — the Deployment Studio CLI (slice 1: validate, render, oracle).

use std::path::PathBuf;

use anyhow::{bail, Context as _, Result};
use clap::{Parser, Subcommand};

use edgecommons_deploy::{context::Workspace, oracle, release, render, validate};

#[derive(Parser)]
#[command(name = "ec-deploy", about = "EdgeCommons Deployment Studio kernel (slice 1)")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Validate a DeploymentDefinition (semantic rules S-1..S-9).
    Validate {
        definition: PathBuf,
        /// Restrict S-5 binding resolution to one environment.
        #[arg(long)]
        environment: Option<String>,
    },
    /// Render the HOST artifacts for an environment.
    Render {
        definition: PathBuf,
        #[arg(long)]
        environment: String,
        /// Config-release tag appended to derived catalog versions.
        #[arg(long, default_value = "initial")]
        release_tag: String,
        #[arg(long)]
        out: PathBuf,
    },
    /// Render, then compare against a hand-maintained oracle tree.
    Oracle {
        definition: PathBuf,
        #[arg(long)]
        environment: String,
        #[arg(long, default_value = "initial")]
        release_tag: String,
        /// Oracle mapping file (rendered path <-> harness path + comparison kind).
        #[arg(long)]
        map: PathBuf,
        /// Root of the hand-maintained tree to compare against.
        #[arg(long)]
        harness: PathBuf,
        /// Directory to write the rendered output into (kept for inspection).
        #[arg(long)]
        out: PathBuf,
        /// Exit non-zero unless every mapped file is byte-identical (CI gate mode).
        #[arg(long)]
        strict: bool,
    },
    /// Validate, render, and write a committable release: manifest, evidence, rendered snapshot.
    Release {
        definition: PathBuf,
        #[arg(long)]
        environment: String,
        /// Release tag; output lands in <workspace>/releases/<tag>/ unless --out is given.
        #[arg(long)]
        tag: String,
        /// Config-release tag appended to derived catalog versions.
        #[arg(long, default_value = "initial")]
        config_release: String,
        #[arg(long)]
        out: Option<PathBuf>,
    },
}

fn main() -> Result<()> {
    match Cli::parse().command {
        Command::Validate { definition, environment } => {
            let ws = Workspace::load(&definition)?;
            let findings = validate::validate(&ws, environment.as_deref())?;
            for w in &findings.warnings {
                println!("WARN  {w}");
            }
            for e in &findings.errors {
                println!("FAIL  {e}");
            }
            if !findings.ok() {
                bail!("{} validation error(s)", findings.errors.len());
            }
            println!("OK    semantic rules S-1..S-9");
        }
        Command::Render { definition, environment, release_tag, out } => {
            let ws = Workspace::load(&definition)?;
            ensure_valid(&ws, &environment)?;
            let output = render::render(&ws, &environment, &release_tag)?;
            write_files(&out, &output)?;
            println!("rendered {} files to {}", output.files.len(), out.display());
        }
        Command::Release { definition, environment, tag, config_release, out } => {
            let ws = Workspace::load(&definition)?;
            let release_dir = out.unwrap_or_else(|| ws.root.join("releases").join(&tag));
            let output = release::build_release(&ws, &environment, &tag, &config_release)?;
            for (rel, text) in &output.files {
                let path = release_dir.join(rel);
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                std::fs::write(&path, text).with_context(|| format!("writing {}", path.display()))?;
            }
            println!(
                "release '{tag}' written: {} files under {}",
                output.files.len(),
                release_dir.display()
            );
        }
        Command::Oracle { definition, environment, release_tag, map, harness, out, strict } => {
            let ws = Workspace::load(&definition)?;
            ensure_valid(&ws, &environment)?;
            let output = render::render(&ws, &environment, &release_tag)?;
            write_files(&out, &output)?;
            let map: oracle::OracleMap = serde_json::from_str(
                &std::fs::read_to_string(&map)
                    .with_context(|| format!("reading map {}", map.display()))?,
            )?;
            let bindings = ws.load_bindings(&environment)?;
            let reports = oracle::compare(&map, &out, &harness, &bindings)?;
            let mut byte = 0;
            let mut semantic = 0;
            for r in &reports {
                let status = match (r.byte_equal, r.semantic_equal) {
                    (true, _) => "BYTE-IDENTICAL ",
                    (false, true) => "semantic-equal ",
                    (false, false) => "DIFFERS        ",
                };
                println!("{status}{:<44} ~ {}", r.rendered, r.harness);
                for d in &r.diffs {
                    println!("               - {d}");
                }
                byte += r.byte_equal as usize;
                semantic += r.semantic_equal as usize;
            }
            println!(
                "\n{byte}/{} byte-identical (CRLF-normalized), {semantic}/{} semantic-equal",
                reports.len(),
                reports.len()
            );
            if strict && byte != reports.len() {
                bail!("strict mode: {} file(s) are not byte-identical", reports.len() - byte);
            }
        }
    }
    Ok(())
}

fn ensure_valid(ws: &Workspace, environment: &str) -> Result<()> {
    let findings = validate::validate(ws, Some(environment))?;
    for w in &findings.warnings {
        eprintln!("WARN  {w}");
    }
    if !findings.ok() {
        for e in &findings.errors {
            eprintln!("FAIL  {e}");
        }
        bail!("definition invalid: {} error(s)", findings.errors.len());
    }
    Ok(())
}

fn write_files(out: &std::path::Path, output: &render::RenderOutput) -> Result<()> {
    for file in &output.files {
        let path = out.join(&file.path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&path, &file.text)
            .with_context(|| format!("writing {}", path.display()))?;
    }
    Ok(())
}
