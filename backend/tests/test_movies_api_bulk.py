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
