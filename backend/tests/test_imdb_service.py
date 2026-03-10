import pytest
from datetime import datetime, timezone
from backend.imdb_service import parse_iso_datetime, _extract_rating_from_json_node, _parse_rating_from_title_html

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


def test_parse_rating_from_title_html_ld_json():
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
    assert _parse_rating_from_title_html(html) == 8.5

def test_parse_rating_from_title_html_regex():
    html = """
    <html>
        <body>
            <span class="rating">"ratingValue": "7.2"</span>
        </body>
    </html>
    """
    assert _parse_rating_from_title_html(html) == 7.2

def test_parse_rating_from_title_html_invalid_json_fallback():
    html = """
    <html>
        <head>
            <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Movie",
                    "aggregateRating": {
                        "ratingValue": "8.5"
                    # invalid json
                }
            </script>
        </head>
        <body>
            <span class="rating">"ratingValue": "7.2"</span>
        </body>
    </html>
    """
    # Returns 8.5 because the regex searches the WHOLE html, including the invalid JSON script block which has "ratingValue": "8.5"
    assert _parse_rating_from_title_html(html) == 8.5

def test_parse_rating_from_title_html_no_rating_json_fallback():
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
    assert _parse_rating_from_title_html(html) == 6.1

def test_parse_rating_from_title_html_none():
    assert _parse_rating_from_title_html("<html><body></body></html>") is None
    assert _parse_rating_from_title_html("") is None

def test_parse_rating_from_title_html_multiple_scripts():
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
    assert _parse_rating_from_title_html(html) == 9.0
