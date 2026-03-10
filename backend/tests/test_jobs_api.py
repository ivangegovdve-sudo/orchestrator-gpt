import pytest
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

@pytest.mark.parametrize("title", ["Senior Software Engineer", "Staff Engineer"])
def test_score_job_senior_marker(title):
    job = create_job(title=title)
    assert _score_job(job) == 2


@pytest.mark.parametrize("description", ["Experience with Unity and UI/UX", "Game animation role"])
def test_score_job_creative_marker(description):
    job = create_job(description=description)
    assert _score_job(job) == 4


@pytest.mark.parametrize("location", ["Fully Remote", "Distributed team"])
def test_score_job_remote_marker(location):
    job = create_job(location=location)
    assert _score_job(job) == 2


# Avoid words like "building" (contains "ui") or "igaming" (contains "game" which is a creative marker)
@pytest.mark.parametrize("description", ["Developing a new casino platform", "Slot machine developer"])
def test_score_job_industry_marker(description):
    job = create_job(description=description)
    assert _score_job(job) == 3


@pytest.mark.parametrize("description", ["This is an unpaid intern position", "Junior developer wanted"])
def test_score_job_avoid_marker(description):
    job = create_job(description=description)
    assert _score_job(job) == -10


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
