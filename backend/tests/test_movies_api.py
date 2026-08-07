import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend import movies_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db(tmp_path, monkeypatch):
    test_db_path = tmp_path / "test_movies.db"
    monkeypatch.setattr(movies_db, "DB_PATH", test_db_path)
    monkeypatch.setattr(movies_db, "_DB_READY", False)
    movies_db.ensure_db()
    conn = movies_db.get_connection()

    # Insert some sample data
    movies = [
        {"title": "The Matrix", "year": 1999, "watched": True, "age_band": "Adult", "imdb_score": 8.7},
        {"title": "Toy Story", "year": 1995, "watched": True, "age_band": "Family", "imdb_score": 8.3},
        {"title": "Inception", "year": 2010, "watched": False, "age_band": "Teen", "imdb_score": 8.8},
        {"title": "A Beautiful Mind", "year": 2001, "watched": False, "age_band": "Adult", "imdb_score": 8.2},
    ]

    tags = {
        "The Matrix": ["sci-fi", "action", "cyberpunk"],
        "Toy Story": ["animation", "family", "comedy"],
        "Inception": ["sci-fi", "action", "thriller"],
        "A Beautiful Mind": ["biography", "drama"],
    }

    for m in movies:
        movies_db.upsert_movie(conn, m, tags=tags[m["title"]])

    conn.commit()
    conn.close()


def test_list_movies_empty_filters():
    response = client.get("/api/movies")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    assert len(data["items"]) == 4

    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "Toy Story" in titles
    assert "Inception" in titles
    assert "A Beautiful Mind" in titles

def test_list_movies_search():
    response = client.get("/api/movies?search=Matrix")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "The Matrix"

def test_list_movies_age_band():
    response = client.get("/api/movies?age_band=Family")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Toy Story"

def test_list_movies_status_watched():
    response = client.get("/api/movies?status=watched")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "Toy Story" in titles

def test_list_movies_status_unwatched():
    response = client.get("/api/movies?status=unwatched")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "Inception" in titles
    assert "A Beautiful Mind" in titles

def test_list_movies_tags_any():
    response = client.get("/api/movies?tags=sci-fi,family")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "Toy Story" in titles
    assert "Inception" in titles

def test_list_movies_tags_all():
    response = client.get("/api/movies?tags=sci-fi,action&tags_mode=all")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "Inception" in titles

def test_list_movies_sort_year_desc():
    response = client.get("/api/movies?sort=year&order=desc")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    assert data["items"][0]["title"] == "Inception"
    assert data["items"][1]["title"] == "A Beautiful Mind"
    assert data["items"][2]["title"] == "The Matrix"
    assert data["items"][3]["title"] == "Toy Story"

def test_list_movies_limit():
    response = client.get("/api/movies?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
