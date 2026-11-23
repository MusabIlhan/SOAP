import type { TranscriptLine } from "../types";

/** The speaker label sent to the server for a line the clinician adds after the visit. */
export const ADDED_SPEAKER = "Added after the visit";

/**
 * Plain names for Soniox's speaker labels (msg:87). The clinician opens the visit
 * (DEMO-SCRIPT.md), so the first voice heard is "Clinician", the next "Patient", any
 * other "Other". Only the screen uses these; the server still gets the raw labels.
 */
export function speakerName(speaker: string, lines: TranscriptLine[]): string {
  if (speaker === ADDED_SPEAKER) return ADDED_SPEAKER;
  if (!speaker) return "Speaker";
  const order: string[] = [];
  for (const line of lines) {
    if (line.speaker && line.speaker !== ADDED_SPEAKER && !order.includes(line.speaker)) order.push(line.speaker);
  }
  const place = order.indexOf(speaker);
  return place === 0 ? "Clinician" : place === 1 ? "Patient" : "Other";
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Who said a quote: "Clinician", "Patient" or "Other", or null when the quote isn't
 * found, spans two speakers, or comes from a line added after the visit.
 */
export function quoteSpeaker(quote: string, lines: TranscriptLine[]): string | null {
  const wanted = normalise(quote);
  if (!wanted) return null;
  // All lines as one normalised text, remembering where each line starts and ends.
  let joined = "";
  const spans: { start: number; end: number; speaker: string }[] = [];
  for (const line of lines) {
    const text = normalise(line.text);
    if (!text) continue;
    if (joined) joined += " ";
    spans.push({ start: joined.length, end: joined.length + text.length, speaker: line.speaker });
    joined += text;
  }
  const at = joined.indexOf(wanted);
  if (at < 0) return null;
  const end = at + wanted.length;
  const speakers = new Set(spans.filter((s) => s.start < end && s.end > at).map((s) => s.speaker));
  if (speakers.size !== 1) return null;
  const [speaker] = speakers;
  if (!speaker || speaker === ADDED_SPEAKER) return null;
  return speakerName(speaker, lines);
}
