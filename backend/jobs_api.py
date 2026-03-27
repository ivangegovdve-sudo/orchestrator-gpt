from datetime import datetime, timezone
from enum import Enum
import threading
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, HttpUrl

router = APIRouter()


class JobStatus(str, Enum):
    new = "new"
    screened = "screened"
    applied = "applied"
    rejected = "rejected"
    archived = "archived"


class JobIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    company: str = Field(..., min_length=2, max_length=200)
    url: HttpUrl
    location: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    source: Optional[str] = Field(default=None, max_length=200)


class JobOut(JobIn):
    id: str
    score: int
    status: JobStatus = JobStatus.new
    created_at: datetime
    updated_at: datetime


class JobStatusUpdate(BaseModel):
    status: JobStatus


class JobListResponse(BaseModel):
    items: List[JobOut]
    total: int
    limit: int
    offset: int


_LOCK = threading.Lock()
_JOBS: Dict[str, JobOut] = {}
_JOBS_BY_URL: Dict[str, str] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(job: JobOut) -> dict:
    return job.dict()


_SENIOR_MARKERS = ("senior", "lead", "principal", "staff")
_CREATIVE_MARKERS = ("game", "unity", "unreal", "spine", "ui", "ux", "animation")
_REMOTE_MARKERS = ("remote", "distributed", "work from home")
_INDUSTRY_MARKERS = ("casino", "slot", "igaming")
_AVOID_MARKERS = ("intern", "junior", "unpaid", "volunteer")


def _score_job(job: JobIn) -> int:
    score = 0
    title = (job.title or "").lower()
    desc = (job.description or "").lower()
    location = (job.location or "").lower()

    if any(marker in title for marker in _SENIOR_MARKERS):
        score += 2
    if any(marker in desc for marker in _CREATIVE_MARKERS):
        score += 4
    if any(marker in location for marker in _REMOTE_MARKERS):
        score += 2
    if any(marker in desc for marker in _INDUSTRY_MARKERS):
        score += 3
    if any(marker in desc for marker in _AVOID_MARKERS):
        score -= 10

    return score


@router.post("/jobs/intake", response_model=List[JobOut])
def intake_jobs(
    jobs: List[JobIn],
    skip_duplicates: bool = Query(default=True, description="Skip jobs with matching URLs"),
) -> List[dict]:
    stored: List[dict] = []

    with _LOCK:
        for job in jobs:
            url_key = str(job.url)
            if skip_duplicates and url_key in _JOBS_BY_URL:
                existing_id = _JOBS_BY_URL[url_key]
                stored.append(_serialize(_JOBS[existing_id]))
                continue

            job_id = str(uuid.uuid4())
            now = _now()
            stored_job = JobOut(
                id=job_id,
                score=_score_job(job),
                status=JobStatus.new,
                created_at=now,
                updated_at=now,
                **job.dict(),
            )
            _JOBS[job_id] = stored_job
            _JOBS_BY_URL[url_key] = job_id
            stored.append(_serialize(stored_job))

    return stored


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(
    status: Optional[JobStatus] = None,
    min_score: int = Query(default=0, ge=-100, le=100),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict:
    with _LOCK:
        items = list(_JOBS.values())

    if status:
        items = [job for job in items if job.status == status]

    items = [job for job in items if job.score >= min_score]
    items.sort(key=lambda job: job.score, reverse=True)

    total = len(items)
    sliced = items[offset : offset + limit]
    return {
        "items": [_serialize(job) for job in sliced],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/jobs/top", response_model=List[JobOut])
def get_top_jobs(
    min_score: int = Query(default=12, ge=-100, le=100),
    limit: int = Query(default=10, ge=1, le=50),
) -> List[dict]:
    with _LOCK:
        filtered = [job for job in _JOBS.values() if job.score >= min_score]

    top = sorted(filtered, key=lambda job: job.score, reverse=True)[:limit]
    return [_serialize(job) for job in top]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str) -> dict:
    with _LOCK:
        job = _JOBS.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return _serialize(job)


@router.post("/jobs/{job_id}/status", response_model=JobOut)
def set_status(job_id: str, payload: JobStatusUpdate) -> dict:
    with _LOCK:
        job = _JOBS.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        updated_job = job.copy(update={"status": payload.status, "updated_at": _now()})
        _JOBS[job_id] = updated_job

    return _serialize(updated_job)


@router.delete("/jobs/{job_id}", response_model=JobOut)
def delete_job(job_id: str) -> dict:
    with _LOCK:
        job = _JOBS.pop(job_id, None)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        _JOBS_BY_URL.pop(str(job.url), None)

    return _serialize(job)
