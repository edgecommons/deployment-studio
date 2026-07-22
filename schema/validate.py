#!/usr/bin/env python3
"""Validate a DeploymentDefinition against the v1alpha1 schema and semantic rules S-1..S-9.

Usage: python schema/validate.py fixtures/dallas/definition.yaml [environment]

This is the proto-kernel validator: JSON Schema conformance first, then the semantic rules from
schema/DEFINITION.md, including ${binding:...} token resolution against the chosen environment's
bindings file. Exits non-zero on the first hard failure class; prints every finding.
"""
import json, pathlib, re, sys

import jsonschema
import yaml

HERE = pathlib.Path(__file__).parent
SCHEMA = json.loads((HERE / "deployment-definition.schema.json").read_text(encoding="utf-8"))
BINDING_RE = re.compile(r"\$\{binding:([A-Za-z0-9_.-]+)\}")

def fail(errors):
    for e in errors:
        print(f"FAIL  {e}")
    if errors:
        sys.exit(1)

def main() -> None:
    def_path = pathlib.Path(sys.argv[1])
    env_name = sys.argv[2] if len(sys.argv) > 2 else None
    root = def_path.parent
    definition = yaml.safe_load(def_path.read_text(encoding="utf-8"))

    # 1. JSON Schema conformance.
    validator = jsonschema.Draft202012Validator(SCHEMA)
    schema_errors = [f"schema: {'/'.join(map(str, e.path)) or '<root>'}: {e.message}"
                     for e in validator.iter_errors(definition)]
    fail(schema_errors)
    print("OK    JSON Schema conformance (v1alpha1)")

    errors, warnings = [], []
    hierarchy = definition["hierarchy"]
    levels = hierarchy["levels"]

    # S-1: levels end with 'device'.
    if levels[-1] != "device":
        errors.append("S-1: hierarchy.levels must end with 'device'")

    # S-2/S-3: scope ids and parent chains.
    scopes = {s["id"]: s for s in hierarchy["scopes"]}
    level_index = {lv: i for i, lv in enumerate(levels)}
    for s in hierarchy["scopes"]:
        level = s["id"].split("/", 1)[0]
        if level not in level_index or level == "device":
            errors.append(f"S-2: scope {s['id']}: level '{level}' not in levels[..-1]")
        parent = s["parent"]
        if parent is None:
            if level != levels[0]:
                errors.append(f"S-3: root scope {s['id']} must sit at first level '{levels[0]}'")
        else:
            if parent not in scopes:
                errors.append(f"S-3: scope {s['id']}: unknown parent {parent}")
            else:
                p_level = parent.split("/", 1)[0]
                if level_index.get(p_level, 99) >= level_index.get(level, -1):
                    errors.append(f"S-3: scope {s['id']}: parent {parent} does not step down the level order")
    # acyclicity via chain walk
    for sid in scopes:
        seen, cur = set(), sid
        while cur is not None:
            if cur in seen:
                errors.append(f"S-3: cycle at scope {cur}")
                break
            seen.add(cur)
            cur = scopes[cur]["parent"] if cur in scopes else None

    # S-4: layer files exist, parse, and carry no derived keys. Collect binding tokens.
    tokens = set()
    def check_layer(path_str, owner):
        p = root / path_str
        if not p.is_file():
            errors.append(f"layer: {owner}: file not found: {path_str}")
            return
        text = p.read_text(encoding="utf-8")
        tokens.update(BINDING_RE.findall(text))
        try:
            # Tokens always sit inside JSON strings ("${binding:x}"), so replace the token text
            # only, leaving the surrounding quotes intact.
            body = json.loads(BINDING_RE.sub("0", text))
        except json.JSONDecodeError as exc:
            errors.append(f"layer: {owner}: {path_str} is not valid JSON: {exc}")
            return
        for k in ("hierarchy", "identity"):
            if k in body:
                errors.append(f"S-4: {path_str}: derived key '{k}' is forbidden in authored layers")

    for s in hierarchy["scopes"]:
        if "layer" in s:
            check_layer(s["layer"], f"scope {s['id']}")

    # Nodes: S-7 (leaf paths), S-8 (scope refs, unique keys), S-9 (bootstrap), launch sanity.
    keys = set()
    for node in definition["nodes"]:
        key = node["key"]
        if key in keys:
            errors.append(f"S-8: duplicate node key {key}")
        keys.add(key)
        if node["scope"] not in scopes:
            errors.append(f"S-8: node {key}: unknown scope {node['scope']}")
        thing = node.get("identity", {}).get("thingName", key)
        if thing != key:
            warnings.append(f"note: node {key}: thingName '{thing}' diverges from key - runtime-identity consequence must be surfaced")
        cp = node.get("configProvider")
        uses_cc = any(c["configSource"] == "CONFIG_COMPONENT" for c in node["components"])
        if cp and cp["configSource"] == "CONFIG_COMPONENT":
            errors.append(f"S-9: node {key}: configProvider bootstrap must not be CONFIG_COMPONENT")
        if cp and "layer" in cp:
            check_layer(cp["layer"], f"{key}/configProvider")
        if uses_cc and not cp:
            errors.append(f"node {key}: components use CONFIG_COMPONENT but node has no configProvider")
        for comp in node["components"]:
            if "layer" in comp:
                check_layer(comp["layer"], f"{key}/{comp['name']}")
            elif comp["configSource"] == "CONFIG_COMPONENT":
                errors.append(f"node {key}/{comp['name']}: CONFIG_COMPONENT requires a layer (catalog leaf)")
            art = comp.get("artifact", {})
            if not art.get("version") and not art.get("source"):
                errors.append(f"S-6: node {key}/{comp['name']}: artifact needs version and/or source")

    # S-5: binding tokens resolve in each (or the chosen) environment.
    for env in definition["environments"]:
        if env_name and env["name"] != env_name:
            continue
        bpath = root / env["bindings"]
        if not bpath.is_file():
            errors.append(f"S-5: environment {env['name']}: bindings file missing: {env['bindings']}")
            continue
        bindings = json.loads(bpath.read_text(encoding="utf-8"))
        for tok in sorted(tokens):
            cur = bindings
            for part in tok.split("."):
                cur = cur.get(part) if isinstance(cur, dict) else None
            if cur is None:
                errors.append(f"S-5: environment {env['name']}: unresolved binding '{tok}'")
        print(f"OK    S-5 bindings resolve for environment '{env['name']}' ({len(tokens)} token(s): {', '.join(sorted(tokens)) or 'none'})")

    for w in warnings:
        print(f"WARN  {w}")
    fail(errors)
    print(f"OK    semantic rules S-1..S-9 ({len(definition['nodes'])} nodes, {len(scopes)} scopes, "
          f"{sum(len(n['components']) for n in definition['nodes'])} component assignments)")

if __name__ == "__main__":
    main()
