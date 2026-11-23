# Everi: a visit becomes a SOAP note

A clinician records a prosthetics or orthotics visit on a laptop. The words are
transcribed live, the things a Medicare reviewer looks for turn green as the visit
covers them, and after Stop the SOAP note is there, each line traceable to what was said.

- **frontend/**: React, TypeScript and Mantine, on Vite.
- **backend/**: Flask, with every request and answer typed by Pydantic models
  (`backend/schemas.py`, mirrored in `frontend/src/types.ts`).
- Transcription is Soniox, streamed from the browser with a short-lived key the server hands out.
- The note is written by Claude Sonnet through the Claude Code command line this laptop
  is logged into. There is no API key.

## Run it

Once: copy `.env.example` to `.env` and set `SONIOX_API_KEY`.

```bash
# Server, on http://127.0.0.1:5001
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python app.py

# App, on http://localhost:5173 (passes /api on to the server)
cd frontend && npm install && npm run dev
```

After the first time, `cd backend && .venv/bin/python app.py` and `cd frontend && npm run dev` are enough.

## Check it

```bash
cd backend && .venv/bin/python -m pytest tests/test_contract.py   # each route against its model
cd frontend && npx tsc --noEmit && npm run build                    # types and a production build
```

## Where things are

| File | What it holds |
|----|----|
| `backend/schemas.py` | The request and answer models for every route |
| `backend/devices.py` | The three devices and their things to cover (from `GUIDING-QUESTIONS.md`) |
| `backend/services.py` | What the routes call; `SampleServices` gives fixed answers |
| `backend/app.py` | The four routes: `GET /api/devices`, `POST /api/transcription-key`, `POST /api/coverage`, `POST /api/note` |
| `frontend/src/types.ts` | The same models in TypeScript, and the props the screens share |
| `frontend/src/api.ts` | One typed function per route |
| `frontend/src/theme.ts` | The look: Manrope, green #285337, lime #B4E33F, pill buttons, large type |
