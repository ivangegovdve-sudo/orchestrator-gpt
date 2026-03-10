import pytest
from pydantic import HttpUrl
from backend.jobs_api import JobIn, _score_job

def create_job(title="Software Engineer", company="Tech Corp", location=None, description=None) -> JobIn:
    return JobIn(
        title=title,
        company=company,
        url="https://example.com/job",
        location=location,
        description=description
    )

def test_score_job_empty_job():
    job = create_job()
    assert _score_job(job) == 0

def test_score_job_senior_marker():
    job = create_job(title="Senior Software Engineer")
    assert _score_job(job) == 2

    job2 = create_job(title="Staff Engineer")
    assert _score_job(job2) == 2

def test_score_job_creative_marker():
    job = create_job(description="Experience with Unity and UI/UX")
    assert _score_job(job) == 4

    job2 = create_job(description="Game animation role")
    assert _score_job(job2) == 4

def test_score_job_remote_marker():
    job = create_job(location="Fully Remote")
    assert _score_job(job) == 2

    job2 = create_job(location="Distributed team")
    assert _score_job(job2) == 2

def test_score_job_industry_marker():
    # Avoid words like "building" (contains "ui") or "igaming" (contains "game" which is a creative marker)
    job = create_job(description="Developing a new casino platform")
    assert _score_job(job) == 3

    job2 = create_job(description="Slot machine developer")
    assert _score_job(job2) == 3

def test_score_job_avoid_marker():
    job = create_job(description="This is an unpaid intern position")
    assert _score_job(job) == -10

    job2 = create_job(description="Junior developer wanted")
    assert _score_job(job2) == -10

def test_score_job_combined_markers():
    job = create_job(
        title="Senior Game Developer",  # senior (+2)
        location="Remote",              # remote (+2)
        description="Unity experience required for this casino product." # creative (+4), industry (+3)
    )
    # 2 + 2 + 4 + 3 = 11
    assert _score_job(job) == 11

def test_score_job_case_insensitivity():
    job = create_job(
        title="SENIOR Developer",
        location="REMOTE",
        description="UNITY CASINO"
    )
    # 2 + 2 + 4 + 3 = 11
    assert _score_job(job) == 11

def test_score_job_none_fields():
    # JobIn allows None for location and description
    job = create_job(title="Developer", location=None, description=None)
    assert _score_job(job) == 0

def test_score_job_negative_overall():
    job = create_job(
        title="Game Developer",
        # Unity -> creative (+4)
        # junior -> avoid (-10)
        description="Unity experience required for this junior role."
    )
    # -10 + 4 = -6
    assert _score_job(job) == -6
