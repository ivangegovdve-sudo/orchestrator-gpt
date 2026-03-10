from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

try:
    from . import imdb_service, movies_db, movies_import, utils  # type: ignore
except ImportError:
    import imdb_service  # type: ignore
    import movies_db  # type: ignore
    import movies_import  # type: ignore
    import utils  # type: ignore

router = APIRouter(prefix="/api/movies", tags=["movies"])


class MovieCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=250)
    year: Optional[int] = Field(default=None, ge=1888, le=2100)
    watched: bool = False
    age_band: Optional[str] = Field(default="Family", max_length=40)
    notes: Optional[str] = Field(default=None, max_length=4000)
    tags: List[str] = Field(default_factory=list)
    imdb_score: Optional[float] = Field(default=None, ge=0, le=10)
    imdb_id: Optional[str] = Field(default=None, max_length=20)
    imdb_source_url: Optional[str] = Field(default=None, max_length=500)
    localized_title: Optional[str] = Field(default=None, max_length=250)


class MovieUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    year: Optional[int] = Field(default=None, ge=1888, le=2100)
    watched: Optional[bool] = None
    age_band: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=4000)
    tags: Optional[List[str]] = None
    replace_tags: bool = True
    imdb_score: Optional[float] = Field(default=None, ge=0, le=10)
    imdb_id: Optional[str] = Field(default=None, max_length=20)
    imdb_last_checked_at: Optional[str] = Field(default=None, max_length=50)
    imdb_source_url: Optional[str] = Field(default=None, max_length=500)


class RatingCreate(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=120)
    rating: int = Field(..., ge=1, le=5)


class IMDbUpdateRequest(BaseModel):
    force: bool = True


class MovieOut(BaseModel):
    id: int
    title: str
    year: Optional[int] = None
    watched: bool
    age_band: Optional[str] = None
    notes: Optional[str] = None
    localized_title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    imdb_score: Optional[float] = None
    imdb_id: Optional[str] = None
    imdb_last_checked_at: Optional[str] = None
    imdb_source_url: Optional[str] = None
    avg_rating: float = 0.0
    rating_count: int = 0
    my_rating: Optional[int] = None
    created_at: str
    updated_at: str


class MovieListResponse(BaseModel):
    items: List[MovieOut]
    total: int
    facets: dict


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


class IMDbUpdateResponse(BaseModel):
    ok: bool
    used_cache: bool
    message: str
    movie: MovieOut


def _movie_or_404(conn, movie_id: int, device_id: Optional[str] = None) -> dict:
    movie = movies_db.get_movie_by_id(conn, movie_id=movie_id, device_id=device_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@router.get("", response_model=MovieListResponse)
def list_movies(
    search: Optional[str] = Query(default=None, max_length=200),
    age_band: Optional[str] = Query(default=None, max_length=40),
    status: Literal["all", "unwatched", "watched"] = "all",
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
            watched_filter=status,
            tags=utils.parse_tags(tags),
            tags_mode=tags_mode,
            sort=sort,
            order=order,
            device_id=device_id,
            limit=limit,
        )
        facets = movies_db.get_facets(conn)
    finally:
        conn.close()

    return MovieListResponse(items=[MovieOut(**item) for item in items], total=len(items), facets=facets)


@router.get("/facets")
def get_facets() -> dict:
    conn = movies_db.get_connection()
    try:
        facets = movies_db.get_facets(conn)
    finally:
        conn.close()
    return facets


@router.post("", response_model=MovieOut)
def create_movie(payload: MovieCreate, device_id: Optional[str] = Query(default=None, max_length=120)) -> MovieOut:
    body = payload.dict()
    tags = body.pop("tags", [])

    conn = movies_db.get_connection()
    try:
        with conn:
            movie_id, _created = movies_db.upsert_movie(conn, body, tags=tags)
        movie = _movie_or_404(conn, movie_id=movie_id, device_id=device_id)
    finally:
        conn.close()

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
                _movie_id, is_created = movies_db.upsert_movie(conn, movie, tags=tags)
                if is_created:
                    created += 1
                else:
                    updated += 1
    finally:
        conn.close()

    return BulkImportResponse(processed=len(parsed), created=created, updated=updated, skipped=0)


@router.patch("/{movie_id}", response_model=MovieOut)
def patch_movie(
    movie_id: int,
    payload: MovieUpdate,
    device_id: Optional[str] = Query(default=None, max_length=120),
) -> MovieOut:
    body = payload.dict(exclude_unset=True)
    tags = body.pop("tags", None)
    replace_tags = bool(body.pop("replace_tags", True))

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
                    replace_tags_flag=replace_tags,
                )
        except LookupError:
            raise HTTPException(status_code=404, detail="Movie not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        movie = _movie_or_404(conn, movie_id=movie_id, device_id=device_id)
    finally:
        conn.close()

    return MovieOut(**movie)


@router.post("/{movie_id}/rate", response_model=RatingSummary)
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

        summary = movies_db.get_rating_summary(conn, movie_id=movie_id, device_id=payload.device_id)
    finally:
        conn.close()

    return RatingSummary(movie_id=movie_id, **summary)


@router.post("/{movie_id}/ratings", response_model=RatingSummary)
def rate_movie_alias(movie_id: int, payload: RatingCreate) -> RatingSummary:
    return rate_movie(movie_id=movie_id, payload=payload)


@router.post("/{movie_id}/imdb/update", response_model=IMDbUpdateResponse)
def update_imdb(
    movie_id: int,
    payload: IMDbUpdateRequest,
    device_id: Optional[str] = Query(default=None, max_length=120),
) -> IMDbUpdateResponse:
    conn = movies_db.get_connection()
    try:
        movie = _movie_or_404(conn, movie_id=movie_id, device_id=device_id)

        if imdb_service.should_use_cached(movie.get("imdb_last_checked_at"), force=payload.force):
            return IMDbUpdateResponse(
                ok=True,
                used_cache=True,
                message="IMDb data is fresh (cached within 7 days).",
                movie=MovieOut(**movie),
            )

        result = imdb_service.refresh_imdb_score(
            title=movie["title"],
            year=movie.get("year"),
            imdb_id=movie.get("imdb_id"),
        )

        update_fields = {
            "imdb_last_checked_at": result.checked_at,
        }
        if result.imdb_id:
            update_fields["imdb_id"] = result.imdb_id
        if result.imdb_source_url:
            update_fields["imdb_source_url"] = result.imdb_source_url
        if result.ok and result.imdb_score is not None:
            update_fields["imdb_score"] = result.imdb_score

        with conn:
            movies_db.update_movie(conn, movie_id=movie_id, fields=update_fields)

        updated_movie = _movie_or_404(conn, movie_id=movie_id, device_id=device_id)

        if result.ok:
            return IMDbUpdateResponse(
                ok=True,
                used_cache=False,
                message="IMDb score updated.",
                movie=MovieOut(**updated_movie),
            )

        return IMDbUpdateResponse(
            ok=False,
            used_cache=False,
            message=result.error or "IMDb update failed. Existing score retained.",
            movie=MovieOut(**updated_movie),
        )
    finally:
        conn.close()
