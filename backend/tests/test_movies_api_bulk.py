import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend import movies_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    movies_db.ensure_db()
    conn = movies_db.get_connection()
    conn.execute("DELETE FROM movie_tags")
    conn.execute("DELETE FROM user_ratings")
    conn.execute("DELETE FROM movies")
    conn.execute("DELETE FROM tags")
    conn.commit()
    conn.close()

def test_bulk_import_api():
    payload = {
        "lines": "Movie A\nMovie B (2020)\nMovie C",
        "default_age_band": "Family",
        "default_tags": ["test"]
    }
    resp = client.post("/api/movies/import", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["processed"] == 3
    assert data["created"] == 3
    assert data["updated"] == 0

    # Test update
    resp2 = client.post("/api/movies/import", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["processed"] == 3
    assert data2["created"] == 0
    assert data2["updated"] == 3

    # Verify data in DB
    resp3 = client.get("/api/movies")
    movies = resp3.json()["items"]
    assert len(movies) == 3

    titles = [m["title"] for m in movies]
    assert "Movie A" in titles
    assert "Movie B" in titles
    assert "Movie C" in titles

    movie_b = next(m for m in movies if m["title"] == "Movie B")
    assert movie_b["year"] == 2020
    assert "test" in movie_b["tags"]


def test_upsert_movies_bulk_merges_duplicate_new_rows():
    conn = movies_db.get_connection()
    try:
        with conn:
            created, updated = movies_db.upsert_movies_bulk(
                conn,
                [
                    {"title": "Movie A", "notes": "first", "tags": ["starter"]},
                    {"title": "Movie A", "watched": True, "notes": "second", "tags": ["followup"]},
                ],
            )

        movie = conn.execute(
            "SELECT watched, notes FROM movies WHERE LOWER(title) = LOWER(?)",
            ("Movie A",),
        ).fetchone()
        tags = {
            row["name"]
            for row in conn.execute(
                """
                SELECT t.name
                FROM movie_tags mt
                JOIN tags t ON t.id = mt.tag_id
                JOIN movies m ON m.id = mt.movie_id
                WHERE LOWER(m.title) = LOWER(?)
                """,
                ("Movie A",),
            ).fetchall()
        }
    finally:
        conn.close()

    assert created == 1
    assert updated == 0
    assert movie["watched"] == 1
    assert movie["notes"] == "second"
    assert tags == {"starter", "followup"}


def test_upsert_movies_bulk_preserves_existing_tags_and_batch_merges_updates():
    conn = movies_db.get_connection()
    try:
        with conn:
            movie_id, _ = movies_db.upsert_movie(
                conn,
                {"title": "Movie A", "notes": "original", "age_band": "Teen"},
                tags=["manual"],
            )
            created, updated = movies_db.upsert_movies_bulk(
                conn,
                [
                    {"title": "Movie A", "notes": "updated"},
                    {"title": "Movie A", "imdb_id": "tt1234567", "tags": ["imported"]},
                ],
            )

        movie = conn.execute(
            "SELECT notes, imdb_id, age_band FROM movies WHERE id = ?",
            (movie_id,),
        ).fetchone()
        tags = {
            row["name"]
            for row in conn.execute(
                """
                SELECT t.name
                FROM movie_tags mt
                JOIN tags t ON t.id = mt.tag_id
                WHERE mt.movie_id = ?
                """,
                (movie_id,),
            ).fetchall()
        }
    finally:
        conn.close()

    assert created == 0
    assert updated == 1
    assert movie["notes"] == "updated"
    assert movie["imdb_id"] == "tt1234567"
    assert movie["age_band"] == "Teen"
    assert tags == {"manual", "imported"}
