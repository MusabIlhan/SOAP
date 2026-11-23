"""A short-lived Soniox key for the browser, so the real key never leaves the server.

The browser streams the microphone to Soniox itself with the key this returns.
`SONIOX_API_KEY` is read from `.env` (app.py loads it at start).
"""

import os

import requests

from schemas import TranscriptionKeyResponse
from services import ServiceError

TEMPORARY_KEY_URL = "https://api.soniox.com/v1/auth/temporary-api-key"
# One hour, as the sample key does: longer than any visit, short enough to be harmless.
KEY_LIFETIME_S = 3600
REQUEST_TIMEOUT_S = 10


def temporary_key() -> TranscriptionKeyResponse:
    """Ask Soniox for a key that can open one live transcription stream for an hour.

    Raises ServiceError with a sentence the screen can show as is.
    """
    api_key = os.environ.get("SONIOX_API_KEY", "").strip()
    if not api_key:
        raise ServiceError("Couldn't start transcription: SONIOX_API_KEY is not set in .env.")
    try:
        response = requests.post(
            TEMPORARY_KEY_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"usage_type": "transcribe_websocket", "expires_in_seconds": KEY_LIFETIME_S},
            timeout=REQUEST_TIMEOUT_S,
        )
    except requests.RequestException:
        raise ServiceError("Couldn't start transcription: Soniox can't be reached. Check the internet connection.")
    if response.status_code in (401, 403):
        raise ServiceError("Couldn't start transcription: Soniox refused the key in .env.")
    if not response.ok:
        raise ServiceError(f"Couldn't start transcription: Soniox answered {response.status_code}.")
    body = response.json()
    return TranscriptionKeyResponse(api_key=body["api_key"], expires_at=body["expires_at"])
