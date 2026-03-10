import pytest
from backend.movies_db import normalize_tags

def test_normalize_tags_none():
    assert normalize_tags(None) == []

def test_normalize_tags_empty():
    assert normalize_tags([]) == []
    assert normalize_tags(()) == []

def test_normalize_tags_whitespace_only():
    assert normalize_tags(["   ", "\t", "\n"]) == []

def test_normalize_tags_single_tag():
    assert normalize_tags(["Action"]) == ["action"]

def test_normalize_tags_multiple_tags():
    assert normalize_tags(["Action", "Sci-Fi"]) == ["action", "sci-fi"]

def test_normalize_tags_mixed_case():
    assert normalize_tags(["aCtIoN", "sCI-FI"]) == ["action", "sci-fi"]

def test_normalize_tags_leading_trailing_whitespace():
    assert normalize_tags([" Action ", "  Sci-Fi\n"]) == ["action", "sci-fi"]

def test_normalize_tags_none_values():
    assert normalize_tags(["Action", None, "Sci-Fi"]) == ["action", "sci-fi"]

def test_normalize_tags_deduplication():
    assert normalize_tags(["action", "action", "sci-fi", "Action"]) == ["action", "sci-fi"]

def test_normalize_tags_order_preservation():
    assert normalize_tags(["sci-fi", "action", "sci-fi"]) == ["sci-fi", "action"]
