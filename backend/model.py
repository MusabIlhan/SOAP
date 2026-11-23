"""The two model calls, through the Claude Code command line this laptop is logged into.

There is no API key. Each call runs `claude -p --model sonnet` once, with the prompt on
stdin, and reads the structured answer from its JSON output. A quote the model gives
is kept only if it is found in the transcript word for word (`find_quote`); a note
sentence whose quote isn't found is dropped, so nothing in the note is invented.

`coverage()` and `note()` take the same arguments as the `Services` methods of the
same names, so a live `Services` can call them as they are.
"""

import json
import os
import re
import subprocess
import tempfile

import prompts
from schemas import CoverageItem, Device, NoteResponse, NoteSection, NoteSentence, TranscriptLine
from services import ServiceError, transcript_text

CLAUDE_COMMAND = "claude"
MODEL = "sonnet"
# Seconds to wait for an answer. A check took about 2 s in testing (q4); a full note is
# longer, and a stuck call must end with a plain error rather than hang the screen.
COVERAGE_TIMEOUT_S = 45
NOTE_TIMEOUT_S = 120


def ask_claude(prompt: str, schema: dict, timeout_s: float) -> dict:
    """Run one `claude -p` call and return its structured answer, shaped by `schema`.

    Raises ServiceError with a sentence the screen can show as is.
    """
    command = [
        CLAUDE_COMMAND,
        "-p",
        "--model", MODEL,
        "--output-format", "json",
        "--json-schema", json.dumps(schema),
        "--tools", "",
        "--no-session-persistence",
        "--setting-sources", "",
        "--strict-mcp-config",
    ]  # fmt: skip
    # Never `--bare`: it ignores the logged-in subscription and wants a key (q4).
    # A key that happens to be set must not be used in place of the subscription.
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    try:
        done = subprocess.run(
            command,
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            env=env,
            # Run outside the repo, so no project instructions reach the call.
            cwd=tempfile.gettempdir(),
        )
    except FileNotFoundError:
        raise ServiceError("Couldn't reach Claude: the claude command line isn't installed on this laptop.")
    except subprocess.TimeoutExpired:
        raise ServiceError(f"Couldn't reach Claude: no answer within {timeout_s:g} seconds.")

    result = _result_item(done.stdout)
    if result is None:
        reason = _last_line(done.stderr) or _last_line(done.stdout) or f"it exited with code {done.returncode}"
        raise ServiceError(f"Couldn't reach Claude: {reason}")
    if result.get("is_error") or done.returncode != 0:
        reason = _last_line(str(result.get("result") or "")) or result.get("subtype") or "the call failed"
        raise ServiceError(f"Couldn't reach Claude: {reason}")
    answer = result.get("structured_output")
    if not isinstance(answer, dict):
        raise ServiceError("Couldn't reach Claude: its answer was not in the expected shape.")
    return answer


def _result_item(stdout: str) -> dict | None:
    """The `"type": "result"` item, whether the output is one object or a list of them."""
    try:
        parsed = json.loads(stdout)
    except json.JSONDecodeError:
        return None
    items = parsed if isinstance(parsed, list) else [parsed]
    for item in reversed(items):
        if isinstance(item, dict) and item.get("type") == "result":
            return item
    return None


def _last_line(text: str) -> str:
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    return lines[-1][:300] if lines else ""


_WORD = re.compile(r"\w+")


def _straight(text: str) -> str:
    """Curly quotes to straight ones, one character for one, so positions still match."""
    return text.translate(str.maketrans("‘’“”", "''\"\""))


def find_quote(quote: str, transcript: list[TranscriptLine]) -> str | None:
    """The transcript's own words for `quote`, or None if they aren't in it.

    Word for word means the same words in the same order; case, punctuation and
    spacing between words may differ, since speech-to-text and the model each
    choose those differently.
    """
    words = _WORD.findall(_straight(quote))
    if not words:
        return None
    pattern = r"\b" + r"\W+".join(re.escape(word) for word in words) + r"\b"
    text = transcript_text(transcript)
    match = re.search(pattern, _straight(text), flags=re.IGNORECASE)
    return text[match.start() : match.end()] if match else None


def _coverage_items(device: Device, answered: list[dict], transcript: list[TranscriptLine]) -> list[CoverageItem]:
    """One item per question, in the device's order; green only with a quote found in the transcript."""
    quotes: dict[str, str] = {}
    for item in answered:
        question_id = item.get("question_id")
        if question_id in quotes:
            continue
        found = find_quote(str(item.get("quote", "")), transcript)
        if found:
            quotes[question_id] = found
    return [
        CoverageItem(question_id=q.id, covered=q.id in quotes, quote=quotes.get(q.id)) for q in device.questions
    ]


def _has_words(transcript: list[TranscriptLine]) -> bool:
    return any(line.text.strip() for line in transcript)


def coverage(device: Device, transcript: list[TranscriptLine]) -> list[CoverageItem]:
    """Which of the device's things to cover the visit has covered so far, each with its quote."""
    if not _has_words(transcript):
        return _coverage_items(device, [], transcript)
    answer = ask_claude(
        prompts.coverage_prompt(device, transcript), prompts.coverage_schema(device), COVERAGE_TIMEOUT_S
    )
    return _coverage_items(device, answer.get("answered", []), transcript)


def note(device: Device, transcript: list[TranscriptLine]) -> NoteResponse:
    """The SOAP note, every sentence with the transcript words it came from, and the check run with it.

    One model call writes both, so Stop costs one call (q5).
    """
    if not _has_words(transcript):
        answer: dict = {}
    else:
        answer = ask_claude(prompts.note_prompt(device, transcript), prompts.note_schema(device), NOTE_TIMEOUT_S)
    sections = []
    for section_id, title in prompts.NOTE_SECTIONS:
        sentences = []
        for sentence in answer.get(section_id, []):
            found = find_quote(str(sentence.get("quote", "")), transcript)
            text = str(sentence.get("text", "")).strip()
            if found and text:
                sentences.append(NoteSentence(text=text, quote=found))
        sections.append(NoteSection(id=section_id, title=title, sentences=sentences))
    return NoteResponse(
        device_id=device.id,
        sections=sections,
        coverage=_coverage_items(device, answer.get("answered", []), transcript),
    )
