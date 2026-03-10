from typing import List, Optional, Set
import re

TAG_VALID_RE = re.compile(r"^[a-z0-9\-_ ]+$")

def parse_tags(tag_csv: Optional[str]) -> List[str]:
    """Parse a comma-separated string of tags into a list of lowercase, stripped strings."""
    if not tag_csv:
        return []

    tags = []
    seen: Set[str] = set()
    for part in tag_csv.split(","):
        cleaned = part.strip().lower()
        if cleaned and cleaned not in seen:
            tags.append(cleaned)
            seen.add(cleaned)
    return tags

def validate_tag(tag: str, min_length: int = 2, max_length: int = 40) -> bool:
    """Check if a tag meets naming and length constraints."""
    if not (min_length <= len(tag) <= max_length):
        return False
    return bool(TAG_VALID_RE.match(tag))

def deduplicate_tags(tags: List[str]) -> List[str]:
    """Remove duplicate tags while preserving original order."""
    seen: Set[str] = set()
    result = []
    for t in tags:
        if t not in seen:
            result.append(t)
            seen.add(t)
    return result
