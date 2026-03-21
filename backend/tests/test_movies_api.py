import os
import tempfile
import sqlite3
import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend import movies_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def isolated_db(monkeypatch):
    fd, temp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    from pathlib import Path
    monkeypatch.setattr(movies_db, "DB_PATH", Path(temp_db_path))

    # We must reset the initialization flag for the temp db
    monkeypatch.setattr(movies_db, "_DB_READY", False)

    movies_db.ensure_db()

    yield

    try:
        os.unlink(temp_db_path)
    except OSError:
        pass

def seed_movies():
    conn = movies_db.get_connection()
    try:
        # Movie 1
        cursor = conn.execute(
            """
            INSERT INTO movies (title, year, watched, age_band, imdb_score, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("The Matrix", 1999, 1, "Adult", 8.7, "Great sci-fi")
        )
        matrix_id = cursor.lastrowid

        # Tag for Movie 1
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", ("sci-fi",))
        tag_id = conn.execute("SELECT id FROM tags WHERE name = ?", ("sci-fi",)).fetchone()["id"]
        conn.execute("INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?)", (matrix_id, tag_id))

        # Movie 2
        cursor = conn.execute(
            """
            INSERT INTO movies (title, year, watched, age_band, imdb_score, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("Toy Story", 1995, 0, "Family", 8.3, "Classic animation")
        )
        toy_id = cursor.lastrowid

        # Tags for Movie 2
        for tag in ["animation", "classic"]:
            conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag,))
            tag_id = conn.execute("SELECT id FROM tags WHERE name = ?", (tag,)).fetchone()["id"]
            conn.execute("INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?)", (toy_id, tag_id))

        # Movie 3
        cursor = conn.execute(
            """
            INSERT INTO movies (title, year, watched, age_band, imdb_score, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("The Godfather", 1972, 1, "Adult", 9.2, "Masterpiece")
        )
        godfather_id = cursor.lastrowid

        # Tag for Movie 3
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", ("classic",))
        tag_id = conn.execute("SELECT id FROM tags WHERE name = ?", ("classic",)).fetchone()["id"]
        conn.execute("INSERT INTO movie_tags (movie_id, tag_id) VALUES (?, ?)", (godfather_id, tag_id))

        conn.commit()
    finally:
        conn.close()

def test_get_movies_all():
    seed_movies()
    response = client.get("/api/movies")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "Toy Story" in titles
    assert "The Godfather" in titles

def test_get_movies_search():
    seed_movies()
    response = client.get("/api/movies?search=matrix")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "The Matrix"

def test_get_movies_status_watched():
    seed_movies()
    response = client.get("/api/movies?status=watched")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "The Godfather" in titles
    assert "Toy Story" not in titles

def test_get_movies_status_unwatched():
    seed_movies()
    response = client.get("/api/movies?status=unwatched")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Toy Story"

def test_get_movies_age_band():
    seed_movies()
    response = client.get("/api/movies?age_band=Family")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Toy Story"

def test_get_movies_tags_any():
    seed_movies()
    response = client.get("/api/movies?tags=classic,sci-fi&tags_mode=any")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3

def test_get_movies_tags_all():
    seed_movies()
    response = client.get("/api/movies?tags=classic,animation&tags_mode=all")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Toy Story"

def test_get_movies_sort_year_desc():
    seed_movies()
    response = client.get("/api/movies?sort=year&order=desc")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    titles = [m["title"] for m in data["items"]]
    assert titles == ["The Matrix", "Toy Story", "The Godfather"]

def test_get_movies_sort_title_asc():
    seed_movies()
    response = client.get("/api/movies?sort=title&order=asc")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    titles = [m["title"] for m in data["items"]]
    assert titles == ["The Godfather", "The Matrix", "Toy Story"]

def test_get_movies_limit():
    seed_movies()
    response = client.get("/api/movies?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
