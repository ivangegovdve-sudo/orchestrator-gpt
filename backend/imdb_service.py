from __future__ import annotations

import json
import logging
import re
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import unescape
from typing import Any, Dict, Optional
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
DURATION_RE = re.compile(r"PT(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?")


@dataclass
class IMDbUpdateResult:
    ok: bool
    used_cache: bool
    imdb_score: Optional[float]
    imdb_id: Optional[str]
    imdb_source_url: Optional[str]
    poster_url: Optional[str]
    runtime_minutes: Optional[int]
    checked_at: str
    error: Optional[str] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO 8601 datetime string into a datetime object."""
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


def _parse_duration(duration_str: Optional[str]) -> Optional[int]:
    """Parse ISO 8601 duration string like PT2H22M into total minutes."""
    if not duration_str:
        return None
    match = DURATION_RE.match(duration_str)
    if not match:
        return None

    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)

    if hours == 0 and minutes == 0:
        return None

    return hours * 60 + minutes


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

    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            raw = response.read()
            return raw.decode("utf-8", errors="ignore")
    except Exception as exc:
        logging.error(f"Error fetching URL {url}: {exc}")
        raise


def _extract_info_from_json_node(node: Any) -> Dict[str, Any]:
    """Extract rating, poster, and duration from LD+JSON node."""
    res = {"rating": None, "poster": None, "duration": None}

    if isinstance(node, dict):
        if node.get("@type") == "Movie" or "aggregateRating" in node or "image" in node:
            # Rating
            aggregate = node.get("aggregateRating")
            if isinstance(aggregate, dict):
                val = aggregate.get("ratingValue")
                if val is not None:
                    try:
                        res["rating"] = float(val)
                    except (TypeError, ValueError):
                        pass

            # Image (Poster)
            image = node.get("image")
            if isinstance(image, str):
                res["poster"] = image
            elif isinstance(image, dict):
                res["poster"] = image.get("url")

            # Duration
            res["duration"] = _parse_duration(node.get("duration"))

        # Recurse if something is still missing
        if not all(res.values()):
            for value in node.values():
                nested = _extract_info_from_json_node(value)
                for k in res:
                    if res[k] is None and nested[k] is not None:
                        res[k] = nested[k]

    elif isinstance(node, list):
        for value in node:
            nested = _extract_info_from_json_node(value)
            for k in res:
                if res[k] is None and nested[k] is not None:
                    res[k] = nested[k]

    return res


def _parse_data_from_title_html(html: str) -> Dict[str, Any]:
    res = {"rating": None, "poster": None, "duration": None}

    for script_content in LD_JSON_RE.findall(html):
        text = unescape((script_content or "").strip())
        if not text:
            continue
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            logging.warning(f"Failed to parse LD+JSON script block: {exc}")
            continue

        extracted = _extract_info_from_json_node(payload)
        for k in res:
            if res[k] is None and extracted[k] is not None:
                res[k] = extracted[k]

    # Fallback for rating only if still missing
    if res["rating"] is None:
        regex_match = RATING_VALUE_RE.search(html)
        if regex_match:
            try:
                res["rating"] = float(regex_match.group("value"))
            except (TypeError, ValueError):
                pass

    return res


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


def _fetch_title_data_by_id(imdb_id: str) -> tuple[Dict[str, Any], str]:
    imdb_id = imdb_id.strip()
    source_url = IMDB_TITLE_URL.format(imdb_id=imdb_id)
    html = _rate_limited_fetch(source_url)
    data = _parse_data_from_title_html(html)
    return data, source_url


def _search_imdb_id(title: str, year: Optional[int]) -> Optional[str]:
    query_parts = [title]
    if year:
        query_parts.append(str(year))

    query = quote_plus(" ".join(query_parts))
    url = IMDB_SEARCH_URL.format(query=query)
    html = _rate_limited_fetch(url)
    return _parse_best_title_id_from_search(html, expected_year=year)


def refresh_imdb_data(
    title: str,
    year: Optional[int],
    imdb_id: Optional[str],
    force: bool = False,
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
                    poster_url=None,
                    runtime_minutes=None,
                    checked_at=checked_at,
                    error="IMDb search did not return a title match.",
                )

        data, source_url = _fetch_title_data_by_id(selected_id)

        return IMDbUpdateResult(
            ok=True,
            used_cache=False,
            imdb_score=data["rating"],
            imdb_id=selected_id,
            imdb_source_url=source_url,
            poster_url=data["poster"],
            runtime_minutes=data["duration"],
            checked_at=checked_at,
            error=None if data["rating"] is not None else "IMDb rating could not be parsed.",
        )
    except Exception as exc:
        return IMDbUpdateResult(
            ok=False,
            used_cache=False,
            imdb_score=None,
            imdb_id=imdb_id,
            imdb_source_url=None,
            poster_url=None,
            runtime_minutes=None,
            checked_at=checked_at,
            error=f"IMDb fetch failed: {exc}",
        )

# Maintain backward compatibility alias
def refresh_imdb_score(title: str, year: Optional[int], imdb_id: Optional[str], force: bool = False) -> IMDbUpdateResult:
    return refresh_imdb_data(title, year, imdb_id, force=force)
