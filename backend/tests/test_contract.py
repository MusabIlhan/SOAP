"""Each route's answer matches its model in schemas.py.

The app runs on SampleServices, so this never calls Soniox or Claude.
Run: `cd backend && .venv/bin/python -m pytest tests/test_contract.py`
"""

import pytest

from app import create_app
from devices import DEVICES
from schemas import (
    CoverageResponse,
    DevicesResponse,
    ErrorResponse,
    NoteResponse,
    TranscriptionKeyResponse,
)
from services import SAMPLE_QUOTES, SAMPLE_TRANSCRIPT, SampleServices, transcript_text

TRANSCRIPT = [line.model_dump() for line in SAMPLE_TRANSCRIPT]


@pytest.fixture
def client():
    return create_app(SampleServices()).test_client()


def test_devices(client):
    res = client.get("/api/devices")
    assert res.status_code == 200
    body = DevicesResponse.model_validate(res.get_json())
    assert [d.id for d in body.devices] == ["leg", "afo", "ko"]
    assert [len(d.questions) for d in body.devices] == [7, 4, 4]
    assert body.devices[0].label == "New leg or socket"


def test_transcription_key(client):
    res = client.post("/api/transcription-key")
    assert res.status_code == 200
    body = TranscriptionKeyResponse.model_validate(res.get_json())
    assert body.api_key


def test_coverage_empty_transcript_is_all_open(client):
    res = client.post("/api/coverage", json={"device_id": "leg", "transcript": []})
    assert res.status_code == 200
    body = CoverageResponse.model_validate(res.get_json())
    assert [i.question_id for i in body.items] == [q.id for q in DEVICES[0].questions]
    assert not any(i.covered for i in body.items)


def test_coverage_quotes_are_in_the_transcript(client):
    res = client.post("/api/coverage", json={"device_id": "leg", "transcript": TRANSCRIPT})
    assert res.status_code == 200
    body = CoverageResponse.model_validate(res.get_json())
    text = transcript_text(SAMPLE_TRANSCRIPT)
    assert all(i.covered for i in body.items)
    for item in body.items:
        assert item.quote and item.quote in text


def test_note(client):
    res = client.post("/api/note", json={"device_id": "leg", "transcript": TRANSCRIPT})
    assert res.status_code == 200
    body = NoteResponse.model_validate(res.get_json())
    assert [s.id for s in body.sections] == ["subjective", "objective", "assessment", "plan"]
    text = transcript_text(SAMPLE_TRANSCRIPT)
    for section in body.sections:
        for sentence in section.sentences:
            assert sentence.quote in text
    assert len(body.coverage) == 7


@pytest.mark.parametrize("route", ["/api/coverage", "/api/note"])
def test_bad_request_says_why(client, route):
    res = client.post(route, json={"device_id": "wheelchair", "transcript": []})
    assert res.status_code == 400
    assert "device_id" in ErrorResponse.model_validate(res.get_json()).error


def test_sample_quotes_are_in_the_sample_transcript():
    text = transcript_text(SAMPLE_TRANSCRIPT)
    for quote in SAMPLE_QUOTES.values():
        assert quote in text
