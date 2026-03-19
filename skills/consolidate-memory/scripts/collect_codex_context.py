from __future__ import annotations

import argparse
import json
import os
import re
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


PREFERENCE_PATTERNS = (
    "always",
    "never",
    "prefer",
    "avoid",
    "do not",
    "don't",
    "must",
    "should",
    "keep",
    "inline",
    "reference",
    "load",
    "schedule",
)

DECISION_PATTERNS = (
    "build",
    "create",
    "update",
    "add",
    "remove",
    "fix",
    "schedule",
    "use",
    "keep",
    "filter",
    "wire",
)

FACT_PATTERNS = (
    "memory/",
    "skills/",
    "backend/",
    "web/",
    "http://",
    "https://",
    "CODEX.md",
    "AGENTS.md",
    "FastAPI",
    "SQLite",
)

PATH_RE = re.compile(
    r"([A-Za-z]:\\\\[^\s`\"']+|~\/[^\s`\"']+|(?:memory|skills|backend|web|data|config|frontend|movies|docs|scratch)\/[^\s`\"']+)"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect recent Codex session context for repo-local memory consolidation."
    )
    parser.add_argument(
        "--codex-home",
        default=os.environ.get("CODEX_HOME") or str(Path.home() / ".codex"),
        help="Path to the Codex home directory. Defaults to $CODEX_HOME or ~/.codex.",
    )
    parser.add_argument(
        "--repo-root",
        default=str(Path.cwd()),
        help="Repo root used to filter relevant sessions. Defaults to the current working directory.",
    )
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Look back window in hours. Defaults to 24.",
    )
    parser.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="Output format. Defaults to markdown.",
    )
    parser.add_argument(
        "--max-lines-per-message",
        type=int,
        default=5,
        help="Maximum number of lines to keep from each message excerpt.",
    )
    parser.add_argument(
        "--max-chars-per-line",
        type=int,
        default=240,
        help="Maximum length of a rendered line before truncation.",
    )
    return parser.parse_args()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso8601(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def normalize_text(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def truncate(text: str, max_chars: int) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return f"{text[: max_chars - 3].rstrip()}..."


def dedupe(items: Iterable[str]) -> list[str]:
    seen: OrderedDict[str, None] = OrderedDict()
    for item in items:
        normalized = item.strip()
        if normalized and normalized not in seen:
            seen[normalized] = None
    return list(seen.keys())


def is_same_or_child(candidate: str | None, root: Path) -> bool:
    if not candidate:
        return False
    try:
        candidate_path = Path(candidate).resolve()
        root_path = root.resolve()
    except OSError:
        candidate_path = Path(candidate)
        root_path = root
    candidate_parts = [part.lower() for part in candidate_path.parts]
    root_parts = [part.lower() for part in root_path.parts]
    return candidate_parts[: len(root_parts)] == root_parts


def message_text(content: list[dict[str, object]] | None) -> str:
    if not content:
        return ""
    parts: list[str] = []
    for item in content:
        if item.get("type") not in {"input_text", "output_text"}:
            continue
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
    return normalize_text("\n\n".join(parts))


def strip_context_dump(text: str) -> str:
    if "# AGENTS.md instructions for " in text and "<INSTRUCTIONS>" in text:
        return "Repo bootstrap prompt supplied AGENTS.md instructions and environment context."
    if len(text) > 15000:
        return truncate(text, 600)
    return text


def line_candidates(text: str, max_lines: int, max_chars: int) -> list[str]:
    lines: list[str] = []
    for raw_line in normalize_text(text).splitlines():
        line = raw_line.strip().lstrip("-*").strip()
        if not line:
            continue
        if line.startswith("<") and line.endswith(">"):
            continue
        if line.startswith("```"):
            continue
        lines.append(truncate(line, max_chars))
        if len(lines) >= max_lines:
            break
    return lines


def extract_matches(text: str, patterns: tuple[str, ...], max_chars: int) -> list[str]:
    matches: list[str] = []
    for line in line_candidates(text, max_lines=12, max_chars=max_chars):
        lowered = line.lower()
        if any(pattern in lowered for pattern in patterns):
            matches.append(line)
    return matches


def extract_paths(text: str) -> list[str]:
    return dedupe(match.group(1) for match in PATH_RE.finditer(text))


def relevant_session_dirs(codex_home: Path, cutoff: datetime, now: datetime) -> list[Path]:
    directories: list[Path] = []
    day = cutoff.date()
    end_day = now.date()
    while day <= end_day:
        directories.append(codex_home / "sessions" / f"{day.year:04d}" / f"{day.month:02d}" / f"{day.day:02d}")
        day += timedelta(days=1)
    return directories


def parse_session_file(
    path: Path,
    repo_root: Path,
    cutoff: datetime,
    max_lines: int,
    max_chars: int,
) -> dict[str, object] | None:
    session: dict[str, object] = {
        "file": str(path),
        "cwd": None,
        "timestamp": None,
        "messages": [],
    }

    try:
        raw_lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None

    for raw_line in raw_lines:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            item = json.loads(raw_line)
        except json.JSONDecodeError:
            continue

        item_type = item.get("type")
        payload = item.get("payload", {})
        item_timestamp = parse_iso8601(item.get("timestamp"))

        if item_type == "session_meta":
            session["cwd"] = payload.get("cwd")
            session["timestamp"] = payload.get("timestamp")
            continue

        if item_type != "response_item":
            continue
        if payload.get("type") != "message":
            continue

        role = payload.get("role")
        if role not in {"user", "assistant"}:
            continue

        text = message_text(payload.get("content"))
        if not text:
            continue

        text = strip_context_dump(text)
        excerpt = line_candidates(text, max_lines=max_lines, max_chars=max_chars)
        if not excerpt:
            continue

        messages = session["messages"]
        assert isinstance(messages, list)
        messages.append(
            {
                "role": role,
                "phase": payload.get("phase"),
                "timestamp": item_timestamp.isoformat() if item_timestamp else None,
                "text": text,
                "excerpt": excerpt,
            }
        )

    session_timestamp = parse_iso8601(session.get("timestamp"))
    if session_timestamp is None:
        try:
            session_timestamp = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        except OSError:
            session_timestamp = None

    cwd = session.get("cwd")
    if not is_same_or_child(cwd if isinstance(cwd, str) else None, repo_root):
        return None
    if session_timestamp is not None and session_timestamp < cutoff:
        return None

    messages = session["messages"]
    assert isinstance(messages, list)
    if not messages:
        return None

    return session


def fallback_history(codex_home: Path, cutoff: datetime, max_chars: int) -> list[dict[str, str]]:
    history_path = codex_home / "history.jsonl"
    if not history_path.exists():
        return []

    results: list[dict[str, str]] = []
    try:
        raw_lines = history_path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return results

    for raw_line in raw_lines:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            item = json.loads(raw_line)
        except json.JSONDecodeError:
            continue
        ts = item.get("ts")
        text = item.get("text")
        if not isinstance(ts, int) or not isinstance(text, str):
            continue
        timestamp = datetime.fromtimestamp(ts, tz=timezone.utc)
        if timestamp < cutoff:
            continue
        results.append(
            {
                "timestamp": timestamp.isoformat(),
                "text": truncate(normalize_text(text), max_chars),
            }
        )
    return results


def build_digest(
    codex_home: Path,
    repo_root: Path,
    hours: int,
    max_lines: int,
    max_chars: int,
) -> dict[str, object]:
    now = utc_now()
    cutoff = now - timedelta(hours=hours)

    sessions: list[dict[str, object]] = []
    for directory in relevant_session_dirs(codex_home, cutoff, now):
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.jsonl")):
            parsed = parse_session_file(path, repo_root, cutoff, max_lines=max_lines, max_chars=max_chars)
            if parsed is not None:
                sessions.append(parsed)

    sessions.sort(key=lambda item: item.get("timestamp") or "")

    preference_candidates: list[str] = []
    decision_candidates: list[str] = []
    fact_candidates: list[str] = []

    for session in sessions:
        cwd = session.get("cwd")
        if isinstance(cwd, str):
            fact_candidates.append(f"Relevant session cwd: {cwd}")
        messages = session.get("messages", [])
        assert isinstance(messages, list)
        for message in messages:
            text = message.get("text", "")
            if not isinstance(text, str):
                continue
            if message.get("role") == "user":
                preference_candidates.extend(extract_matches(text, PREFERENCE_PATTERNS, max_chars))
                decision_candidates.extend(extract_matches(text, DECISION_PATTERNS, max_chars))
                fact_candidates.extend(extract_matches(text, FACT_PATTERNS, max_chars))
                fact_candidates.extend(f"Path reference: {path}" for path in extract_paths(text))

    history = fallback_history(codex_home, cutoff, max_chars=max_chars) if not sessions else []

    return {
        "generated_at": now.isoformat(),
        "window_start": cutoff.isoformat(),
        "window_hours": hours,
        "repo_root": str(repo_root),
        "codex_home": str(codex_home),
        "sessions": sessions,
        "history_fallback": history,
        "candidate_preferences": dedupe(preference_candidates),
        "candidate_decisions": dedupe(decision_candidates),
        "candidate_facts": dedupe(fact_candidates),
    }


def render_markdown(digest: dict[str, object]) -> str:
    lines: list[str] = []
    lines.append("# Codex Context Digest")
    lines.append("")
    lines.append(f"- Generated: `{digest['generated_at']}`")
    lines.append(f"- Window start: `{digest['window_start']}`")
    lines.append(f"- Window hours: `{digest['window_hours']}`")
    lines.append(f"- Repo root: `{digest['repo_root']}`")
    lines.append(f"- Codex home: `{digest['codex_home']}`")
    sessions = digest["sessions"]
    assert isinstance(sessions, list)
    lines.append(f"- Relevant sessions: `{len(sessions)}`")
    lines.append("")

    for title, key in (
        ("Candidate Preferences", "candidate_preferences"),
        ("Candidate Decisions", "candidate_decisions"),
        ("Candidate Durable Facts", "candidate_facts"),
    ):
        values = digest[key]
        assert isinstance(values, list)
        lines.append(f"## {title}")
        if values:
            for value in values:
                lines.append(f"- {value}")
        else:
            lines.append("- None detected from the filtered window.")
        lines.append("")

    lines.append("## Session Excerpts")
    if sessions:
        for session in sessions:
            session_file = Path(str(session["file"])).name
            timestamp = session.get("timestamp") or "unknown"
            cwd = session.get("cwd") or "unknown"
            lines.append(f"### `{session_file}`")
            lines.append(f"- Session timestamp: `{timestamp}`")
            lines.append(f"- Session cwd: `{cwd}`")
            messages = session.get("messages", [])
            assert isinstance(messages, list)
            for message in messages:
                role = message.get("role", "unknown")
                phase = message.get("phase")
                label = role.capitalize()
                if phase:
                    label = f"{label} ({phase})"
                lines.append(f"- {label}:")
                excerpt = message.get("excerpt", [])
                assert isinstance(excerpt, list)
                for line in excerpt:
                    lines.append(f"  - {line}")
            lines.append("")
    else:
        lines.append("- No matching session logs were found for this repo in the selected time window.")
        lines.append("")

    history_fallback = digest.get("history_fallback", [])
    assert isinstance(history_fallback, list)
    if history_fallback:
        lines.append("## History Fallback")
        lines.append("- Session logs were unavailable or not matched to this repo; these history entries are unscoped.")
        for item in history_fallback:
            lines.append(f"- `{item['timestamp']}` {item['text']}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    args = parse_args()
    codex_home = Path(args.codex_home).expanduser()
    repo_root = Path(args.repo_root).resolve()

    digest = build_digest(
        codex_home=codex_home,
        repo_root=repo_root,
        hours=args.hours,
        max_lines=args.max_lines_per_message,
        max_chars=args.max_chars_per_line,
    )

    if args.format == "json":
        print(json.dumps(digest, indent=2))
    else:
        print(render_markdown(digest), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
