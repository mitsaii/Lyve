#!/usr/bin/env python3
"""Compare handles from artistInbox.ts against artistList.ts.

Usage:
  python scripts/diff_artist_inbox.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIST_LIST_FILE = ROOT / "lib" / "artistList.ts"
ARTIST_INBOX_FILE = ROOT / "lib" / "artistInbox.ts"

HANDLE_RE = re.compile(r"instagram:\s*'(@[^']+)'")
RAW_BLOCK_RE = re.compile(r"raw:\s*`([\s\S]*?)`", re.MULTILINE)
INLINE_HANDLE_RE = re.compile(r"@[^\s]+")


def normalize(handle: str) -> str:
    return handle.strip().rstrip(",;，；。") .lower()


def parse_artist_list_handles(content: str) -> set[str]:
    return {normalize(match) for match in HANDLE_RE.findall(content)}


def parse_artist_list_handle_occurrences(content: str) -> list[str]:
    return [normalize(match) for match in HANDLE_RE.findall(content)]


def parse_inbox_handles(content: str) -> set[str]:
    handles: set[str] = set()
    for block in RAW_BLOCK_RE.findall(content):
        for handle in INLINE_HANDLE_RE.findall(block):
            handles.add(normalize(handle))
    return handles


def main() -> None:
    artist_list_content = ARTIST_LIST_FILE.read_text(encoding="utf-8")
    artist_inbox_content = ARTIST_INBOX_FILE.read_text(encoding="utf-8")

    existing_occurrences = parse_artist_list_handle_occurrences(artist_list_content)
    existing = parse_artist_list_handles(artist_list_content)
    inbox = parse_inbox_handles(artist_inbox_content)

    missing = sorted(inbox - existing)
    duplicated_in_list = sorted({h for h in existing_occurrences if existing_occurrences.count(h) > 1})

    result = {
        "artistListCount": len(existing),
        "inboxCount": len(inbox),
        "missingCount": len(missing),
        "missingHandles": missing,
        "duplicatedInArtistList": duplicated_in_list,
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
