"""The shapes every route speaks, as Pydantic models.

`frontend/src/types.ts` mirrors these by hand; change both together.
`tests/test_contract.py` checks each route's answer against them.
"""

from typing import Literal

from pydantic import BaseModel, Field

DeviceId = Literal["leg", "afo", "ko"]
NoteSectionId = Literal["subjective", "objective", "assessment", "plan"]


class GuidingQuestion(BaseModel):
    """One thing to cover in the visit, from GUIDING-QUESTIONS.md."""

    id: str
    label: str = Field(description='Short name on screen, e.g. "Walking test".')
    question: str = Field(description="The full question shown to the clinician.")
    reviewer_need: str = Field(description="What a Medicare reviewer looks for.")


class Device(BaseModel):
    id: DeviceId
    label: str
    questions: list[GuidingQuestion]


class DevicesResponse(BaseModel):
    devices: list[Device]


class TranscriptionKeyResponse(BaseModel):
    """A short-lived Soniox key the browser uses to stream audio itself."""

    api_key: str
    expires_at: str = Field(description="ISO 8601 time the key stops working.")


class TranscriptLine(BaseModel):
    """One stretch of final words from one speaker, in the order spoken."""

    speaker: str = Field(description='Soniox speaker label ("1", "2"), or "" if unknown.')
    text: str


class CoverageRequest(BaseModel):
    device_id: DeviceId
    transcript: list[TranscriptLine]


class CoverageItem(BaseModel):
    """Whether the visit covered one question.

    `covered` is true only with a quote that appears in the transcript word for word.
    """

    question_id: str
    covered: bool
    quote: str | None = None


class CoverageResponse(BaseModel):
    device_id: DeviceId
    items: list[CoverageItem] = Field(description="One item per question, in the device's order.")


class NoteRequest(BaseModel):
    device_id: DeviceId
    transcript: list[TranscriptLine]


class NoteSentence(BaseModel):
    text: str
    quote: str = Field(description="The transcript words this sentence came from, word for word.")


class NoteSection(BaseModel):
    id: NoteSectionId
    title: str
    sentences: list[NoteSentence]


class NoteResponse(BaseModel):
    device_id: DeviceId
    sections: list[NoteSection] = Field(description="Subjective, Objective, Assessment, Plan, in that order.")
    coverage: list[CoverageItem] = Field(
        description="The check run with the note. It can add greens; the screen never takes one away."
    )


class ErrorResponse(BaseModel):
    """Every non-2xx answer. `error` is a plain sentence the screen can show as is."""

    error: str
