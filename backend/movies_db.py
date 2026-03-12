from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from dataclasses import dataclass


try:
    from . import utils  # type: ignore
except ImportError:
    import utils  # type: ignore

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
        "poster_url": "TEXT",
        "runtime_minutes": "INTEGER",
        "language": "TEXT",
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
    seen: set[str] = set()
    for tag in tags:
        clean = (tag or "").strip().lower()
        if clean and clean not in seen:
            out.append(clean)
            seen.add(clean)
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



@dataclass
class MovieRecordPayload:
    year: Optional[int]
    watched: int
    age_band: Optional[str]
    notes: Optional[str]
    imdb_score: Optional[float]
    imdb_id: Optional[str]
    imdb_last_checked_at: Optional[str]
    imdb_source_url: Optional[str]
    localized_title: Optional[str]
    poster_url: Optional[str]
    runtime_minutes: Optional[int]
    language: Optional[str]


@dataclass
class BulkMovieState:
    title: str
    payload: MovieRecordPayload
    tags: List[str]
    db_id: Optional[int] = None


def _movie_key(title: str, year: Optional[int]) -> Tuple[str, int]:
    return title.lower(), year if year is not None else -1


def _payload_from_movie(movie: Dict[str, Any]) -> MovieRecordPayload:
    raw_age_band = movie.get("age_band")
    age_band = str(raw_age_band).strip() if raw_age_band is not None else None
    if not age_band:
        age_band = None

    return MovieRecordPayload(
        year=movie.get("year"),
        watched=1 if bool(movie.get("watched")) else 0,
        age_band=age_band,
        notes=movie.get("notes"),
        imdb_score=movie.get("imdb_score"),
        imdb_id=movie.get("imdb_id"),
        imdb_last_checked_at=movie.get("imdb_last_checked_at"),
        imdb_source_url=movie.get("imdb_source_url"),
        localized_title=movie.get("localized_title"),
        poster_url=movie.get("poster_url"),
        runtime_minutes=movie.get("runtime_minutes"),
        language=movie.get("language"),
    )


def _payload_from_row(row: sqlite3.Row) -> MovieRecordPayload:
    return MovieRecordPayload(
        year=row["year"],
        watched=int(row["watched"]),
        age_band=row["age_band"] or "Family",
        notes=row["notes"],
        imdb_score=row["imdb_score"],
        imdb_id=row["imdb_id"],
        imdb_last_checked_at=row["imdb_last_checked_at"],
        imdb_source_url=row["imdb_source_url"],
        localized_title=row["localized_title"],
        poster_url=row["poster_url"],
        runtime_minutes=row["runtime_minutes"],
        language=row["language"],
    )


def _merge_movie_payload(base: MovieRecordPayload, incoming: MovieRecordPayload) -> MovieRecordPayload:
    return MovieRecordPayload(
        year=incoming.year if incoming.year is not None else base.year,
        watched=1 if incoming.watched or base.watched else 0,
        age_band=incoming.age_band or base.age_band or "Family",
        notes=incoming.notes if incoming.notes is not None else base.notes,
        imdb_score=incoming.imdb_score if incoming.imdb_score is not None else base.imdb_score,
        imdb_id=incoming.imdb_id if incoming.imdb_id is not None else base.imdb_id,
        imdb_last_checked_at=(
            incoming.imdb_last_checked_at
            if incoming.imdb_last_checked_at is not None
            else base.imdb_last_checked_at
        ),
        imdb_source_url=(
            incoming.imdb_source_url
            if incoming.imdb_source_url is not None
            else base.imdb_source_url
        ),
        localized_title=(
            incoming.localized_title
            if incoming.localized_title is not None
            else base.localized_title
        ),
        poster_url=incoming.poster_url if incoming.poster_url is not None else base.poster_url,
        runtime_minutes=(
            incoming.runtime_minutes
            if incoming.runtime_minutes is not None
            else base.runtime_minutes
        ),
        language=incoming.language if incoming.language is not None else base.language,
    )


def _insert_movie_record(
    conn: sqlite3.Connection,
    title: str,
    payload: MovieRecordPayload,
) -> int:
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
            poster_url,
            runtime_minutes,
            language,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (
            title,
            payload.year,
            payload.watched,
            payload.age_band or "Family",
            payload.notes,
            payload.imdb_score,
            payload.imdb_id,
            payload.imdb_last_checked_at,
            payload.imdb_source_url,
            payload.localized_title,
            payload.poster_url,
            payload.runtime_minutes,
            payload.language,
        ),
    )
    return int(cursor.lastrowid)


def _update_movie_record(
    conn: sqlite3.Connection,
    movie_id: int,
    payload: MovieRecordPayload,
) -> None:
    current = conn.execute("SELECT * FROM movies WHERE id = ?", (movie_id,)).fetchone()
    if not current:
        raise RuntimeError("Movie disappeared during upsert")

    merged = _merge_movie_payload(_payload_from_row(current), payload)

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
            poster_url = ?,
            runtime_minutes = ?,
            language = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (
            merged.year,
            merged.watched,
            merged.age_band,
            merged.notes,
            merged.imdb_score,
            merged.imdb_id,
            merged.imdb_last_checked_at,
            merged.imdb_source_url,
            merged.localized_title,
            merged.poster_url,
            merged.runtime_minutes,
            merged.language,
            movie_id,
        ),
    )


def upsert_movie(
    conn: sqlite3.Connection,
    movie: Dict[str, Any],
    tags: Optional[Iterable[str]] = None,
) -> Tuple[int, bool]:
    title = str(movie.get("title") or "").strip()
    if not title:
        raise ValueError("Movie title is required")

    payload = _payload_from_movie(movie)

    existing_id = _find_movie_id(conn, title=title, year=payload.year)
    created = False

    if existing_id is None:
        movie_id = _insert_movie_record(conn, title, payload)
        created = True
    else:
        movie_id = existing_id
        _update_movie_record(conn, movie_id, payload)

    if tags:
        add_movie_tags(conn, movie_id, tags)

    return movie_id, created



def upsert_movies_bulk(
    conn: sqlite3.Connection,
    movies_data: List[Dict[str, Any]],
) -> Tuple[int, int]:
    if not movies_data:
        return 0, 0

    titles_lower = {
        str(movie.get("title") or "").strip().lower()
        for movie in movies_data
        if str(movie.get("title") or "").strip()
    }
    if not titles_lower:
        return 0, 0

    placeholders = ",".join("?" for _ in titles_lower)
    existing_rows = conn.execute(
        f"SELECT * FROM movies WHERE LOWER(title) IN ({placeholders})",
        list(titles_lower),
    ).fetchall()
    existing_map = {
        _movie_key(str(row["title"]).strip(), row["year"]): row
        for row in existing_rows
    }

    states: Dict[Tuple[str, int], BulkMovieState] = {}
    for movie in movies_data:
        title = str(movie.get("title") or "").strip()
        if not title:
            continue

        payload = _payload_from_movie(movie)
        key = _movie_key(title, payload.year)
        incoming_tags = normalize_tags(movie.get("tags") or [])
        state = states.get(key)

        if state is None:
            existing = existing_map.get(key)
            if existing is None:
                states[key] = BulkMovieState(title=title, payload=payload, tags=incoming_tags)
            else:
                states[key] = BulkMovieState(
                    title=str(existing["title"]),
                    payload=_merge_movie_payload(_payload_from_row(existing), payload),
                    tags=incoming_tags,
                    db_id=int(existing["id"]),
                )
            continue

        state.payload = _merge_movie_payload(state.payload, payload)
        state.tags = normalize_tags([*state.tags, *incoming_tags])

    states_to_insert = [state for state in states.values() if state.db_id is None]
    states_to_update = [state for state in states.values() if state.db_id is not None]

    if states_to_update:
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
                poster_url = ?,
                runtime_minutes = ?,
                language = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            [
                (
                    state.payload.year,
                    state.payload.watched,
                    state.payload.age_band or "Family",
                    state.payload.notes,
                    state.payload.imdb_score,
                    state.payload.imdb_id,
                    state.payload.imdb_last_checked_at,
                    state.payload.imdb_source_url,
                    state.payload.localized_title,
                    state.payload.poster_url,
                    state.payload.runtime_minutes,
                    state.payload.language,
                    state.db_id,
                )
                for state in states_to_update
            ],
        )

    if states_to_insert:
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
                poster_url,
                runtime_minutes,
                language,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            [
                (
                    state.title,
                    state.payload.year,
                    state.payload.watched,
                    state.payload.age_band or "Family",
                    state.payload.notes,
                    state.payload.imdb_score,
                    state.payload.imdb_id,
                    state.payload.imdb_last_checked_at,
                    state.payload.imdb_source_url,
                    state.payload.localized_title,
                    state.payload.poster_url,
                    state.payload.runtime_minutes,
                    state.payload.language,
                )
                for state in states_to_insert
            ],
        )

        insert_titles = {state.title.lower() for state in states_to_insert}
        insert_placeholders = ",".join("?" for _ in insert_titles)
        inserted_rows = conn.execute(
            f"""
            SELECT id, title, IFNULL(year, -1) AS year
            FROM movies
            WHERE LOWER(title) IN ({insert_placeholders})
            """,
            list(insert_titles),
        ).fetchall()
        inserted_map = {
            _movie_key(str(row["title"]).strip(), row["year"]): int(row["id"])
            for row in inserted_rows
        }
        for state in states_to_insert:
            state.db_id = inserted_map.get(_movie_key(state.title, state.payload.year))

    all_tags = {tag for state in states.values() for tag in state.tags}
    if all_tags:
        tag_placeholders = ",".join("?" for _ in all_tags)
        tag_rows = conn.execute(
            f"SELECT id, name FROM tags WHERE name IN ({tag_placeholders})",
            list(all_tags),
        ).fetchall()
        tag_map = {str(row["name"]): int(row["id"]) for row in tag_rows}

        missing_tags = all_tags - set(tag_map.keys())
        if missing_tags:
            conn.executemany(
                "INSERT OR IGNORE INTO tags(name) VALUES (?)",
                [(tag,) for tag in missing_tags],
            )
            tag_rows = conn.execute(
                f"SELECT id, name FROM tags WHERE name IN ({tag_placeholders})",
                list(all_tags),
            ).fetchall()
            tag_map = {str(row["name"]): int(row["id"]) for row in tag_rows}

        movie_tag_inserts = [
            (state.db_id, tag_map[tag])
            for state in states.values()
            if state.db_id is not None
            for tag in state.tags
            if tag in tag_map
        ]
        if movie_tag_inserts:
            conn.executemany(
                "INSERT OR IGNORE INTO movie_tags(movie_id, tag_id) VALUES (?, ?)",
                movie_tag_inserts,
            )

    return len(states_to_insert), len(states_to_update)


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
        "poster_url": "poster_url",
        "runtime_minutes": "runtime_minutes",
        "language": "language",
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
                "poster_url": row["poster_url"],
                "runtime_minutes": row["runtime_minutes"],
                "language": row["language"],
                "tags": tag_map.get(movie_id, []),
                "avg_rating": round(float(row["avg_rating"] or 0), 2),
                "rating_count": int(row["rating_count"] or 0),
                "my_rating": int(row["my_rating"]) if row["my_rating"] is not None else None,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        )
    return out


@dataclass
class MovieListFilters:
    search: Optional[str] = None
    age_band: Optional[str] = None
    watched_filter: str = "all"
    tags: Optional[Iterable[str]] = None
    tags_mode: str = "any"
    sort: str = "title"
    order: str = "asc"
    device_id: Optional[str] = None
    limit: int = 500

    def __post_init__(self) -> None:
        if self.sort not in ALLOWED_SORTS:
            self.sort = "title"
        if self.order not in ALLOWED_ORDERS:
            self.order = "asc"
        if self.tags_mode not in {"any", "all"}:
            self.tags_mode = "any"
        self.limit = max(1, min(int(self.limit), 5000))

def _build_where_clause(
    search: Optional[str],
    age_band: Optional[str],
    watched_filter: str,
    normalized_tags: List[str],
    safe_tags_mode: str,
) -> Tuple[str, List[Any]]:
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

    return " AND ".join(where_parts), params

def _build_order_clause(safe_sort: str, safe_order: str) -> str:
    upper_order = safe_order.upper()
    order_map = {
        "year": f"(m.year IS NULL) ASC, m.year {upper_order}, LOWER(m.title) ASC",
        "imdb": f"(m.imdb_score IS NULL) ASC, m.imdb_score {upper_order}, LOWER(m.title) ASC",
        "rating": f"avg_rating {upper_order}, rating_count DESC, LOWER(m.title) ASC",
    }
    return order_map.get(safe_sort, f"LOWER(m.title) {upper_order}")


def list_movies(
    conn: sqlite3.Connection,
    filters: Optional[MovieListFilters] = None,
) -> List[Dict[str, Any]]:
    if filters is None:
        filters = MovieListFilters()

    normalized_tags = normalize_tags(filters.tags)
    where_clause, params = _build_where_clause(
        filters.search,
        filters.age_band,
        filters.watched_filter,
        normalized_tags,
        filters.tags_mode,
    )
    order_clause = _build_order_clause(filters.sort, filters.order)
    safe_limit = filters.limit

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
          m.poster_url,
          m.runtime_minutes,
          m.language,
          m.created_at,
          m.updated_at,
          COALESCE((SELECT AVG(rating) FROM user_ratings WHERE movie_id = m.id), 0) AS avg_rating,
          COALESCE((SELECT COUNT(*) FROM user_ratings WHERE movie_id = m.id), 0) AS rating_count,
          mr.rating AS my_rating
        FROM movies m
        LEFT JOIN user_ratings mr ON mr.movie_id = m.id AND mr.device_id = ?
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT ?
    """

    all_params: List[Any] = [filters.device_id or ""]
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
          m.poster_url,
          m.runtime_minutes,
          m.language,
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



def bulk_upsert_movies(
    conn: sqlite3.Connection,
    movies_data: List[Dict[str, Any]],
) -> Tuple[int, int]:
    return upsert_movies_bulk(conn, movies_data)
