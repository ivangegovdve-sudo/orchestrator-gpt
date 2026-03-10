import pytest
from datetime import datetime, timezone
from backend.imdb_service import (
    parse_iso_datetime,
    _extract_info_from_json_node,
    _parse_duration,
)

def test_parse_iso_datetime():
    assert parse_iso_datetime(None) is None
    assert parse_iso_datetime("") is None

    dt = parse_iso_datetime("2024-03-20T12:34:56Z")
    assert dt == datetime(2024, 3, 20, 12, 34, 56, tzinfo=timezone.utc)

    dt = parse_iso_datetime("2024-03-20T12:34:56+00:00")
    assert dt == datetime(2024, 3, 20, 12, 34, 56, tzinfo=timezone.utc)

    assert parse_iso_datetime("invalid-date") is None

def test_extract_info_from_json_node_dict():
    node = {
        "@type": "Movie",
        "aggregateRating": {"ratingValue": "8.5"},
        "image": "http://poster.url",
        "duration": "PT2H22M",
    }
    res = _extract_info_from_json_node(node)
    assert res["rating"] == 8.5
    assert res["poster"] == "http://poster.url"
    assert res["duration"] == 142

def test_extract_info_from_json_node_nested():
    node = {
        "main": {
            "movie": {
                "@type": "Movie",
                "aggregateRating": {"ratingValue": "9.1"},
                "image": {"url": "http://poster.url"},
            }
        }
    }
    res = _extract_info_from_json_node(node)
    assert res["rating"] == 9.1
    assert res["poster"] == "http://poster.url"

def test_extract_info_from_json_node_list():
    node = [
        {"type": "other"},
        {"aggregateRating": {"ratingValue": "6.5"}, "duration": "PT90M"}
    ]
    res = _extract_info_from_json_node(node)
    assert res["rating"] == 6.5
    assert res["duration"] == 90

def test_extract_info_from_json_node_invalid():
    res = _extract_info_from_json_node({})
    assert res["rating"] is None
    assert res["poster"] is None
    assert res["duration"] is None

def test_parse_duration():
    assert _parse_duration("PT2H22M") == 142
    assert _parse_duration("PT1H") == 60
    assert _parse_duration("PT45M") == 45
    assert _parse_duration("PT0M") is None
    assert _parse_duration("") is None
    assert _parse_duration("invalid") is None
