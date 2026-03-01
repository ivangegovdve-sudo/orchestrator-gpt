from __future__ import annotations

import json
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import unescape
from typing import Any, Optional
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

IMDB_BASE_URL = "https://www.imdb.com"
IMDB_TITLE_URL = IMDB_BASE_URL + "/title/{imdb_id}/"
IMDB_SEARCH_URL = IMDB_BASE_URL + "/find/?q={query}&s=tt&ttype=ft&ref_=fn_ft"

REQUEST_TIMEOUT_SECONDS = 12
GLOBAL_RATE_SECONDS = 1.0
CACHE_TTL_DAYS = 7

_RATE_LOCK = threading.Lock()
_NEXT_ALLOWED_TS = 0.0

TITLE_ID_RE = re.compile(r"/title/(tt\d{7,8})/")
LD_JSON_RE = re.compile(
    r"<script[^>]+type=['\"]application/ld\+json['\"][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)
RATING_VALUE_RE = re.compile(r'"ratingValue"\s*:\s*"?(?P<value>\d+(?:\.\d+)?)"?')
YEAR_RE = re.compile(r"\b((?:19|20)\d{2})\b")


@dataclass
class IMDbUpdateResult:
    ok: bool
    used_cache: bool
    imdb_score: Optional[float]
    imdb_id: Optional[str]
    imdb_source_url: Optional[str]
    checked_at: str
    error: Optional[str] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def should_use_cached(last_checked_at: Optional[str], force: bool) -> bool:
    if force:
        return False

    last = parse_iso_datetime(last_checked_at)
    if not last:
        return False

    return datetime.now(timezone.utc) - last < timedelta(days=CACHE_TTL_DAYS)


def _rate_limited_fetch(url: str) -> str:
    global _NEXT_ALLOWED_TS

    with _RATE_LOCK:
        now = time.monotonic()
        wait_seconds = max(0.0, _NEXT_ALLOWED_TS - now)
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        _NEXT_ALLOWED_TS = max(_NEXT_ALLOWED_TS, time.monotonic()) + GLOBAL_RATE_SECONDS

    req = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    )

    with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        raw = response.read()
        return raw.decode("utf-8", errors="ignore")


def _extract_rating_from_json_node(node: Any) -> Optional[float]:
    if isinstance(node, dict):
        aggregate = node.get("aggregateRating")
        if isinstance(aggregate, dict):
            value = aggregate.get("ratingValue")
            if value is not None:
                try:
                    return float(value)
                except (TypeError, ValueError):
                    pass

        for value in node.values():
            nested = _extract_rating_from_json_node(value)
            if nested is not None:
                return nested

    if isinstance(node, list):
        for value in node:
            nested = _extract_rating_from_json_node(value)
            if nested is not None:
                return nested

    return None


def _parse_rating_from_title_html(html: str) -> Optional[float]:
    for script_content in LD_JSON_RE.findall(html):
        text = unescape((script_content or "").strip())
        if not text:
            continue
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            continue

        rating = _extract_rating_from_json_node(payload)
        if rating is not None:
            return rating

    regex_match = RATING_VALUE_RE.search(html)
    if regex_match:
        try:
            return float(regex_match.group("value"))
        except (TypeError, ValueError):
            return None

    return None


def _parse_best_title_id_from_search(html: str, expected_year: Optional[int]) -> Optional[str]:
    candidates: list[str] = []
    seen = set()

    for imdb_id in TITLE_ID_RE.findall(html):
        if imdb_id in seen:
            continue
        seen.add(imdb_id)
        candidates.append(imdb_id)

    if not candidates:
        return None

    if expected_year:
        for imdb_id in candidates:
            context_pattern = re.compile(
                rf'href="/title/{re.escape(imdb_id)}/[^\"]*"(?P<context>.{{0,320}})',
                re.IGNORECASE | re.DOTALL,
            )
            match = context_pattern.search(html)
            if not match:
                continue
            context = unescape(match.group("context"))
            years = YEAR_RE.findall(context)
            if any(int(year) == expected_year for year in years):
                return imdb_id

    return candidates[0]


def _fetch_title_score_by_id(imdb_id: str) -> tuple[Optional[float], str]:
    imdb_id = imdb_id.strip()
    source_url = IMDB_TITLE_URL.format(imdb_id=imdb_id)
    html = _rate_limited_fetch(source_url)
    score = _parse_rating_from_title_html(html)
    return score, source_url


def _search_imdb_id(title: str, year: Optional[int]) -> Optional[str]:
    query_parts = [title]
    if year:
        query_parts.append(str(year))

    query = quote_plus(" ".join(query_parts))
    url = IMDB_SEARCH_URL.format(query=query)
    html = _rate_limited_fetch(url)
    return _parse_best_title_id_from_search(html, expected_year=year)


def refresh_imdb_score(
    title: str,
    year: Optional[int],
    imdb_id: Optional[str],
) -> IMDbUpdateResult:
    checked_at = now_iso()

    try:
        selected_id = imdb_id.strip() if imdb_id else None

        if not selected_id:
            selected_id = _search_imdb_id(title=title, year=year)
            if not selected_id:
                return IMDbUpdateResult(
                    ok=False,
                    used_cache=False,
                    imdb_score=None,
                    imdb_id=None,
                    imdb_source_url=None,
                    checked_at=checked_at,
                    error="IMDb search did not return a title match.",
                )

        score, source_url = _fetch_title_score_by_id(selected_id)
        if score is None:
            return IMDbUpdateResult(
                ok=False,
                used_cache=False,
                imdb_score=None,
                imdb_id=selected_id,
                imdb_source_url=source_url,
                checked_at=checked_at,
                error="IMDb rating could not be parsed from the title page.",
            )

        return IMDbUpdateResult(
            ok=True,
            used_cache=False,
            imdb_score=float(score),
            imdb_id=selected_id,
            imdb_source_url=source_url,
            checked_at=checked_at,
            error=None,
        )
    except Exception as exc:
        return IMDbUpdateResult(
            ok=False,
            used_cache=False,
            imdb_score=None,
            imdb_id=imdb_id,
            imdb_source_url=None,
            checked_at=checked_at,
            error=f"IMDb fetch failed: {exc}",
        )
