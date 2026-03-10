from typing import List, Optional, Set, Iterable
import re

TAG_VALID_RE = re.compile(r"^[a-z0-9\-_ ]+$")

def normalize_tag_list(tags: Optional[Iterable[str]]) -> List[str]:
    """Normalize a list of tags: strip, lowercase, and deduplicate while preserving order."""
    if not tags:
        return []

    out: List[str] = []
    seen: Set[str] = set()
    for tag in tags:
        clean = (tag or "").strip().lower()
        if clean and clean not in seen:
            out.append(clean)
            seen.add(clean)
    return out

def parse_tags(tag_csv: Optional[str]) -> List[str]:
    """Parse a comma-separated string of tags into a normalized list of tags."""
    if not tag_csv:
        return []
    return normalize_tag_list(tag_csv.split(","))

def validate_tag(tag: str, min_length: int = 2, max_length: int = 40) -> bool:
    """Check if a tag meets naming and length constraints."""
    if not (min_length <= len(tag) <= max_length):
        return False
    return bool(TAG_VALID_RE.match(tag))

def deduplicate_tags(tags: List[str]) -> List[str]:
    """Remove duplicate tags while preserving original order (case-sensitive)."""
    seen: Set[str] = set()
    result = []
    for t in tags:
        if t not in seen:
            result.append(t)
            seen.add(t)
    return result
