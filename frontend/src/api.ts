/** One typed function per server route. The browser only ever calls /api on its own
 *  origin; Vite passes it on to Flask (vite.config.ts). */

import type {
  CoverageItem,
  CoverageRequest,
  CoverageResponse,
  Device,
  ErrorResponse,
  NoteRequest,
  NoteResponse,
  TranscriptionKeyResponse,
} from "./types";

/** A failed call. `message` is a plain sentence the screen can show as is. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Couldn't reach the server. Is it running?", 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new ApiError(body?.error ?? `The server answered ${res.status}.`, res.status);
  }
  return (await res.json()) as T;
}

function post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return call<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
}

/** GET /api/devices: the three devices, each with its things to cover. */
export async function fetchDevices(): Promise<Device[]> {
  const body = await call<{ devices: Device[] }>("/api/devices");
  return body.devices;
}

/** POST /api/transcription-key: a short-lived Soniox key for this browser. */
export function fetchTranscriptionKey(): Promise<TranscriptionKeyResponse> {
  return post<TranscriptionKeyResponse>("/api/transcription-key");
}

/** POST /api/coverage: which things to cover the transcript so far answers. */
export function checkCoverage(req: CoverageRequest, signal?: AbortSignal): Promise<CoverageResponse> {
  return post<CoverageResponse>("/api/coverage", req, signal);
}

/** POST /api/note: the SOAP note for the whole transcript, with its own coverage check. */
export function writeNote(req: NoteRequest, signal?: AbortSignal): Promise<NoteResponse> {
  return post<NoteResponse>("/api/note", req, signal);
}

/**
 * Fold a new check into the coverage so far. A green never goes back to grey
 * (DECISIONS q14): a covered item is kept as it is; an open one takes the new answer.
 */
export function mergeCoverage(current: CoverageItem[], next: CoverageItem[]): CoverageItem[] {
  const merged = new Map(current.map((item) => [item.question_id, item]));
  for (const item of next) {
    if (!merged.get(item.question_id)?.covered) merged.set(item.question_id, item);
  }
  return [...merged.values()];
}
