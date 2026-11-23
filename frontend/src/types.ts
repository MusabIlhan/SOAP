/**
 * The shapes the server speaks, mirrored by hand from backend/schemas.py
 * (change both together; backend/tests/test_contract.py checks the server side),
 * and the props the screens share.
 */

// ── Server shapes (backend/schemas.py) ─────────────────────────────────

export type DeviceId = "leg" | "afo" | "ko";
export type NoteSectionId = "subjective" | "objective" | "assessment" | "plan";

/** One thing to cover in the visit, from GUIDING-QUESTIONS.md. */
export interface GuidingQuestion {
  id: string;
  /** Short name on screen, e.g. "Walking test". */
  label: string;
  /** The full question shown to the clinician. */
  question: string;
  /** What a Medicare reviewer looks for. */
  reviewer_need: string;
}

export interface Device {
  id: DeviceId;
  label: string;
  questions: GuidingQuestion[];
}

export interface DevicesResponse {
  devices: Device[];
}

/** A short-lived Soniox key the browser uses to stream audio itself. */
export interface TranscriptionKeyResponse {
  api_key: string;
  /** ISO 8601 time the key stops working. */
  expires_at: string;
}

/** One stretch of final words from one speaker, in the order spoken. */
export interface TranscriptLine {
  /** Soniox speaker label ("1", "2"), or "" if unknown. */
  speaker: string;
  text: string;
}

export interface CoverageRequest {
  device_id: DeviceId;
  transcript: TranscriptLine[];
}

/** Whether the visit covered one question. `covered` only ever comes with a quote
 *  that is in the transcript word for word. */
export interface CoverageItem {
  question_id: string;
  covered: boolean;
  quote: string | null;
}

export interface CoverageResponse {
  device_id: DeviceId;
  /** One item per question, in the device's order. */
  items: CoverageItem[];
}

export interface NoteRequest {
  device_id: DeviceId;
  transcript: TranscriptLine[];
}

export interface NoteSentence {
  text: string;
  /** The transcript words this sentence came from, word for word. */
  quote: string;
}

export interface NoteSection {
  id: NoteSectionId;
  title: string;
  sentences: NoteSentence[];
}

export interface NoteResponse {
  device_id: DeviceId;
  /** Subjective, Objective, Assessment, Plan, in that order. */
  sections: NoteSection[];
  /** The check run with the note. It can add greens; never take one away (see mergeCoverage). */
  coverage: CoverageItem[];
}

/** Every non-2xx answer. `error` is a plain sentence the screen can show as is. */
export interface ErrorResponse {
  error: string;
}

// ── Props the screens share ───────────────────────────────────────────

/** The list of things to cover, on every state: grey until covered, then green. */
export interface ThingsToCoverProps {
  questions: GuidingQuestion[];
  /** Coverage so far. A question missing from it is not covered yet. */
  coverage: CoverageItem[];
  /** The question whose quote is open (review state only). */
  selectedId?: string | null;
  /** Given only where a green question can be clicked to show its quote (review state). */
  onSelect?: (questionId: string) => void;
}

/** The recording state. It gets its own Soniox key, streams the words, runs the
 *  live check, and hands over everything when the clinician presses Stop. */
export interface RecordingProps {
  device: Device;
  onStop: (transcript: TranscriptLine[], coverage: CoverageItem[]) => void;
}

/** The review state after Stop. It asks for the note itself, shows it beside the
 *  things to cover, and ends with "Copy note". */
export interface ReviewProps {
  device: Device;
  transcript: TranscriptLine[];
  /** Coverage from the live check at Stop; the note's own check is merged into it. */
  coverage: CoverageItem[];
  /** Back to the start state for the next visit. */
  onNewVisit: () => void;
}
