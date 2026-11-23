/**
 * Live transcription: the laptop mic streamed to Soniox from the browser.
 *
 * The server hands out a short-lived Soniox key (POST /api/transcription-key), so the
 * real key never reaches the browser. The same mic stream also feeds the mic light,
 * so the light and the words always hear the same thing.
 *
 * Soniox docs read 23 Nov 2026: real-time model `stt-rt-v6`; tokens arrive non-final
 * first and are final once `is_final` is true (never repeated after that); with
 * diarization on, each token carries a `speaker` label ("1", "2", ...). With endpoint
 * detection on, a final `<end>` token arrives when a speaker pauses after speaking.
 */

import { SonioxClient, type ErrorStatus, type Token } from "@soniox/speech-to-text-web";

import { fetchTranscriptionKey } from "../api";
import type { TranscriptLine } from "../types";

const MODEL = "stt-rt-v6";

/** Words a prosthetics visit uses that a general model may not expect. */
const VISIT_TERMS = [
  "prosthesis",
  "prosthetist",
  "socket",
  "liner",
  "residual limb",
  "below-knee",
  "transtibial",
  "tibia",
  "K-level",
  "K3",
  "ankle-foot orthosis",
  "AFO",
  "knee orthosis",
  "six-minute walk test",
];

/** How long Stop waits for Soniox's last words before giving up on them. */
const STOP_WAIT_MS = 6000;

export interface TranscriptUpdate {
  /** Final words so far, one line per stretch of one speaker. These never change. */
  lines: TranscriptLine[];
  /** Words still being heard; they may change before they become final. */
  pending: string;
}

export interface TranscribeCallbacks {
  onUpdate: (update: TranscriptUpdate) => void;
  /** Someone paused after speaking: Soniox sent its end-of-speech mark (q27). Called after onUpdate. */
  onSpeechEnd: () => void;
  /** A plain sentence the screen can show as is. Transcription has stopped. */
  onError: (message: string) => void;
}

export interface Transcription {
  /** The mic stream, for the mic light. */
  stream: MediaStream;
  /** Ends the stream, waits for the last final words, and returns the whole transcript. */
  stop: () => Promise<TranscriptLine[]>;
  /** Ends at once, dropping words not yet final (leaving the screen). */
  cancel: () => void;
}

/** Ask for the mic, then start streaming it to Soniox. */
export async function startTranscription(callbacks: TranscribeCallbacks): Promise<Transcription> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch {
    throw new Error("The browser couldn't use the microphone. Allow it in the address bar, then try again.");
  }

  const lines: TranscriptLine[] = [];
  let pending = "";
  let failed = false;
  let finished: (() => void) | null = null;

  const client = new SonioxClient({
    apiKey: async () => (await fetchTranscriptionKey()).api_key,
    keepAlive: true,
    onPartialResult: (result) => {
      pending = "";
      let ended = false;
      for (const token of result.tokens) {
        if (isMarker(token)) {
          if (token.text === "<end>") ended = true;
          continue;
        }
        if (token.is_final) addFinal(lines, token);
        else pending += token.text;
      }
      callbacks.onUpdate({ lines: lines.map((line) => ({ ...line })), pending: pending.trim() });
      if (ended) callbacks.onSpeechEnd();
    },
    onFinished: () => finished?.(),
    onError: (status, message) => {
      failed = true;
      stopTracks(stream);
      finished?.();
      callbacks.onError(plainError(status, message));
    },
  });

  await client.start({
    model: MODEL,
    stream,
    audioFormat: "auto",
    languageHints: ["en"],
    enableSpeakerDiarization: true,
    enableEndpointDetection: true,
    context: {
      general: [
        { key: "domain", value: "Healthcare" },
        { key: "topic", value: "Prosthetics and orthotics clinic visit" },
      ],
      terms: VISIT_TERMS,
    },
  });

  return {
    stream,
    stop: () =>
      new Promise<TranscriptLine[]>((resolve) => {
        const done = () => {
          window.clearTimeout(timer);
          stopTracks(stream);
          resolve(lines.map((line) => ({ ...line })));
        };
        const timer = window.setTimeout(() => {
          client.cancel();
          done();
        }, STOP_WAIT_MS);
        if (failed) return done();
        finished = done;
        client.stop();
      }),
    cancel: () => {
      client.cancel();
      stopTracks(stream);
    },
  };
}

/** Append one final token: to the last line if the same person is speaking, else as a new line. */
function addFinal(lines: TranscriptLine[], token: Token) {
  const speaker = token.speaker ?? "";
  const last = lines.at(-1);
  if (last && last.speaker === speaker) {
    last.text += token.text;
  } else {
    const text = token.text.trimStart();
    if (text) lines.push({ speaker, text });
  }
}

/** Soniox's control tokens, such as "<end>" and "<fin>", are not words. */
function isMarker(token: Token) {
  return /^<\w+>$/.test(token.text);
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

function plainError(status: ErrorStatus, message: string): string {
  switch (status) {
    case "get_user_media_failed":
      return "The browser couldn't use the microphone. Allow it in the address bar, then try again.";
    case "api_key_fetch_failed":
      return "Couldn't get a transcription key from the server. Is it running, with SONIOX_API_KEY set?";
    case "api_error":
      return `The transcription service refused: ${message}`;
    case "websocket_error":
      return "Lost the connection to the transcription service. Check the network, then try again.";
    default:
      return `Transcription stopped: ${message}`;
  }
}
