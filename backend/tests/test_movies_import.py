import pytest
from backend.movies_import import parse_movie_line

@pytest.mark.parametrize("line", [
    "",
    "   ",
    None,
])
def test_empty_string(line):
    assert parse_movie_line(line) is None

def test_basic_title():
    result = parse_movie_line("The Matrix")
    assert result == {
        "title": "The Matrix",
        "year": None,
        "imdb_score": None,
        "age_band": "Family",
        "watched": False,
        "notes": None,
        "localized_title": None,
        "tags": ["animated"]
    }

@pytest.mark.parametrize("line, expected_title", [
    ("-- The Matrix", "The Matrix"),
    ("  --   Inception  ", "Inception"),
])
def test_watched_prefix(line, expected_title):
    result = parse_movie_line(line)
    assert result["title"] == expected_title
    assert result["watched"] is True

@pytest.mark.parametrize("line, expected_title", [
    ("- Finding Nemo", "Finding Nemo"),
    ("* Toy Story", "Toy Story"),
    ("• Up", "Up"),
])
def test_bullet_points(line, expected_title):
    result = parse_movie_line(line)
    assert result["title"] == expected_title

def test_year_parentheses():
    result = parse_movie_line("Jurassic Park (1993)")
    assert result["title"] == "Jurassic Park"
    assert result["year"] == 1993

def test_year_trailing():
    result = parse_movie_line("The Terminator 1984")
    assert result["title"] == "The Terminator"
    assert result["year"] == 1984

@pytest.mark.parametrize("line, expected_title, expected_localized, expected_notes", [
    ("Spirited Away / Sen to Chihiro", "Spirited Away", "Sen to Chihiro", "Localized title: Sen to Chihiro"),
    ("Title/", "Title", None, None),
])
def test_localized_title(line, expected_title, expected_localized, expected_notes):
    result = parse_movie_line(line)
    assert result["title"] == expected_title
    assert result["localized_title"] == expected_localized
    assert result["notes"] == expected_notes

def test_complex_combination():
    result = parse_movie_line("-- * My Neighbor Totoro / Tonari no Totoro (1988)")
    assert result["title"] == "My Neighbor Totoro"
    assert result["localized_title"] == "Tonari no Totoro"
    assert result["year"] == 1988
    assert result["watched"] is True
    assert result["notes"] == "Localized title: Tonari no Totoro"

def test_tags_and_hints():
    result = parse_movie_line("Luca", default_tags=["disney", "CGI"])
    assert "disney" in result["tags"]
    assert "cgi" in result["tags"]
    assert "animated" in result["tags"]
    assert "funny" in result["tags"]
    assert "emotional" in result["tags"]

def test_default_age_band():
    result = parse_movie_line("Deadpool", default_age_band="Adult")
    assert result["age_band"] == "Adult"
