import pytest
from backend.utils import (
    parse_tags,
    validate_tag,
    deduplicate_tags,
    normalize_tag_list,
)

def test_parse_tags_none():
    assert parse_tags(None) == []

def test_parse_tags_empty():
    assert parse_tags("") == []

def test_parse_tags_whitespace_only():
    assert parse_tags("   ") == []

def test_parse_tags_single_tag():
    assert parse_tags("Action") == ["action"]

def test_parse_tags_multiple_tags():
    assert parse_tags("Action, Sci-Fi") == ["action", "sci-fi"]

def test_parse_tags_mixed_case():
    assert parse_tags("aCtIoN") == ["action"]

def test_parse_tags_extra_whitespace():
    assert parse_tags(" Action , Sci-Fi  ") == ["action", "sci-fi"]

def test_parse_tags_empty_parts():
    assert parse_tags("Action,,Sci-Fi,") == ["action", "sci-fi"]

def test_parse_tags_deduplication():
    assert parse_tags("action, action, sci-fi") == ["action", "sci-fi"]

def test_validate_tag_valid():
    assert validate_tag("action") is True
    assert validate_tag("sci-fi") is True
    assert validate_tag("genre 123") is True
    assert validate_tag("a_b") is True

def test_validate_tag_invalid():
    assert validate_tag("a") is False # too short
    assert validate_tag("a" * 41) is False # too long
    assert validate_tag("tag!") is False # invalid char
    assert validate_tag("tag@") is False # invalid char
    assert validate_tag("") is False

def test_deduplicate_tags():
    assert deduplicate_tags(["a", "b", "a", "c", "b"]) == ["a", "b", "c"]
    assert deduplicate_tags([]) == []
    assert deduplicate_tags(["a", "A"]) == ["a", "A"] # case sensitive deduplication

def test_normalize_tag_list():
    assert normalize_tag_list([" A ", "b", "a"]) == ["a", "b"]
    assert normalize_tag_list(None) == []
