#!/usr/bin/env python3
"""Detect realistic secrets in documentation without flagging placeholders."""

from __future__ import annotations

import re
import sys
from pathlib import Path

TOKEN_PATTERNS = {
    "GitHub classic token": re.compile(r"\bghp_([A-Za-z0-9]{36})\b"),
    "GitHub fine-grained token": re.compile(r"\bgithub_pat_([A-Za-z0-9_]{22,})\b"),
    "OpenAI API key": re.compile(r"\bsk-([A-Za-z0-9]{20,})\b"),
    "JWT": re.compile(
        r"\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b"
    ),
}


def is_placeholder(secret: str) -> bool:
    normalized = secret.lower().replace("_", "")
    return (
        not normalized
        or set(normalized) <= {"x"}
        or "yourtoken" in normalized
        or "redacted" in normalized
    )


def markdown_files(arguments: list[str]) -> list[Path]:
    files: set[Path] = set()
    for raw_path in arguments:
        path = Path(raw_path)
        if path.is_file() and path.suffix.lower() == ".md":
            files.add(path)
        elif path.is_dir():
            if path == Path("."):
                files.update(candidate for candidate in path.glob("*.md") if candidate.is_file())
            else:
                files.update(candidate for candidate in path.rglob("*.md") if candidate.is_file())
    return sorted(files)


def main() -> int:
    inputs = sys.argv[1:] or ["docs", "."]
    findings: list[str] = []

    for path in markdown_files(inputs):
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for label, pattern in TOKEN_PATTERNS.items():
                for match in pattern.finditer(line):
                    secret = match.group(0)
                    suffix = match.group(1) if match.lastindex else secret
                    if not is_placeholder(suffix):
                        findings.append(f"{path}:{line_number}: {label}")

    if findings:
        print("Potential secrets found in documentation:", file=sys.stderr)
        for finding in findings:
            print(f"  {finding}", file=sys.stderr)
        return 1

    print("No realistic secrets found in documentation files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
