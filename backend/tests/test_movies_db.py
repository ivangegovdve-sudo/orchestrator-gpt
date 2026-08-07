import pytest
from backend.movies_db import normalize_tags

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

from backend import movies_db

@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    test_db_path = tmp_path / "test_movies.db"
    monkeypatch.setattr(movies_db, "DB_PATH", test_db_path)
    # force DB to re-init
    monkeypatch.setattr(movies_db, "_DB_READY", False)
    movies_db.ensure_db()

def test_get_movie_by_id_exists():
    conn = movies_db.get_connection()
    try:
        movie_data = {
            "title": "Test Movie",
            "year": 2021,
            "watched": True,
            "age_band": "Teen",
            "notes": "Great movie",
            "imdb_score": 8.5,
            "imdb_id": "tt1234567",
            "runtime_minutes": 120,
            "language": "English"
        }

        # Insert movie
        with conn:
            movie_id, created = movies_db.upsert_movie(conn, movie_data, tags=["action", "sci-fi"])

            # Insert some user ratings
            conn.execute(
                "INSERT INTO user_ratings (movie_id, device_id, rating) VALUES (?, ?, ?)",
                (movie_id, "device_1", 4)
            )
            conn.execute(
                "INSERT INTO user_ratings (movie_id, device_id, rating) VALUES (?, ?, ?)",
                (movie_id, "device_2", 5)
            )

        # Retrieve without device ID
        movie = movies_db.get_movie_by_id(conn, movie_id)
        assert movie is not None
        assert movie["id"] == movie_id
        assert movie["title"] == "Test Movie"
        assert movie["year"] == 2021
        assert movie["watched"] is True
        assert movie["age_band"] == "Teen"
        assert movie["notes"] == "Great movie"
        assert movie["imdb_score"] == 8.5
        assert movie["imdb_id"] == "tt1234567"
        assert movie["runtime_minutes"] == 120
        assert movie["language"] == "English"
        assert set(movie["tags"]) == {"action", "sci-fi"}
        assert movie["rating_count"] == 2
        assert movie["avg_rating"] == 4.5
        assert movie["my_rating"] is None

        # Retrieve with device ID
        movie_with_device = movies_db.get_movie_by_id(conn, movie_id, device_id="device_1")
        assert movie_with_device is not None
        assert movie_with_device["my_rating"] == 4

    finally:
        conn.close()

def test_get_movie_by_id_not_found():
    conn = movies_db.get_connection()
    try:
        movie = movies_db.get_movie_by_id(conn, 999999)
        assert movie is None
    finally:
        conn.close()


def test_set_rating_movie_not_found():
    conn = movies_db.get_connection()
    try:
        with pytest.raises(LookupError, match="Movie not found"):
            movies_db.set_rating(conn, movie_id=999999999, device_id="test_device", rating=5)
    finally:
        conn.close()
