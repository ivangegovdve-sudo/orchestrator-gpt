from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
DB_PATH = DATA_DIR / "movies.db"
MIGRATION_PATH = DATA_DIR / "migrations" / "001_movies.sql"

_INIT_LOCK = threading.Lock()
_DB_READY = False


ALLOWED_SORTS = {"title", "year", "imdb", "rating"}
ALLOWED_ORDERS = {"asc", "desc"}


def ensure_db() -> None:
    global _DB_READY
    if _DB_READY and DB_PATH.exists():
        return

    with _INIT_LOCK:
        if _DB_READY and DB_PATH.exists():
            return

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not MIGRATION_PATH.exists():
            raise FileNotFoundError(f"Missing migration file: {MIGRATION_PATH}")

        migration_sql = MIGRATION_PATH.read_text(encoding="utf-8")
        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.executescript(migration_sql)
            conn.commit()
        finally:
            conn.close()

        _DB_READY = True


def get_connection() -> sqlite3.Connection:
    ensure_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def normalize_tags(tags: Optional[Iterable[str]]) -> List[str]:
    if not tags:
        return []
    out: List[str] = []
    for tag in tags:
        clean = (tag or "").strip().lower()
        if clean and clean not in out:
            out.append(clean)
    return out


def _movie_exists(conn: sqlite3.Connection, movie_id: int) -> bool:
    row = conn.execute("SELECT 1 FROM movies WHERE id = ?", (movie_id,)).fetchone()
    return bool(row)


def _find_movie_id(conn: sqlite3.Connection, title: str, year: Optional[int]) -> Optional[int]:
    row = conn.execute(
        """
        SELECT id
        FROM movies
        WHERE LOWER(title) = LOWER(?)
          AND ((year IS NULL AND ? IS NULL) OR year = ?)
        LIMIT 1
        """,
        (title, year, year),
    ).fetchone()
    if row:
        return int(row["id"])
    return None


def _ensure_tag_id(conn: sqlite3.Connection, tag_name: str) -> int:
    conn.execute("INSERT OR IGNORE INTO tags(name) VALUES (?)", (tag_name,))
    row = conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)).fetchone()
    if not row:
        raise RuntimeError(f"Failed to load tag id for: {tag_name}")
    return int(row["id"])


def add_movie_tags(conn: sqlite3.Connection, movie_id: int, tags: Iterable[str]) -> None:
    for tag in normalize_tags(tags):
        tag_id = _ensure_tag_id(conn, tag)
        conn.execute(
            "INSERT OR IGNORE INTO movie_tags(movie_id, tag_id) VALUES (?, ?)",
            (movie_id, tag_id),
        )


def replace_movie_tags(conn: sqlite3.Connection, movie_id: int, tags: Iterable[str]) -> None:
    conn.execute("DELETE FROM movie_tags WHERE movie_id = ?", (movie_id,))
    add_movie_tags(conn, movie_id, tags)


def upsert_movie(
    conn: sqlite3.Connection,
    movie: Dict[str, Any],
    tags: Optional[Iterable[str]] = None,
) -> Tuple[int, bool]:
    title = (movie.get("title") or "").strip()
    if not title:
        raise ValueError("Movie title is required")

    year = movie.get("year")
    imdb_score = movie.get("imdb_score")
    age_band = (movie.get("age_band") or "Family").strip() or "Family"
    watched = 1 if bool(movie.get("watched")) else 0
    notes = movie.get("notes")
    localized_title = movie.get("localized_title")

    existing_id = _find_movie_id(conn, title=title, year=year)
    created = False

    if existing_id is None:
        cursor = conn.execute(
            """
            INSERT INTO movies(
                title,
                year,
                imdb_score,
                age_band,
                watched,
                notes,
                localized_title,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (title, year, imdb_score, age_band, watched, notes, localized_title),
        )
        movie_id = int(cursor.lastrowid)
        created = True
    else:
        movie_id = existing_id
        current = conn.execute("SELECT * FROM movies WHERE id = ?", (movie_id,)).fetchone()
        if not current:
            raise RuntimeError("Movie disappeared during upsert")

        merged_watched = 1 if watched or int(current["watched"]) else 0
        merged_year = year if year is not None else current["year"]
        merged_imdb = imdb_score if imdb_score is not None else current["imdb_score"]
        merged_age_band = age_band or current["age_band"] or "Family"
        merged_notes = notes if notes is not None else current["notes"]
        merged_localized = localized_title if localized_title is not None else current["localized_title"]

        conn.execute(
            """
            UPDATE movies
            SET year = ?,
                imdb_score = ?,
                age_band = ?,
                watched = ?,
                notes = ?,
                localized_title = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                merged_year,
                merged_imdb,
                merged_age_band,
                merged_watched,
                merged_notes,
                merged_localized,
                movie_id,
            ),
        )

    if tags:
        add_movie_tags(conn, movie_id, tags)

    return movie_id, created


def update_movie(
    conn: sqlite3.Connection,
    movie_id: int,
    fields: Dict[str, Any],
    tags: Optional[Iterable[str]] = None,
    replace_tags_flag: bool = False,
) -> None:
    if not _movie_exists(conn, movie_id):
        raise LookupError("Movie not found")

    allowed = {
        "title": "title",
        "year": "year",
        "imdb_score": "imdb_score",
        "age_band": "age_band",
        "watched": "watched",
        "notes": "notes",
        "localized_title": "localized_title",
    }

    assignments: List[str] = []
    params: List[Any] = []

    for payload_key, column in allowed.items():
        if payload_key in fields:
            value = fields[payload_key]
            if payload_key == "title" and value is not None:
                value = (str(value)).strip()
                if not value:
                    raise ValueError("Title cannot be empty")
            if payload_key == "watched" and value is not None:
                value = 1 if bool(value) else 0
            assignments.append(f"{column} = ?")
            params.append(value)

    if assignments:
        assignments.append("updated_at = CURRENT_TIMESTAMP")
        sql = f"UPDATE movies SET {', '.join(assignments)} WHERE id = ?"
        params.append(movie_id)
        conn.execute(sql, params)

    if tags is not None:
        if replace_tags_flag:
            replace_movie_tags(conn, movie_id, tags)
        else:
            add_movie_tags(conn, movie_id, tags)


def set_watched(conn: sqlite3.Connection, movie_id: int, watched: bool) -> None:
    if not _movie_exists(conn, movie_id):
        raise LookupError("Movie not found")

    conn.execute(
        "UPDATE movies SET watched = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (1 if watched else 0, movie_id),
    )


def set_rating(conn: sqlite3.Connection, movie_id: int, device_id: str, rating: int) -> None:
    if not _movie_exists(conn, movie_id):
        raise LookupError("Movie not found")

    conn.execute(
        """
        INSERT INTO user_ratings(movie_id, device_id, rating)
        VALUES (?, ?, ?)
        ON CONFLICT(movie_id, device_id)
        DO UPDATE SET
            rating = excluded.rating,
            updated_at = CURRENT_TIMESTAMP
        """,
        (movie_id, device_id, rating),
    )


def get_rating_summary(
    conn: sqlite3.Connection,
    movie_id: int,
    device_id: Optional[str] = None,
) -> Dict[str, Any]:
    row = conn.execute(
        """
        SELECT
          COALESCE(AVG(rating), 0) AS avg_rating,
          COUNT(*) AS rating_count
        FROM user_ratings
        WHERE movie_id = ?
        """,
        (movie_id,),
    ).fetchone()

    my_rating = None
    if device_id:
        my_row = conn.execute(
            "SELECT rating FROM user_ratings WHERE movie_id = ? AND device_id = ?",
            (movie_id, device_id),
        ).fetchone()
        if my_row:
            my_rating = int(my_row["rating"])

    return {
        "avg_rating": round(float(row["avg_rating"]), 2) if row else 0.0,
        "rating_count": int(row["rating_count"]) if row else 0,
        "my_rating": my_rating,
    }


def _movie_rows_to_dicts(
    conn: sqlite3.Connection,
    rows: List[sqlite3.Row],
) -> List[Dict[str, Any]]:
    movie_ids = [int(row["id"]) for row in rows]
    tag_map: Dict[int, List[str]] = {movie_id: [] for movie_id in movie_ids}

    if movie_ids:
        placeholders = ",".join("?" for _ in movie_ids)
        tag_rows = conn.execute(
            f"""
            SELECT mt.movie_id, t.name
            FROM movie_tags mt
            JOIN tags t ON t.id = mt.tag_id
            WHERE mt.movie_id IN ({placeholders})
            ORDER BY t.name ASC
            """,
            movie_ids,
        ).fetchall()
        for tag_row in tag_rows:
            tag_map[int(tag_row["movie_id"])].append(str(tag_row["name"]))

    out: List[Dict[str, Any]] = []
    for row in rows:
        movie_id = int(row["id"])
        out.append(
            {
                "id": movie_id,
                "title": row["title"],
                "year": row["year"],
                "imdb_score": row["imdb_score"],
                "age_band": row["age_band"],
                "watched": bool(row["watched"]),
                "notes": row["notes"],
                "localized_title": row["localized_title"],
                "tags": tag_map.get(movie_id, []),
                "avg_rating": round(float(row["avg_rating"] or 0), 2),
                "rating_count": int(row["rating_count"] or 0),
                "my_rating": int(row["my_rating"]) if row["my_rating"] is not None else None,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        )
    return out


def list_movies(
    conn: sqlite3.Connection,
    search: Optional[str] = None,
    age_band: Optional[str] = None,
    watched_filter: str = "all",
    tags: Optional[Iterable[str]] = None,
    tags_mode: str = "any",
    sort: str = "title",
    order: str = "asc",
    device_id: Optional[str] = None,
    limit: int = 500,
) -> List[Dict[str, Any]]:
    safe_sort = sort if sort in ALLOWED_SORTS else "title"
    safe_order = order.lower() if order and order.lower() in ALLOWED_ORDERS else "asc"
    safe_tags_mode = tags_mode if tags_mode in {"any", "all"} else "any"

    where_parts = ["1 = 1"]
    params: List[Any] = []

    if search:
        where_parts.append("LOWER(m.title) LIKE ?")
        params.append(f"%{search.lower()}%")

    if age_band:
        where_parts.append("m.age_band = ?")
        params.append(age_band)

    if watched_filter == "watched":
        where_parts.append("m.watched = 1")
    elif watched_filter == "unwatched":
        where_parts.append("m.watched = 0")

    normalized_tags = normalize_tags(tags)
    if normalized_tags:
        placeholders = ",".join("?" for _ in normalized_tags)
        if safe_tags_mode == "all":
            where_parts.append(
                f"""
                m.id IN (
                    SELECT mt.movie_id
                    FROM movie_tags mt
                    JOIN tags t ON t.id = mt.tag_id
                    WHERE t.name IN ({placeholders})
                    GROUP BY mt.movie_id
                    HAVING COUNT(DISTINCT t.name) = ?
                )
                """
            )
            params.extend(normalized_tags)
            params.append(len(normalized_tags))
        else:
            where_parts.append(
                f"""
                m.id IN (
                    SELECT DISTINCT mt.movie_id
                    FROM movie_tags mt
                    JOIN tags t ON t.id = mt.tag_id
                    WHERE t.name IN ({placeholders})
                )
                """
            )
            params.extend(normalized_tags)

    if safe_sort == "year":
        order_clause = f"(m.year IS NULL) ASC, m.year {safe_order.upper()}, LOWER(m.title) ASC"
    elif safe_sort == "imdb":
        order_clause = f"(m.imdb_score IS NULL) ASC, m.imdb_score {safe_order.upper()}, LOWER(m.title) ASC"
    elif safe_sort == "rating":
        order_clause = f"avg_rating {safe_order.upper()}, rating_count DESC, LOWER(m.title) ASC"
    else:
        order_clause = f"LOWER(m.title) {safe_order.upper()}"

    where_clause = " AND ".join(where_parts)
    safe_limit = max(1, min(int(limit), 5000))

    sql = f"""
        SELECT
          m.id,
          m.title,
          m.year,
          m.imdb_score,
          m.age_band,
          m.watched,
          m.notes,
          m.localized_title,
          m.created_at,
          m.updated_at,
          COALESCE(r.avg_rating, 0) AS avg_rating,
          COALESCE(r.rating_count, 0) AS rating_count,
          mr.rating AS my_rating
        FROM movies m
        LEFT JOIN (
            SELECT movie_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
            FROM user_ratings
            GROUP BY movie_id
        ) r ON r.movie_id = m.id
        LEFT JOIN user_ratings mr
            ON mr.movie_id = m.id AND mr.device_id = ?
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ?
    """

    full_params = [device_id or ""]
    full_params.extend(params)
    full_params.append(safe_limit)

    rows = conn.execute(sql, full_params).fetchall()
    return _movie_rows_to_dicts(conn, rows)


def get_movie_by_id(
    conn: sqlite3.Connection,
    movie_id: int,
    device_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
          m.id,
          m.title,
          m.year,
          m.imdb_score,
          m.age_band,
          m.watched,
          m.notes,
          m.localized_title,
          m.created_at,
          m.updated_at,
          COALESCE(r.avg_rating, 0) AS avg_rating,
          COALESCE(r.rating_count, 0) AS rating_count,
          mr.rating AS my_rating
        FROM movies m
        LEFT JOIN (
            SELECT movie_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
            FROM user_ratings
            GROUP BY movie_id
        ) r ON r.movie_id = m.id
        LEFT JOIN user_ratings mr
            ON mr.movie_id = m.id AND mr.device_id = ?
        WHERE m.id = ?
        LIMIT 1
        """,
        (device_id or "", movie_id),
    ).fetchall()

    if not rows:
        return None

    mapped = _movie_rows_to_dicts(conn, rows)
    return mapped[0] if mapped else None


def get_facets(conn: sqlite3.Connection) -> Dict[str, List[str]]:
    tag_rows = conn.execute("SELECT name FROM tags ORDER BY name ASC").fetchall()
    age_rows = conn.execute(
        """
        SELECT DISTINCT age_band
        FROM movies
        WHERE age_band IS NOT NULL AND TRIM(age_band) <> ''
        ORDER BY age_band ASC
        """
    ).fetchall()

    return {
        "tags": [str(r["name"]) for r in tag_rows],
        "age_bands": [str(r["age_band"]) for r in age_rows],
    }
