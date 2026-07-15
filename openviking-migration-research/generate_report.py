#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parent
FIELDS = ROOT / "fields.yaml"
RESULTS = ROOT / "results"
OUTPUT = ROOT / "report.md"


def anchor(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def render(value, indent: int = 0) -> list[str]:
    prefix = "  " * indent
    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            if isinstance(item, dict):
                text = " | ".join(f"{key}: {val}" for key, val in item.items())
                lines.append(f"{prefix}- {text}")
            else:
                lines.append(f"{prefix}- {item}")
        return lines or [f"{prefix}- None"]
    if isinstance(value, dict):
        return [f"{prefix}- **{key}:** {val}" for key, val in value.items()]
    return [f"{prefix}{value}"]


def main() -> None:
    schema = yaml.safe_load(FIELDS.read_text(encoding="utf-8"))
    records = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(RESULTS.glob("*.json"))]
    lines = [
        "# OpenViking Migration Deep Research",
        "",
        "Generated from validated structured records. Current official sources are weighted above community claims.",
        "",
        "## Contents",
        "",
    ]
    for record in records:
        lines.append(f"- [{record['name']}](#{anchor(record['name'])}) — {record['current_version_or_commit']}")
    for record in records:
        uncertain = set(record.get("uncertain", []))
        lines.extend(["", f"## {record['name']}", ""])
        for category in schema["field_categories"]:
            rendered = []
            for field in category["fields"]:
                name = field["name"]
                if name == "uncertain" or name in uncertain or name not in record:
                    continue
                rendered.extend([f"### {name.replace('_', ' ').title()}", "", *render(record[name]), ""])
            if rendered:
                lines.extend([f"### {category['category']}", "", *rendered])
        if uncertain:
            lines.extend(["### Uncertain fields", "", *[f"- {item}" for item in sorted(uncertain)], ""])
    OUTPUT.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
