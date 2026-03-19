#!/usr/bin/env python3
"""Maintain the docs/memory.md and docs/long-term-memory.md marker blocks."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


MEMORY_PATH = Path("docs/memory.md")
LONG_TERM_PATH = Path("docs/long-term-memory.md")

CONFIRMED_START = "<!-- research-scout:confirmed_patterns:start -->"
CONFIRMED_END = "<!-- research-scout:confirmed_patterns:end -->"
LEARNINGS_START = "<!-- research-scout:new_learnings:start -->"
LEARNINGS_END = "<!-- research-scout:new_learnings:end -->"
PROMOTION_START = "<!-- research-scout:promotion_log:start -->"
PROMOTION_END = "<!-- research-scout:promotion_log:end -->"

MEMORY_TEMPLATE = """# Project Memory

Use this file for stable, confirmed knowledge that should influence future work in this workspace.

## confirmed_patterns
{confirmed_start}
_None yet._
{confirmed_end}
""".format(
    confirmed_start=CONFIRMED_START,
    confirmed_end=CONFIRMED_END,
)

LONG_TERM_TEMPLATE = """# Long-Term Memory

Use this file as a staging area for externally sourced findings before they are promoted into stable memory.

## new_learnings
{learnings_start}
_None staged yet._
{learnings_end}

## promotion_log
{promotion_start}
_No promotions yet._
{promotion_end}
""".format(
    learnings_start=LEARNINGS_START,
    learnings_end=LEARNINGS_END,
    promotion_start=PROMOTION_START,
    promotion_end=PROMOTION_END,
)

EMPTY_LEARNINGS = "_None staged yet._"
EMPTY_CONFIRMED = "_None yet._"
EMPTY_PROMOTIONS = "_No promotions yet._"


def ensure_memory_files(repo_root: Path) -> tuple[Path, Path]:
    memory_file = repo_root / MEMORY_PATH
    long_term_file = repo_root / LONG_TERM_PATH

    memory_file.parent.mkdir(parents=True, exist_ok=True)
    if not memory_file.exists():
        memory_file.write_text(MEMORY_TEMPLATE, encoding="utf-8")

    if not long_term_file.exists():
        long_term_file.write_text(LONG_TERM_TEMPLATE, encoding="utf-8")

    validate_marker_block(memory_file, CONFIRMED_START, CONFIRMED_END)
    validate_marker_block(long_term_file, LEARNINGS_START, LEARNINGS_END)
    validate_marker_block(long_term_file, PROMOTION_START, PROMOTION_END)
    return memory_file, long_term_file


def validate_marker_block(path: Path, start_marker: str, end_marker: str) -> None:
    text = path.read_text(encoding="utf-8")
    if start_marker not in text or end_marker not in text:
        raise SystemExit(f"Missing marker block in {path}: {start_marker} / {end_marker}")


def get_block_lines(text: str, start_marker: str, end_marker: str) -> list[str]:
    start_index = text.index(start_marker) + len(start_marker)
    end_index = text.index(end_marker)
    block = text[start_index:end_index].strip()
    if not block:
        return []
    return [line.strip() for line in block.splitlines() if line.strip()]


def replace_block(text: str, start_marker: str, end_marker: str, lines: list[str]) -> str:
    start_index = text.index(start_marker) + len(start_marker)
    end_index = text.index(end_marker)
    body = "\n".join(lines).strip()
    replacement = "\n"
    if body:
        replacement += body + "\n"
    return text[:start_index] + replacement + text[end_index:]


def format_staged_entry(timestamp: str, source: str, note: str) -> str:
    single_line_note = " ".join(note.split())
    single_line_source = " ".join(source.split())
    return f"- {timestamp} | {single_line_source} | {single_line_note}"


def stage_entry(repo_root: Path, timestamp: str, source: str, note: str) -> int:
    _, long_term_file = ensure_memory_files(repo_root)
    text = long_term_file.read_text(encoding="utf-8")
    entries = [line for line in get_block_lines(text, LEARNINGS_START, LEARNINGS_END) if line != EMPTY_LEARNINGS]

    entry = format_staged_entry(timestamp, source, note)
    if entry in entries:
        print(f"Skipped duplicate staged learning: {entry}")
        return 0

    entries.append(entry)
    updated = replace_block(text, LEARNINGS_START, LEARNINGS_END, entries)
    long_term_file.write_text(updated, encoding="utf-8")
    print(f"Staged learning in {long_term_file}: {entry}")
    return 0


def promote_entries(repo_root: Path, promotion_timestamp: str) -> int:
    memory_file, long_term_file = ensure_memory_files(repo_root)

    memory_text = memory_file.read_text(encoding="utf-8")
    long_term_text = long_term_file.read_text(encoding="utf-8")

    staged_entries = [line for line in get_block_lines(long_term_text, LEARNINGS_START, LEARNINGS_END) if line != EMPTY_LEARNINGS]
    if not staged_entries:
        print("No staged learnings to promote.")
        return 0

    confirmed_entries = [line for line in get_block_lines(memory_text, CONFIRMED_START, CONFIRMED_END) if line != EMPTY_CONFIRMED]
    promoted_entries = [
        f"- Confirmed {promotion_timestamp} | {entry.removeprefix('- ').strip()}"
        for entry in staged_entries
    ]

    for entry in promoted_entries:
        if entry not in confirmed_entries:
            confirmed_entries.append(entry)

    updated_memory = replace_block(memory_text, CONFIRMED_START, CONFIRMED_END, confirmed_entries)
    memory_file.write_text(updated_memory, encoding="utf-8")

    promotion_log = [line for line in get_block_lines(long_term_text, PROMOTION_START, PROMOTION_END) if line != EMPTY_PROMOTIONS]
    promotion_log.append(
        f"- {promotion_timestamp} | Promoted {len(staged_entries)} learning(s) into {MEMORY_PATH.as_posix()}"
    )

    long_term_text = replace_block(long_term_text, PROMOTION_START, PROMOTION_END, promotion_log)
    long_term_text = replace_block(long_term_text, LEARNINGS_START, LEARNINGS_END, [EMPTY_LEARNINGS])
    long_term_file.write_text(long_term_text, encoding="utf-8")

    print(f"Promoted {len(staged_entries)} learning(s) into {memory_file}.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Workspace root containing docs/memory.md and docs/long-term-memory.md",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("ensure", help="Create the memory files if they are missing")

    stage = subparsers.add_parser("stage", help="Append a staged learning")
    stage.add_argument("--timestamp", required=True, help="ISO-8601 timestamp")
    stage.add_argument("--source", required=True, help="Source URL")
    stage.add_argument("--note", required=True, help="One-line summary of the delta")

    promote = subparsers.add_parser("promote", help="Promote all staged learnings")
    promote.add_argument("--promotion-timestamp", required=True, help="ISO-8601 timestamp")

    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    repo_root = Path(args.repo_root).resolve()

    if args.command == "ensure":
        ensure_memory_files(repo_root)
        print(f"Ensured memory files under {repo_root}.")
        return 0

    if args.command == "stage":
        return stage_entry(repo_root, args.timestamp, args.source, args.note)

    if args.command == "promote":
        return promote_entries(repo_root, args.promotion_timestamp)

    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
