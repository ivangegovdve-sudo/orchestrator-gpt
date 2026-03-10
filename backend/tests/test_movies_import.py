import pytest
from backend.movies_import import parse_bulk_lines

@pytest.mark.parametrize("empty_input", ["", None, "   \n   "])
def test_parse_bulk_lines_empty(empty_input):
    assert parse_bulk_lines(empty_input) == []

def test_parse_bulk_lines_single_line():
    lines = "The Matrix (1999)"
    result = parse_bulk_lines(lines)
    assert len(result) == 1
    assert result[0]["title"] == "The Matrix"
    assert result[0]["year"] == 1999
    assert result[0]["tags"] == ["animated"] # default tag added in parse_movie_line

def test_parse_bulk_lines_multiple_lines():
    lines = """
    The Matrix (1999)
    Inception (2010)
    Interstellar 2014
    """
    result = parse_bulk_lines(lines)
    assert len(result) == 3
    assert result[0]["title"] == "The Matrix"
    assert result[0]["year"] == 1999
    assert result[1]["title"] == "Inception"
    assert result[1]["year"] == 2010
    assert result[2]["title"] == "Interstellar"
    assert result[2]["year"] == 2014

def test_parse_bulk_lines_with_defaults():
    lines = "The Matrix (1999)"
    result = parse_bulk_lines(lines, default_age_band="Adult", default_tags=["sci-fi", "action"])
    assert len(result) == 1
    assert result[0]["age_band"] == "Adult"
    assert "sci-fi" in result[0]["tags"]
    assert "action" in result[0]["tags"]
    assert "animated" in result[0]["tags"]

def test_parse_bulk_lines_ignores_invalid():
    lines = """
    The Matrix (1999)

    ---
    *
    Inception (2010)
    """
    result = parse_bulk_lines(lines)
    assert len(result) == 2
    assert result[0]["title"] == "The Matrix"
    assert result[1]["title"] == "Inception"
