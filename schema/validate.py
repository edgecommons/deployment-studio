#!/usr/bin/env python3
"""Structurally validate a deployment definition against the authored schema.

This repository is the *design home* — the deck, the reviews, the definition schema, and the
golden fixture. The deployment engine, its semantic rules (S-1..S-9), the effective(profile)
merge, and the byte-for-byte render proof all live in `edgecommons/edgecommons`
(`edgecommons deployment validate` and the Dallas golden test). This checker deliberately does
*not* re-implement any of that: it confirms the fixture conforms to the authored JSON Schema
(one shared `topology` + per-platform `profiles`) and that every file the definition references
exists. Duplicating the kernel's semantics in a second validator is exactly the drift the design
warns against.
"""

import json
import sys
from pathlib import Path

try:
    import jsonschema
    import yaml
except ImportError as exc:  # pragma: no cover - CI installs these
    sys.exit(f"missing dependency: {exc} (pip install jsonschema pyyaml)")

HERE = Path(__file__).resolve().parent
SCHEMA = HERE / "deployment-definition.schema.json"


def referenced_files(definition: dict) -> list[str]:
    """Every layer and binding path the definition names, relative to its directory."""
    refs: list[str] = []
    for scope in definition.get("hierarchy", {}).get("scopes", []):
        if "layer" in scope:
            refs.append(scope["layer"])
    for node in definition.get("topology", {}).get("nodes", []):
        for comp in node.get("components", []):
            if "layer" in comp:
                refs.append(comp["layer"])
    for profile in definition.get("profiles", {}).values():
        for env in profile.get("environments", []):
            if "bindings" in env:
                refs.append(env["bindings"])
        for node in profile.get("nodes", {}).values():
            for comp in node.get("components", {}).values():
                if "layer" in comp:
                    refs.append(comp["layer"])
    return refs


def main() -> int:
    if len(sys.argv) != 2:
        sys.exit("usage: validate.py <definition.yaml>")
    definition_path = Path(sys.argv[1])
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    definition = yaml.safe_load(definition_path.read_text(encoding="utf-8"))

    try:
        jsonschema.validate(definition, schema)
    except jsonschema.ValidationError as err:
        loc = "/".join(str(p) for p in err.path) or "<root>"
        sys.exit(f"FAIL  schema: {loc}: {err.message}")

    root = definition_path.parent
    missing = [r for r in referenced_files(definition) if not (root / r).is_file()]
    if missing:
        sys.exit("FAIL  missing referenced files:\n  " + "\n  ".join(sorted(missing)))

    profiles = definition.get("profiles", {})
    nodes = definition.get("topology", {}).get("nodes", [])
    print(
        f"OK    structural: {len(nodes)} nodes, {len(profiles)} profiles "
        f"({', '.join(profiles)}); all referenced files present"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
