#!/usr/bin/env python3
"""
Link checker for Positron documentation.
Validates internal relative links in Markdown files.
Usage: python scripts/docs_link_check.py docs/
"""

import os
import re
import sys
from pathlib import Path

LINK_PATTERN = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
MD_EXTENSIONS = {".md"}


def find_md_files(root_dir):
    """Find all Markdown files under root_dir."""
    md_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            if Path(f).suffix.lower() in MD_EXTENSIONS:
                md_files.append(os.path.join(dirpath, f))
    return md_files


def extract_links(filepath):
    """Extract [text](url) links from a Markdown file."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    links = LINK_PATTERN.findall(content)
    return [
        (text, url)
        for text, url in links
        if not url.startswith(("http://", "https://", "mailto:", "#"))
    ]


def check_links(md_files, docs_root):
    """Check all internal links resolve to existing files."""
    broken = []
    checked = 0

    for src_file in md_files:
        src_dir = os.path.dirname(src_file)
        links = extract_links(src_file)

        for text, url in links:
            checked += 1
            # Skip anchor-only links
            clean_url = url.split("#")[0]
            if not clean_url:
                continue

            # Resolve relative path
            target = os.path.normpath(os.path.join(src_dir, clean_url))
            # Handle parent references (e.g. ../CONTRIBUTING.md)
            if target.startswith(".."):
                target = os.path.normpath(os.path.join(docs_root, "..", clean_url))

            # Try .md extension if missing
            if os.path.splitext(target)[1] not in MD_EXTENSIONS:
                if os.path.isdir(target):
                    target = os.path.join(target, "index.md")
                else:
                    target += ".md"

            if not os.path.exists(target):
                broken.append((src_file, url, target))

    return broken, checked


def main():
    if len(sys.argv) > 1:
        docs_root = sys.argv[1]
    else:
        docs_root = "docs"

    if not os.path.isdir(docs_root):
        print(f"Error: {docs_root} is not a directory")
        sys.exit(1)

    md_files = find_md_files(docs_root)
    print(f"Found {len(md_files)} Markdown files in {docs_root}")

    broken, checked = check_links(md_files, docs_root)

    if broken:
        print(f"\nBROKEN LINKS ({len(broken)}):")
        for src, url, target in broken:
            print(f"  {src}")
            print(f"    -> [{url}] expected at {target}")
        print(f"\n{len(broken)} broken links out of {checked} checked.")
        sys.exit(1)
    else:
        print(f"\nAll {checked} links are valid.")
        sys.exit(0)


if __name__ == "__main__":
    main()
