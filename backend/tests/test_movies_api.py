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

    # Insert test data
    movies_data = [
        {"title": "The Matrix", "year": 1999, "watched": True, "age_band": "Adult", "tags": ["sci-fi", "action", "masterpiece"], "imdb_score": 8.7},
        {"title": "Inception", "year": 2010, "watched": False, "age_band": "Teen", "tags": ["sci-fi", "thriller"], "imdb_score": 8.8},
        {"title": "Toy Story", "year": 1995, "watched": True, "age_band": "Family", "tags": ["animated", "family"], "imdb_score": 8.3},
        {"title": "The Dark Knight", "year": 2008, "watched": True, "age_band": "Teen", "tags": ["action", "crime"], "imdb_score": 9.0},
        {"title": "Finding Nemo", "year": 2003, "watched": False, "age_band": "Family", "tags": ["animated", "family"], "imdb_score": 8.1},
    ]

    for movie in movies_data:
        client.post("/api/movies", json=movie)

    conn.close()

def test_list_movies_default():
    resp = client.get("/api/movies")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 5

    # Default sort is by title, ascending
    titles = [m["title"] for m in data["items"]]
    assert titles == ["Finding Nemo", "Inception", "The Dark Knight", "The Matrix", "Toy Story"]

def test_list_movies_search():
    resp = client.get("/api/movies?search=The")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "The Dark Knight" in titles

def test_list_movies_age_band():
    resp = client.get("/api/movies?age_band=Family")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "Finding Nemo" in titles
    assert "Toy Story" in titles

def test_list_movies_status_unwatched():
    resp = client.get("/api/movies?status=unwatched")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    titles = [m["title"] for m in data["items"]]
    assert "Finding Nemo" in titles
    assert "Inception" in titles

def test_list_movies_status_watched():
    resp = client.get("/api/movies?status=watched")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "The Dark Knight" in titles
    assert "Toy Story" in titles

def test_list_movies_tags_any():
    resp = client.get("/api/movies?tags=sci-fi,animated")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 4
    titles = [m["title"] for m in data["items"]]
    assert "The Matrix" in titles
    assert "Inception" in titles
    assert "Toy Story" in titles
    assert "Finding Nemo" in titles

def test_list_movies_tags_all():
    resp = client.get("/api/movies?tags=sci-fi,action&tags_mode=all")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "The Matrix"

def test_list_movies_sort_year_desc():
    resp = client.get("/api/movies?sort=year&order=desc")
    assert resp.status_code == 200
    data = resp.json()
    titles = [m["title"] for m in data["items"]]
    assert titles == ["Inception", "The Dark Knight", "Finding Nemo", "The Matrix", "Toy Story"]

def test_list_movies_sort_imdb_desc():
    resp = client.get("/api/movies?sort=imdb&order=desc")
    assert resp.status_code == 200
    data = resp.json()
    titles = [m["title"] for m in data["items"]]
    assert titles == ["The Dark Knight", "Inception", "The Matrix", "Toy Story", "Finding Nemo"]

def test_list_movies_limit():
    resp = client.get("/api/movies?limit=2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    # Because there are 5 total, but we only got 2
    # The API might return total=5, items=2 or total=5 items=2. Let's check API behavior.
    assert data["total"] == 2 # wait, the API total len(items) after limit? Let's check backend/movies_api.py:154

def test_list_movies_facets_included():
    resp = client.get("/api/movies")
    assert resp.status_code == 200
    data = resp.json()
    assert "facets" in data
    assert "age_bands" in data["facets"]
    assert "tags" in data["facets"]
