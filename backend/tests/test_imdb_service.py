import pytest
from datetime import datetime, timezone
from backend.imdb_service import parse_iso_datetime, _extract_rating_from_json_node

def test_parse_iso_datetime():
    assert parse_iso_datetime(None) is None
    assert parse_iso_datetime("") is None

    dt = parse_iso_datetime("2024-03-20T12:34:56Z")
    assert dt == datetime(2024, 3, 20, 12, 34, 56, tzinfo=timezone.utc)

    dt = parse_iso_datetime("2024-03-20T12:34:56+00:00")
    assert dt == datetime(2024, 3, 20, 12, 34, 56, tzinfo=timezone.utc)

    assert parse_iso_datetime("invalid-date") is None

def test_extract_rating_from_json_node_dict():
    node = {"aggregateRating": {"ratingValue": "8.5"}}
    assert _extract_rating_from_json_node(node) == 8.5

    node = {"aggregateRating": {"ratingValue": 7.2}}
    assert _extract_rating_from_json_node(node) == 7.2

def test_extract_rating_from_json_node_nested():
    node = {
        "main": {
            "ratings": {
                "aggregateRating": {"ratingValue": "9.1"}
            }
        }
    }
    assert _extract_rating_from_json_node(node) == 9.1

def test_extract_rating_from_json_node_list():
    node = [
        {"type": "other"},
        {"aggregateRating": {"ratingValue": "6.5"}}
    ]
    assert _extract_rating_from_json_node(node) == 6.5

def test_extract_rating_from_json_node_invalid():
    assert _extract_rating_from_json_node({}) is None
    assert _extract_rating_from_json_node({"aggregateRating": {}}) is None
    assert _extract_rating_from_json_node({"ratingValue": "8.5"}) is None # not inside aggregateRating
