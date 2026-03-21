import pytest
from backend.movies_db import get_connection, normalize_tags, set_rating

def test_normalize_tags_none():
    assert normalize_tags(None) == []

def test_normalize_tags_empty():
    assert normalize_tags([]) == []
    assert normalize_tags(()) == []

def test_normalize_tags_whitespace_only():
    assert normalize_tags(["   ", "\t", "\n"]) == []

@pytest.mark.parametrize(
    "input_tags, expected_output",
    [
        (["Action"], ["action"]),
        (["Action", "Sci-Fi"], ["action", "sci-fi"]),
        (["aCtIoN", "sCI-FI"], ["action", "sci-fi"]),
        ([" Action ", "  Sci-Fi\n"], ["action", "sci-fi"]),
    ],
)
def test_normalize_tags_various_inputs(input_tags, expected_output):
    assert normalize_tags(input_tags) == expected_output

def test_normalize_tags_none_values():
    assert normalize_tags(["Action", None, "Sci-Fi"]) == ["action", "sci-fi"]

def test_normalize_tags_deduplication():
    assert normalize_tags(["action", "action", "sci-fi", "Action"]) == ["action", "sci-fi"]

def test_normalize_tags_order_preservation():
    assert normalize_tags(["sci-fi", "action", "sci-fi"]) == ["sci-fi", "action"]

def test_set_rating_movie_not_found():
    conn = get_connection()
    try:
        with pytest.raises(LookupError, match="Movie not found"):
            set_rating(conn, movie_id=999999999, device_id="test_device", rating=5)
    finally:
        conn.close()
