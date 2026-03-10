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

def test_should_use_cached(monkeypatch):
    from backend.imdb_service import should_use_cached
    from datetime import datetime, timezone, timedelta

    now = datetime(2024, 3, 20, 12, 0, 0, tzinfo=timezone.utc)

    class MockDatetime:
        @classmethod
        def now(cls, tz=None):
            return now

        @classmethod
        def fromisoformat(cls, date_string):
            return datetime.fromisoformat(date_string)

    monkeypatch.setattr("backend.imdb_service.datetime", MockDatetime)


    # If force is True, we shouldn't use cached regardless of the date
    assert should_use_cached(last_checked_at=now.isoformat(), force=True) is False
    assert should_use_cached(last_checked_at=None, force=True) is False

    # If force is False, but last_checked_at is None or invalid, we shouldn't use cached
    assert should_use_cached(last_checked_at=None, force=False) is False
    assert should_use_cached(last_checked_at="invalid-date", force=False) is False

    # Valid dates within CACHE_TTL_DAYS (7 days) should return True
    three_days_ago = now - timedelta(days=3)
    assert should_use_cached(last_checked_at=three_days_ago.isoformat(), force=False) is True

    # Exactly 7 days ago shouldn't use cached (since it's < timedelta(days=CACHE_TTL_DAYS))
    seven_days_ago = now - timedelta(days=7)
    assert should_use_cached(last_checked_at=seven_days_ago.isoformat(), force=False) is False

    # Just under 7 days ago should use cached
    just_under_seven_days_ago = now - timedelta(days=6, hours=23, minutes=59, seconds=59)
    assert should_use_cached(last_checked_at=just_under_seven_days_ago.isoformat(), force=False) is True

    # More than 7 days ago shouldn't use cached
    eight_days_ago = now - timedelta(days=8)
    assert should_use_cached(last_checked_at=eight_days_ago.isoformat(), force=False) is False
