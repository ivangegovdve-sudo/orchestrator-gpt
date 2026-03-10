import argparse
from pathlib import Path
from typing import List

try:
    from . import movies_db, movies_import  # type: ignore
except ImportError:
    import movies_db  # type: ignore
    import movies_import  # type: ignore

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SEED_FILE = REPO_ROOT / "data" / "movies_seed_starter.txt"


def seed_movies(seed_file: Path, default_age_band: str = "Family", default_tags: List[str] | None = None) -> dict:
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_file}")

    text = seed_file.read_text(encoding="utf-8")
    parsed = movies_import.parse_bulk_lines(
        text,
        default_age_band=default_age_band,
        default_tags=default_tags or [],
    )

    created = 0
    updated = 0

    conn = movies_db.get_connection()
    try:
        with conn:
            created, updated = movies_db.bulk_upsert_movies(conn, parsed)
    finally:
        conn.close()

    return {
        "processed": len(parsed),
        "created": created,
        "updated": updated,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed the Kids Movie Library SQLite database.")
    parser.add_argument(
        "--file",
        default=str(DEFAULT_SEED_FILE),
        help="Path to newline-separated movie list (default: data/movies_seed_starter.txt)",
    )
    parser.add_argument(
        "--age-band",
        default="Family",
        help="Default age band for imported lines (default: Family)",
    )
    parser.add_argument(
        "--tags",
        default="",
        help="Comma-separated tags added to each imported row",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    tag_list = [t.strip().lower() for t in (args.tags or "").split(",") if t.strip()]
    result = seed_movies(Path(args.file), default_age_band=args.age_band, default_tags=tag_list)
    print(
        "Seed completed: "
        f"processed={result['processed']} created={result['created']} updated={result['updated']}"
    )


if __name__ == "__main__":
    main()
