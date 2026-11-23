"""The Flask server: four JSON routes under /api, typed by the models in schemas.py.

Run it with `python app.py` (port 5001; macOS keeps 5000 for AirPlay).
"""

from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request
from pydantic import BaseModel, ValidationError

from devices import DEVICES, get_device
from schemas import (
    CoverageRequest,
    CoverageResponse,
    DevicesResponse,
    ErrorResponse,
    NoteRequest,
)
from services import SampleServices, ServiceError, Services

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

PORT = 5001


def _json(model: BaseModel, status: int = 200) -> tuple[Response, int]:
    return jsonify(model.model_dump(mode="json")), status


def _error(message: str, status: int) -> tuple[Response, int]:
    return _json(ErrorResponse(error=message), status)


def create_app(services: Services | None = None) -> Flask:
    app = Flask(__name__)
    svc: Services = services or SampleServices()

    @app.errorhandler(ValidationError)
    def bad_request(err: ValidationError):
        first = err.errors()[0]
        where = ".".join(str(part) for part in first["loc"]) or "body"
        return _error(f"The request was not understood ({where}: {first['msg']}).", 400)

    @app.errorhandler(ServiceError)
    def service_failed(err: ServiceError):
        return _error(str(err), 502)

    @app.get("/api/devices")
    def devices():
        return _json(DevicesResponse(devices=DEVICES))

    @app.post("/api/transcription-key")
    def transcription_key():
        return _json(svc.transcription_key())

    @app.post("/api/coverage")
    def coverage():
        body = CoverageRequest.model_validate(request.get_json(silent=True) or {})
        device = get_device(body.device_id)
        items = svc.coverage(device, body.transcript)
        return _json(CoverageResponse(device_id=device.id, items=items))

    @app.post("/api/note")
    def note():
        body = NoteRequest.model_validate(request.get_json(silent=True) or {})
        return _json(svc.note(get_device(body.device_id), body.transcript))

    return app


if __name__ == "__main__":
    # threaded: a slow note call must not hold up the key or the live check.
    create_app().run(port=PORT, debug=True, threaded=True)
