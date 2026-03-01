from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

try:
    from . import movies_db, movies_import  # type: ignore
except ImportError:
    import movies_db  # type: ignore
    import movies_import  # type: ignore

router = APIRouter(prefix="/api/movies", tags=["movies"])


class MovieCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=250)
    year: Optional[int] = Field(default=None, ge=1888, le=2100)
    imdb_score: Optional[float] = Field(default=None, ge=0, le=10)
    age_band: Optional[str] = Field(default="Family", max_length=40)
    watched: bool = Field(default=False)
    notes: Optional[str] = Field(default=None, max_length=4000)
    localized_title: Optional[str] = Field(default=None, max_length=250)
    tags: List[str] = Field(default_factory=list)


class MovieUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    year: Optional[int] = Field(default=None, ge=1888, le=2100)
    imdb_score: Optional[float] = Field(default=None, ge=0, le=10)
    age_band: Optional[str] = Field(default=None, max_length=40)
    watched: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=4000)
    localized_title: Optional[str] = Field(default=None, max_length=250)
    tags: Optional[List[str]] = None
    replace_tags: bool = True


class WatchedUpdate(BaseModel):
    watched: bool


class RatingCreate(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=120)
    rating: int = Field(..., ge=1, le=5)


class MovieOut(BaseModel):
    id: int
    title: str
    year: Optional[int] = None
    imdb_score: Optional[float] = None
    age_band: Optional[str] = None
    watched: bool
    notes: Optional[str] = None
    localized_title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    avg_rating: float = 0.0
    rating_count: int = 0
    my_rating: Optional[int] = None
    created_at: str
    updated_at: str


class FacetsOut(BaseModel):
    age_bands: List[str]
    tags: List[str]


class MovieListResponse(BaseModel):
    items: List[MovieOut]
    total: int
    facets: FacetsOut


class BulkImportRequest(BaseModel):
    lines: str = Field(..., min_length=1)
    default_age_band: str = Field(default="Family", max_length=40)
    default_tags: List[str] = Field(default_factory=list)


class BulkImportResponse(BaseModel):
    processed: int
    created: int
    updated: int
    skipped: int


class RatingSummary(BaseModel):
    movie_id: int
    avg_rating: float
    rating_count: int
    my_rating: Optional[int] = None


def _parse_tags(tag_csv: Optional[str]) -> List[str]:
    if not tag_csv:
        return []
    return [part.strip().lower() for part in tag_csv.split(",") if part.strip()]


def _get_movie_or_404(movie_id: int, device_id: Optional[str] = None) -> MovieOut:
    conn = movies_db.get_connection()
    try:
        movie = movies_db.get_movie_by_id(conn, movie_id=movie_id, device_id=device_id)
    finally:
        conn.close()

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    return MovieOut(**movie)


@router.get("", response_model=MovieListResponse)
def list_movies(
    search: Optional[str] = Query(default=None, max_length=200),
    age_band: Optional[str] = Query(default=None, max_length=40),
    watched: Literal["all", "unwatched", "watched"] = "all",
    tags: Optional[str] = Query(default=None, description="Comma-separated tag names"),
    tags_mode: Literal["any", "all"] = "any",
    sort: Literal["title", "year", "imdb", "rating"] = "title",
    order: Literal["asc", "desc"] = "asc",
    device_id: Optional[str] = Query(default=None, max_length=120),
    limit: int = Query(default=500, ge=1, le=5000),
) -> MovieListResponse:
    conn = movies_db.get_connection()
    try:
        items = movies_db.list_movies(
            conn,
            search=search,
            age_band=age_band,
            watched_filter=watched,
            tags=_parse_tags(tags),
            tags_mode=tags_mode,
            sort=sort,
            order=order,
            device_id=device_id,
            limit=limit,
        )
        facets = movies_db.get_facets(conn)
    finally:
        conn.close()

    return MovieListResponse(
        items=[MovieOut(**item) for item in items],
        total=len(items),
        facets=FacetsOut(**facets),
    )


@router.get("/facets", response_model=FacetsOut)
def get_facets() -> FacetsOut:
    conn = movies_db.get_connection()
    try:
        facets = movies_db.get_facets(conn)
    finally:
        conn.close()
    return FacetsOut(**facets)


@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, device_id: Optional[str] = Query(default=None, max_length=120)) -> MovieOut:
    return _get_movie_or_404(movie_id=movie_id, device_id=device_id)


@router.post("", response_model=MovieOut)
def create_movie(
    payload: MovieCreate,
    device_id: Optional[str] = Query(default=None, max_length=120),
) -> MovieOut:
    body = payload.dict()
    tags = body.pop("tags", [])

    conn = movies_db.get_connection()
    try:
        with conn:
            movie_id, _created = movies_db.upsert_movie(conn, body, tags=tags)
        movie = movies_db.get_movie_by_id(conn, movie_id=movie_id, device_id=device_id)
    finally:
        conn.close()

    if not movie:
        raise HTTPException(status_code=500, detail="Movie could not be loaded after create")

    return MovieOut(**movie)


@router.post("/import", response_model=BulkImportResponse)
def import_movies(payload: BulkImportRequest) -> BulkImportResponse:
    parsed = movies_import.parse_bulk_lines(
        payload.lines,
        default_age_band=payload.default_age_band,
        default_tags=payload.default_tags,
    )

    created = 0
    updated = 0

    conn = movies_db.get_connection()
    try:
        with conn:
            for movie in parsed:
                tags = movie.get("tags") or []
                movie_id, is_created = movies_db.upsert_movie(conn, movie, tags=tags)
                if is_created:
                    created += 1
                else:
                    updated += 1
                if not movie_id:
                    raise RuntimeError("Import failed for one movie entry")
    finally:
        conn.close()

    return BulkImportResponse(
        processed=len(parsed),
        created=created,
        updated=updated,
        skipped=0,
    )


@router.patch("/{movie_id}", response_model=MovieOut)
def patch_movie(
    movie_id: int,
    payload: MovieUpdate,
    device_id: Optional[str] = Query(default=None, max_length=120),
) -> MovieOut:
    body = payload.dict(exclude_unset=True)
    tags = body.pop("tags", None)
    replace_tags_flag = bool(body.pop("replace_tags", True))

    if not body and tags is None:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    conn = movies_db.get_connection()
    try:
        try:
            with conn:
                movies_db.update_movie(
                    conn,
                    movie_id=movie_id,
                    fields=body,
                    tags=tags,
                    replace_tags_flag=replace_tags_flag,
                )
        except LookupError:
            raise HTTPException(status_code=404, detail="Movie not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        movie = movies_db.get_movie_by_id(conn, movie_id=movie_id, device_id=device_id)
    finally:
        conn.close()

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    return MovieOut(**movie)


@router.put("/{movie_id}/watched", response_model=MovieOut)
def update_watched(
    movie_id: int,
    payload: WatchedUpdate,
    device_id: Optional[str] = Query(default=None, max_length=120),
) -> MovieOut:
    conn = movies_db.get_connection()
    try:
        try:
            with conn:
                movies_db.set_watched(conn, movie_id=movie_id, watched=payload.watched)
        except LookupError:
            raise HTTPException(status_code=404, detail="Movie not found")

        movie = movies_db.get_movie_by_id(conn, movie_id=movie_id, device_id=device_id)
    finally:
        conn.close()

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    return MovieOut(**movie)


@router.post("/{movie_id}/ratings", response_model=RatingSummary)
def rate_movie(movie_id: int, payload: RatingCreate) -> RatingSummary:
    conn = movies_db.get_connection()
    try:
        try:
            with conn:
                movies_db.set_rating(
                    conn,
                    movie_id=movie_id,
                    device_id=payload.device_id,
                    rating=payload.rating,
                )
        except LookupError:
            raise HTTPException(status_code=404, detail="Movie not found")

        summary = movies_db.get_rating_summary(
            conn,
            movie_id=movie_id,
            device_id=payload.device_id,
        )
    finally:
        conn.close()

    return RatingSummary(movie_id=movie_id, **summary)
