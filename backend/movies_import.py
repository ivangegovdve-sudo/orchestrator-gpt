from __future__ import annotations

import re
from typing import Dict, List, Optional

try:
    from . import utils  # type: ignore
except ImportError:
    import utils  # type: ignore

PAREN_YEAR_RE = re.compile(r"\((?P<year>(?:19|20)\d{2})\)\s*$")
TRAILING_YEAR_RE = re.compile(r"\b(?P<year>(?:19|20)\d{2})\s*$")
WATCHED_PREFIX_RE = re.compile(r"^\s*--\s*")

TITLE_TAG_HINTS: Dict[str, List[str]] = {
    "abominable": ["cgi", "adventure", "emotional"],
    "luca": ["cgi", "funny", "emotional"],
    "the bad guys": ["cgi", "funny", "adventure"],
    "the mitchells vs. the machines": ["cgi", "funny", "adventure"],
    "song of the sea": ["2d", "adventure", "emotional"],
    "kubo and the two strings": ["stop-motion", "adventure", "emotional", "scary-lite"],
    "mary and max": ["stop-motion", "emotional"],
    "the secret world of arrietty": ["anime-ish", "2d", "adventure", "emotional"],
    "legend of the guardians: the owls of ga'hoole": ["cgi", "adventure", "scary-lite"],
    "klaus": ["2d", "funny", "emotional"],
    "the iron giant": ["2d", "adventure", "emotional"],
    "lion king": ["2d", "adventure", "emotional"],
    "nimona": ["cgi", "adventure", "funny"],
}


def parse_movie_line(
    line: str,
    default_age_band: str = "Family",
    default_tags: Optional[List[str]] = None,
) -> Optional[Dict[str, object]]:
    """Parse a single seed/import line into a normalized movie payload."""
    raw = (line or "").strip()
    if not raw:
        return None

    watched = bool(WATCHED_PREFIX_RE.match(raw))
    cleaned = WATCHED_PREFIX_RE.sub("", raw).strip() if watched else raw
    cleaned = cleaned.lstrip("-*\u2022 ").strip()
    if not cleaned:
        return None

    year = None
    year_match = PAREN_YEAR_RE.search(cleaned)
    if year_match:
        year = int(year_match.group("year"))
        cleaned = cleaned[: year_match.start()].strip()
    else:
        trailing_match = TRAILING_YEAR_RE.search(cleaned)
        if trailing_match:
            year = int(trailing_match.group("year"))
            cleaned = cleaned[: trailing_match.start()].strip()

    localized_title = None
    title = cleaned
    if "/" in cleaned:
        left, right = cleaned.split("/", 1)
        title = left.strip()
        localized_title = right.strip() or None

    if not title:
        return None

    notes = None
    if localized_title:
        notes = f"Localized title: {localized_title}"

    tags: List[str] = utils.normalize_tag_list(default_tags)
    if "animated" not in tags:
        tags.append("animated")

    hinted_tags = TITLE_TAG_HINTS.get(title.lower(), [])
    for hint in hinted_tags:
        if hint not in tags:
            tags.append(hint)

    return {
        "title": title,
        "year": year,
        "imdb_score": None,
        "age_band": default_age_band or "Family",
        "watched": watched,
        "notes": notes,
        "localized_title": localized_title,
        "tags": tags,
    }


def parse_bulk_lines(
    text: str,
    default_age_band: str = "Family",
    default_tags: Optional[List[str]] = None,
) -> List[Dict[str, object]]:
    parsed: List[Dict[str, object]] = []
    for line in (text or "").splitlines():
        item = parse_movie_line(
            line,
            default_age_band=default_age_band,
            default_tags=default_tags,
        )
        if item:
            parsed.append(item)
    return parsed
