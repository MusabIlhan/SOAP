"""What the routes call to do real work, and fixed sample answers for building against.

`app.create_app(services)` takes anything shaped like `Services`. Today the default is
`SampleServices`, which calls nothing outside this process. The real Soniox and Claude
calls slot in by passing another `Services`; the contract test keeps using the samples,
so it never spends plan usage or needs the network.
"""

from datetime import datetime, timedelta, timezone
from typing import Protocol

from schemas import (
    CoverageItem,
    Device,
    NoteResponse,
    NoteSection,
    NoteSentence,
    TranscriptionKeyResponse,
    TranscriptLine,
)


class ServiceError(Exception):
    """A call outside the app failed. The message is shown on screen as is,
    e.g. "Couldn't reach Claude: you are logged out"."""


class Services(Protocol):
    def transcription_key(self) -> TranscriptionKeyResponse: ...

    def coverage(self, device: Device, transcript: list[TranscriptLine]) -> list[CoverageItem]: ...

    def note(self, device: Device, transcript: list[TranscriptLine]) -> NoteResponse: ...


def transcript_text(transcript: list[TranscriptLine]) -> str:
    """The transcript as one string, the text a quote must be found in word for word."""
    return "\n".join(line.text for line in transcript)


# Lines from DEMO-SCRIPT.md, one per question, as the sample "model" would quote them.
SAMPLE_QUOTES: dict[str, str] = {
    "walk_today": "I walk on my own around the house and to the mailbox, no cane.",
    "why_this_device": "I'm wearing three extra socks just to keep it on",
    "limb_and_health": "The limb has shrunk since we fitted this socket",
    "history": "they took the leg below the knee in March 2023. This is my first prosthesis.",
    "wants_to_walk": "Walk my granddaughter to school.",
    "walk_potential": "That's a K3 level.",
    "test_result": "we did a six-minute walk test today, and you covered 350 meters.",
}

SAMPLE_TRANSCRIPT: list[TranscriptLine] = [
    TranscriptLine(speaker="1", text="Morning, Robert. So, how has walking been since the surgery?"),
    TranscriptLine(
        speaker="2",
        text="Better than last year. I walk on my own around the house and to the mailbox, no cane. "
        "But after a block or so the leg hurts and I have to stop.",
    ),
    TranscriptLine(speaker="1", text="What hurts, exactly?"),
    TranscriptLine(
        speaker="2",
        text="The socket. It's loose now. I'm wearing three extra socks just to keep it on, "
        "and it rubs at the end of my shin.",
    ),
    TranscriptLine(
        speaker="1",
        text="Let me take a look. The limb has shrunk since we fitted this socket, there's redness over "
        "the end of the tibia, but no open skin. The knee moves fully. How is your sugar these days?",
    ),
    TranscriptLine(speaker="2", text="Under control. My A1c was seven last month."),
    TranscriptLine(speaker="1", text="Good. Remind me how this started."),
    TranscriptLine(
        speaker="2",
        text="Diabetes. An infection in my foot wouldn't heal, and they took the leg below the knee in "
        "March 2023. This is my first prosthesis.",
    ),
    TranscriptLine(speaker="1", text="And what would you like to be able to do?"),
    TranscriptLine(
        speaker="2",
        text="Walk my granddaughter to school. It's half a mile with a hill. And get back to the park "
        "trails on weekends.",
    ),
    TranscriptLine(
        speaker="1",
        text="With a socket that fits and an energy-storing foot, I think you can walk at different "
        "speeds, take the hill, and handle uneven ground. That's a K3 level. Right now you're held back "
        "to about K2 by the fit, not by your strength.",
    ),
    TranscriptLine(
        speaker="1",
        text="Oh, and for the record, we did a six-minute walk test today, and you covered 350 meters.",
    ),
    TranscriptLine(
        speaker="1",
        text="So the plan is a new socket, because your limb has changed, and a dynamic-response foot. "
        "We'll cast you today.",
    ),
    TranscriptLine(speaker="2", text="Sounds good."),
]


def _sentence(text: str, quote: str) -> NoteSentence:
    return NoteSentence(text=text, quote=quote)


SAMPLE_SECTIONS: list[NoteSection] = [
    NoteSection(
        id="subjective",
        title="Subjective",
        sentences=[
            _sentence(
                "Patient walks independently at home and to the mailbox without a cane, limited to about one "
                "block by residual limb pain.",
                "I walk on my own around the house and to the mailbox, no cane.",
            ),
            _sentence(
                "Reports a loose socket, wearing three extra socks to keep it on, with rubbing at the distal shin.",
                "I'm wearing three extra socks just to keep it on",
            ),
            _sentence(
                "Left transtibial amputation in March 2023 after a non-healing diabetic foot infection; "
                "this is his first prosthesis.",
                "they took the leg below the knee in March 2023. This is my first prosthesis.",
            ),
            _sentence(
                "Goals: walk his granddaughter half a mile to school, including a hill, and return to park trails.",
                "Walk my granddaughter to school.",
            ),
        ],
    ),
    NoteSection(
        id="objective",
        title="Objective",
        sentences=[
            _sentence(
                "Residual limb volume has decreased since the current socket was fitted; redness over the distal "
                "tibia, skin intact. Full knee range of motion.",
                "The limb has shrunk since we fitted this socket",
            ),
            _sentence("Diabetes controlled, A1c 7 last month.", "My A1c was seven last month."),
            _sentence(
                "Six-minute walk test today: 350 meters.",
                "we did a six-minute walk test today, and you covered 350 meters.",
            ),
        ],
    ),
    NoteSection(
        id="assessment",
        title="Assessment",
        sentences=[
            _sentence(
                "Currently functioning at about K2, limited by socket fit rather than strength; potential K3 with "
                "a well-fitting socket and an energy-storing foot.",
                "That's a K3 level.",
            ),
        ],
    ),
    NoteSection(
        id="plan",
        title="Plan",
        sentences=[
            _sentence(
                "Replace the socket because of residual limb change, and fit a dynamic-response foot. Cast today.",
                "So the plan is a new socket, because your limb has changed, and a dynamic-response foot.",
            ),
        ],
    ),
]


class SampleServices:
    """Fixed answers, so the screens can be built before the real calls exist.

    A question counts as covered when its sample quote is in the transcript (any case),
    which is the same rule the real check keeps: no quote in the transcript, no green.
    """

    def transcription_key(self) -> TranscriptionKeyResponse:
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        return TranscriptionKeyResponse(api_key="sample-not-a-real-key", expires_at=expires.isoformat())

    def coverage(self, device: Device, transcript: list[TranscriptLine]) -> list[CoverageItem]:
        text = transcript_text(transcript).lower()
        items = []
        for question in device.questions:
            quote = SAMPLE_QUOTES.get(question.id)
            covered = quote is not None and quote.lower() in text
            items.append(CoverageItem(question_id=question.id, covered=covered, quote=quote if covered else None))
        return items

    def note(self, device: Device, transcript: list[TranscriptLine]) -> NoteResponse:
        return NoteResponse(
            device_id=device.id,
            sections=SAMPLE_SECTIONS,
            coverage=self.coverage(device, transcript),
        )
