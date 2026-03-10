from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
DB_PATH = DATA_DIR / "movies.db"
MIGRATIONS_DIR = DATA_DIR / "migrations"

_INIT_LOCK = threading.Lock()
_DB_READY = False

ALLOWED_SORTS = {"title", "year", "imdb", "rating"}
ALLOWED_ORDERS = {"asc", "desc"}


def _table_columns(conn: sqlite3.Connection, table_name: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {str(row[1]) for row in rows}


def _ensure_movie_columns(conn: sqlite3.Connection) -> None:
    columns = _table_columns(conn, "movies")
    required_columns = {
        "imdb_id": "TEXT",
        "imdb_last_checked_at": "TEXT",
        "imdb_source_url": "TEXT",
    }
    for column_name, definition in required_columns.items():
        if column_name not in columns:
            conn.execute(f"ALTER TABLE movies ADD COLUMN {column_name} {definition}")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id)")


def ensure_db() -> None:
    global _DB_READY
    if _DB_READY and DB_PATH.exists():
        return

    with _INIT_LOCK:
        if _DB_READY and DB_PATH.exists():
            return

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not MIGRATIONS_DIR.exists():
            raise FileNotFoundError(f"Missing migrations directory: {MIGRATIONS_DIR}")

        migration_paths = sorted(MIGRATIONS_DIR.glob("*.sql"))
        if not migration_paths:
            raise FileNotFoundError(f"No migration SQL files found in: {MIGRATIONS_DIR}")

        conn = sqlite3.connect(DB_PATH)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
            for migration_path in migration_paths:
                sql = migration_path.read_text(encoding="utf-8")
                conn.executescript(sql)
            _ensure_movie_columns(conn)
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
    title = str(movie.get("title") or "").strip()
    if not title:
        raise ValueError("Movie title is required")

    year = movie.get("year")
    imdb_score = movie.get("imdb_score")
    imdb_id = movie.get("imdb_id")
    imdb_last_checked_at = movie.get("imdb_last_checked_at")
    imdb_source_url = movie.get("imdb_source_url")
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
                watched,
                age_band,
                notes,
                imdb_score,
                imdb_id,
                imdb_last_checked_at,
                imdb_source_url,
                localized_title,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                title,
                year,
                watched,
                age_band,
                notes,
                imdb_score,
                imdb_id,
                imdb_last_checked_at,
                imdb_source_url,
                localized_title,
            ),
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
        merged_imdb_score = imdb_score if imdb_score is not None else current["imdb_score"]
        merged_imdb_id = imdb_id if imdb_id is not None else current["imdb_id"]
        merged_last_checked = (
            imdb_last_checked_at if imdb_last_checked_at is not None else current["imdb_last_checked_at"]
        )
        merged_source_url = imdb_source_url if imdb_source_url is not None else current["imdb_source_url"]
        merged_age_band = age_band or current["age_band"] or "Family"
        merged_notes = notes if notes is not None else current["notes"]
        merged_localized = localized_title if localized_title is not None else current["localized_title"]

        conn.execute(
            """
            UPDATE movies
            SET year = ?,
                watched = ?,
                age_band = ?,
                notes = ?,
                imdb_score = ?,
                imdb_id = ?,
                imdb_last_checked_at = ?,
                imdb_source_url = ?,
                localized_title = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                merged_year,
                merged_watched,
                merged_age_band,
                merged_notes,
                merged_imdb_score,
                merged_imdb_id,
                merged_last_checked,
                merged_source_url,
                merged_localized,
                movie_id,
            ),
        )

    if tags:
        add_movie_tags(conn, movie_id, tags)

    return movie_id, created



def upsert_movies_bulk(
    conn: sqlite3.Connection,
    movies_data: List[Dict[str, Any]],
) -> Tuple[int, int]:
    if not movies_data:
        return 0, 0

    titles_lower = set()
    for m in movies_data:
        t = str(m.get("title") or "").strip()
        if t:
            titles_lower.add(t.lower())

    if not titles_lower:
        return 0, 0

    placeholders = ",".join("?" for _ in titles_lower)
    rows = conn.execute(
        f"SELECT * FROM movies WHERE LOWER(title) IN ({placeholders})",
        list(titles_lower)
    ).fetchall()

    existing_map = {}
    for r in rows:
        t_low = str(r["title"]).lower()
        y = r["year"] if r["year"] is not None else -1
        existing_map[(t_low, y)] = r

    to_insert = []
    to_update = []

    for m in movies_data:
        t = str(m.get("title") or "").strip()
        if not t:
            continue

        y = m.get("year")
        t_low = t.lower()
        y_key = y if y is not None else -1

        imdb_score = m.get("imdb_score")
        imdb_id = m.get("imdb_id")
        imdb_last_checked_at = m.get("imdb_last_checked_at")
        imdb_source_url = m.get("imdb_source_url")
        age_band = (m.get("age_band") or "Family").strip() or "Family"
        watched = 1 if bool(m.get("watched")) else 0
        notes = m.get("notes")
        localized_title = m.get("localized_title")

        tags = normalize_tags(m.get("tags") or [])

        if (t_low, y_key) in existing_map:
            current = existing_map[(t_low, y_key)]
            merged_watched = 1 if watched or int(current["watched"]) else 0
            merged_year = y if y is not None else current["year"]
            merged_imdb_score = imdb_score if imdb_score is not None else current["imdb_score"]
            merged_imdb_id = imdb_id if imdb_id is not None else current["imdb_id"]
            merged_last_checked = (
                imdb_last_checked_at if imdb_last_checked_at is not None else current["imdb_last_checked_at"]
            )
            merged_source_url = imdb_source_url if imdb_source_url is not None else current["imdb_source_url"]
            merged_age_band = age_band or current["age_band"] or "Family"
            merged_notes = notes if notes is not None else current["notes"]
            merged_localized = localized_title if localized_title is not None else current["localized_title"]

            to_update.append((
                merged_year,
                merged_watched,
                merged_age_band,
                merged_notes,
                merged_imdb_score,
                merged_imdb_id,
                merged_last_checked,
                merged_source_url,
                merged_localized,
                current["id"],
            ))
            m["_db_id"] = current["id"]
            m["_tags"] = tags
        else:
            to_insert.append((
                t,
                y,
                watched,
                age_band,
                notes,
                imdb_score,
                imdb_id,
                imdb_last_checked_at,
                imdb_source_url,
                localized_title,
            ))
            m["_tags"] = tags
            m["_insert_idx"] = len(to_insert) - 1

    if to_update:
        conn.executemany(
            """
            UPDATE movies
            SET year = ?,
                watched = ?,
                age_band = ?,
                notes = ?,
                imdb_score = ?,
                imdb_id = ?,
                imdb_last_checked_at = ?,
                imdb_source_url = ?,
                localized_title = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            to_update,
        )

    if to_insert:
        conn.executemany(
            """
            INSERT INTO movies(
                title,
                year,
                watched,
                age_band,
                notes,
                imdb_score,
                imdb_id,
                imdb_last_checked_at,
                imdb_source_url,
                localized_title,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            to_insert,
        )

        inserted_titles = {r[0].lower() for r in to_insert}
        placeholders_in = ",".join("?" for _ in inserted_titles)
        rows_in = conn.execute(
            f"""
            SELECT id, LOWER(title) as title, IFNULL(year, -1) as year
            FROM movies
            WHERE LOWER(title) IN ({placeholders_in})
            """,
            list(inserted_titles)
        ).fetchall()
        id_map = {(r["title"], r["year"]): r["id"] for r in rows_in}

        for m in movies_data:
            if "_insert_idx" in m:
                t = m["title"].lower()
                y = m.get("year")
                y_key = y if y is not None else -1
                m["_db_id"] = id_map.get((t, y_key))

    all_tags = set()
    for m in movies_data:
        all_tags.update(m.get("_tags", []))

    if all_tags:
        placeholders_tags = ",".join("?" for _ in all_tags)
        rows_tags = conn.execute(
            f"SELECT id, name FROM tags WHERE name IN ({placeholders_tags})",
            list(all_tags)
        ).fetchall()
        tag_map = {str(r["name"]): int(r["id"]) for r in rows_tags}

        missing = all_tags - set(tag_map.keys())
        if missing:
            conn.executemany("INSERT OR IGNORE INTO tags(name) VALUES (?)", [(t,) for t in missing])
            rows_tags = conn.execute(
                f"SELECT id, name FROM tags WHERE name IN ({placeholders_tags})",
                list(all_tags)
            ).fetchall()
            tag_map = {str(r["name"]): int(r["id"]) for r in rows_tags}

        # First, delete existing tags for any movies being updated
        # (the ones that already had a _db_id before we inserted new ones)
        # We can just delete tags for all movies we processed to be safe,
        # since we are about to re-insert their full tag lists.
        db_ids = [m.get("_db_id") for m in movies_data if m.get("_db_id") is not None]
        if db_ids:
            placeholders_del = ",".join("?" for _ in db_ids)
            conn.execute(
                f"DELETE FROM movie_tags WHERE movie_id IN ({placeholders_del})",
                db_ids
            )

        movie_tags_to_insert = []
        for m in movies_data:
            db_id = m.get("_db_id")
            if db_id is not None and m.get("_tags"):
                for tg in m["_tags"]:
                    if tg in tag_map:
                        movie_tags_to_insert.append((db_id, tag_map[tg]))

        if movie_tags_to_insert:
            conn.executemany(
                "INSERT OR IGNORE INTO movie_tags(movie_id, tag_id) VALUES (?, ?)",
                movie_tags_to_insert
            )

    return len(to_insert), len(to_update)


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
        "watched": "watched",
        "age_band": "age_band",
        "notes": "notes",
        "imdb_score": "imdb_score",
        "imdb_id": "imdb_id",
        "imdb_last_checked_at": "imdb_last_checked_at",
        "imdb_source_url": "imdb_source_url",
        "localized_title": "localized_title",
    }

    assignments: List[str] = []
    params: List[Any] = []

    for payload_key, column in allowed.items():
        if payload_key in fields:
            value = fields[payload_key]
            if payload_key == "title" and value is not None:
                value = str(value).strip()
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
        mine = conn.execute(
            "SELECT rating FROM user_ratings WHERE movie_id = ? AND device_id = ?",
            (movie_id, device_id),
        ).fetchone()
        if mine:
            my_rating = int(mine["rating"])

    return {
        "avg_rating": round(float(row["avg_rating"]), 2) if row else 0.0,
        "rating_count": int(row["rating_count"]) if row else 0,
        "my_rating": my_rating,
    }


def _movie_rows_to_dicts(conn: sqlite3.Connection, rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
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
                "watched": bool(row["watched"]),
                "age_band": row["age_band"],
                "notes": row["notes"],
                "localized_title": row["localized_title"],
                "imdb_score": row["imdb_score"],
                "imdb_id": row["imdb_id"],
                "imdb_last_checked_at": row["imdb_last_checked_at"],
                "imdb_source_url": row["imdb_source_url"],
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
    safe_order = order if order in ALLOWED_ORDERS else "asc"
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
          m.watched,
          m.age_band,
          m.notes,
          m.localized_title,
          m.imdb_score,
          m.imdb_id,
          m.imdb_last_checked_at,
          m.imdb_source_url,
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
        LEFT JOIN user_ratings mr ON mr.movie_id = m.id AND mr.device_id = ?
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ?
    """

    all_params: List[Any] = [device_id or ""]
    all_params.extend(params)
    all_params.append(safe_limit)

    rows = conn.execute(sql, all_params).fetchall()
    return _movie_rows_to_dicts(conn, rows)


def get_movie_by_id(conn: sqlite3.Connection, movie_id: int, device_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
          m.id,
          m.title,
          m.year,
          m.watched,
          m.age_band,
          m.notes,
          m.localized_title,
          m.imdb_score,
          m.imdb_id,
          m.imdb_last_checked_at,
          m.imdb_source_url,
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
        LEFT JOIN user_ratings mr ON mr.movie_id = m.id AND mr.device_id = ?
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
        "tags": [str(row["name"]) for row in tag_rows],
        "age_bands": [str(row["age_band"]) for row in age_rows],
    }
