import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from backend.imdb_service import (
    _extract_info_from_json_node,
    _parse_data_from_title_html,
    _parse_duration,
    parse_iso_datetime,
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
        {"aggregateRating": {"ratingValue": "6.5"}, "duration": "PT90M"},
    ]
    res = _extract_info_from_json_node(node)
    assert res["rating"] == 6.5
    assert res["duration"] == 90


def test_extract_info_from_json_node_invalid():
    res = _extract_info_from_json_node({})
    assert res["rating"] is None
    assert res["poster"] is None
    assert res["duration"] is None


@pytest.mark.parametrize(
    "node",
    [
        {"aggregateRating": {"ratingValue": "N/A"}},
        {"aggregateRating": {"ratingValue": ["8.5"]}},
        {"aggregateRating": {"ratingValue": {"value": 8.5}}},
    ],
)
def test_extract_info_from_json_node_invalid_rating_value(node):
    res = _extract_info_from_json_node(node)
    assert res["rating"] is None


def test_parse_duration():
    assert _parse_duration("PT2H22M") == 142
    assert _parse_duration("PT1H") == 60
    assert _parse_duration("PT45M") == 45
    assert _parse_duration("PT0M") is None
    assert _parse_duration("") is None
    assert _parse_duration("invalid") is None


def test_should_use_cached():
    from backend.imdb_service import should_use_cached

    now = datetime(2024, 3, 20, 12, 0, 0, tzinfo=timezone.utc)

    with patch("backend.imdb_service.datetime", wraps=datetime) as mock_datetime:
        mock_datetime.now.return_value = now

        assert should_use_cached(last_checked_at=now.isoformat(), force=True) is False
        assert should_use_cached(last_checked_at=None, force=True) is False

        assert should_use_cached(last_checked_at=None, force=False) is False
        assert should_use_cached(last_checked_at="invalid-date", force=False) is False

        three_days_ago = now - timedelta(days=3)
        assert should_use_cached(last_checked_at=three_days_ago.isoformat(), force=False) is True

        seven_days_ago = now - timedelta(days=7)
        assert should_use_cached(last_checked_at=seven_days_ago.isoformat(), force=False) is False

        just_under_seven_days_ago = now - timedelta(days=6, hours=23, minutes=59, seconds=59)
        assert should_use_cached(last_checked_at=just_under_seven_days_ago.isoformat(), force=False) is True

        eight_days_ago = now - timedelta(days=8)
        assert should_use_cached(last_checked_at=eight_days_ago.isoformat(), force=False) is False


def test_parse_data_from_title_html_ld_json():
    html = """
    <html>
        <head>
            <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Movie",
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "8.5",
                        "bestRating": "10",
                        "ratingCount": "12345"
                    }
                }
            </script>
        </head>
        <body></body>
    </html>
    """
    data = _parse_data_from_title_html(html)
    assert data["rating"] == 8.5


def test_parse_data_from_title_html_regex_fallback():
    html = """
    <html>
        <body>
            <span class="rating">"ratingValue": "7.2"</span>
        </body>
    </html>
    """
    data = _parse_data_from_title_html(html)
    assert data["rating"] == 7.2


def test_parse_data_from_title_html_invalid_json_fallback_to_body_rating():
    html = """
    <html>
        <head>
            <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Movie",
                    "description": "broken json"
                # invalid json
            </script>
        </head>
        <body>
            <span class="rating">"ratingValue": "7.2"</span>
        </body>
    </html>
    """
    data = _parse_data_from_title_html(html)
    assert data["rating"] == 7.2


def test_parse_data_from_title_html_json_without_rating_fallback():
    html = """
    <html>
        <head>
            <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Movie",
                    "name": "Test Movie"
                }
            </script>
        </head>
        <body>
            <span class="rating">"ratingValue": "6.1"</span>
        </body>
    </html>
    """
    data = _parse_data_from_title_html(html)
    assert data["rating"] == 6.1


def test_parse_data_from_title_html_none():
    data = _parse_data_from_title_html("<html><body></body></html>")
    assert data["rating"] is None

    empty = _parse_data_from_title_html("")
    assert empty["rating"] is None


def test_parse_data_from_title_html_multiple_scripts():
    html = """
    <html>
        <head>
            <script type="application/ld+json">
                { "invalid json"
            </script>
            <script type="application/ld+json">
                {
                    "aggregateRating": {
                        "ratingValue": "9.0"
                    }
                }
            </script>
        </head>
        <body></body>
    </html>
    """
    data = _parse_data_from_title_html(html)
    assert data["rating"] == 9.0
