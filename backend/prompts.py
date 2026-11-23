"""The two prompts the server sends to Claude, and the JSON shape each answer must take.

Both prompts ask for quotes copied word for word from the transcript. `model.py`
checks every quote against the transcript and drops any it can't find, so the
model's word is never taken for what was said.
"""

from schemas import Device, TranscriptLine

NOTE_SECTIONS: list[tuple[str, str]] = [
    ("subjective", "Subjective"),
    ("objective", "Objective"),
    ("assessment", "Assessment"),
    ("plan", "Plan"),
]

_QUOTE_RULES = """\
Rules for every quote:
- Copy it from ONE transcript line, word for word: same words, same order, nothing
  added, nothing left out in the middle. Leave out the [speaker] label.
- Keep it short: the fewest words that show the point, usually one sentence or part of one.
- If no line says it, there is no quote. Never write a quote that is not in the transcript."""


def format_transcript(transcript: list[TranscriptLine]) -> str:
    """One line per stretch of speech, with its speaker label in brackets."""
    return "\n".join(f"[{line.speaker or '?'}] {line.text}" for line in transcript)


def _questions_block(device: Device) -> str:
    return "\n".join(
        f"- {q.id}: {q.question} (A Medicare reviewer looks for: {q.reviewer_need}.)" for q in device.questions
    )


def _answered_schema(device: Device) -> dict:
    return {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "question_id": {"type": "string", "enum": [q.id for q in device.questions]},
                "quote": {"type": "string"},
            },
            "required": ["question_id", "quote"],
            "additionalProperties": False,
        },
    }


def coverage_prompt(device: Device, transcript: list[TranscriptLine]) -> str:
    return f"""\
You help a prosthetics and orthotics clinician during a patient visit. The device
being evaluated is: {device.label}.

These are the things the visit should cover:
{_questions_block(device)}

Below is the transcript so far. The speaker labels come from automatic speaker
detection; they do not say which speaker is the clinician and which is the patient.

Name each thing the transcript already covers, with the quote that covers it. A
thing is covered only when a line actually answers it, not when someone only asks
about it. Leave out anything not covered yet. One quote per thing.

{_QUOTE_RULES}

Transcript:
{format_transcript(transcript)}
"""


def coverage_schema(device: Device) -> dict:
    return {
        "type": "object",
        "properties": {"answered": _answered_schema(device)},
        "required": ["answered"],
        "additionalProperties": False,
    }


def note_prompt(device: Device, transcript: list[TranscriptLine]) -> str:
    return f"""\
You write the clinical note for a prosthetics and orthotics visit. The device being
evaluated is: {device.label}.

Write a SOAP note from the transcript below:
- subjective: what the patient reports (how they walk, pain, history, goals).
- objective: what the clinician observed or measured (exam findings, test results).
- assessment: the clinician's judgement (function level, what limits it, potential).
- plan: what will be done next.

Every sentence must carry the quote it came from. Write only what the transcript
says. Invent nothing: no numbers, sides, dates, names or findings that were not
said. If nothing was said for a section, leave that section as an empty list.
Write each sentence in plain, concise clinical English, one fact or two closely
related facts per sentence.

Also name each of these things the visit covered, with the quote that covers it
(only when a line actually answers it, not when someone only asks about it):
{_questions_block(device)}

{_QUOTE_RULES}

The speaker labels come from automatic speaker detection; they do not say which
speaker is the clinician and which is the patient. Tell them apart from what is said.

Transcript:
{format_transcript(transcript)}
"""


def note_schema(device: Device) -> dict:
    sentences = {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {"text": {"type": "string"}, "quote": {"type": "string"}},
            "required": ["text", "quote"],
            "additionalProperties": False,
        },
    }
    section_ids = [section_id for section_id, _ in NOTE_SECTIONS]
    return {
        "type": "object",
        "properties": {**{sid: sentences for sid in section_ids}, "answered": _answered_schema(device)},
        "required": [*section_ids, "answered"],
        "additionalProperties": False,
    }
