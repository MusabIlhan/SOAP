import { Alert, Box, Button, Group, Loader, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconPlayerStopFilled } from "@tabler/icons-react";
import { useElementSize } from "@mantine/hooks";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ApiError, checkCoverage, mergeCoverage } from "../api";
import { MicLight } from "../components/MicLight";
import { ThingsToCover } from "../components/ThingsToCover";
import { speakerName } from "../lib/speakers";
import { startTranscription, type Transcription } from "../lib/transcribe";
import { charted } from "../theme";
import phone from "./Phone.module.css";
import type { CoverageItem, RecordingProps, TranscriptLine } from "../types";

/** How many of the latest lines show under the things to cover. */
const LINES_SHOWN = 3;
/** The mic light's largest core; on a shorter window it shrinks so Stop stays in view. */
const MIC_MAX = 168;
const MIC_MIN = 56;
/** The red dot by "Recording": a slow blink, still for reduced motion. */
const REC_KEYFRAMES = `
@keyframes rec-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } }
@media (prefers-reduced-motion: reduce) { [data-rec-anim] { animation: none !important } }
`;

type Phase = "starting" | "live" | "stopping" | "failed";

/**
 * The recording state. The mic light is the main thing on screen (q17); the things
 * to cover sit beside it and turn green as the visit covers them (q14); the words
 * themselves run in a few small, quiet lines. One large Stop button ends the visit.
 */
export function Recording({ device, onStop }: RecordingProps) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [pending, setPending] = useState("");
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [checkError, setCheckError] = useState<string | null>(null);
  /** A check is running: the grey rows say "Checking…". */
  const [checking, setChecking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  /** The live words can be folded away by someone who does not want to see them (q35). */
  const [wordsShown, setWordsShown] = useState(true);

  const transcription = useRef<Transcription | null>(null);
  /** Lines from earlier tries, kept when transcription is started again after an error. */
  const earlier = useRef<TranscriptLine[]>([]);
  const latest = useRef<TranscriptLine[]>([]);
  const coverageRef = useRef<CoverageItem[]>([]);
  const lastChecked = useRef({ length: 0 });
  const inFlight = useRef<Promise<void> | null>(null);
  /** Someone paused while a check was running, so check again when it ends. */
  const checkAgain = useRef(false);
  const live = useRef(false);
  const abort = useRef(new AbortController());

  const begin = useCallback(async () => {
    setPhase("starting");
    setError(null);
    setStream(null);
    try {
      const t = await startTranscription({
        onUpdate: ({ lines: session, pending: heard }) => {
          const all = [...earlier.current, ...session];
          latest.current = all;
          setLines(all);
          setPending(heard);
          // A finished sentence is in the final words: check now, not only at the pause.
          // Only whole sentences, because a green row keeps the first line that covered it.
          if (/[.?!]["”']?\s*$/.test(all.at(-1)?.text ?? "")) checkSoon.current();
        },
        onSpeechEnd: () => checkSoon.current(),
        onError: (message) => {
          earlier.current = latest.current;
          transcription.current = null;
          setStream(null);
          setError(message);
          setPhase("failed");
        },
      });
      if (abort.current.signal.aborted) return t.cancel();
      transcription.current = t;
      setStream(t.stream);
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start recording.");
      setPhase("failed");
    }
  }, []);

  /** One coverage check on the transcript so far; never two at once. */
  const runCheck = useCallback(
    (transcript: TranscriptLine[]): Promise<void> => {
      const run = (async () => {
        lastChecked.current = { length: textLength(transcript) };
        setChecking(true);
        try {
          const answer = await checkCoverage({ device_id: device.id, transcript }, abort.current.signal);
          coverageRef.current = mergeCoverage(coverageRef.current, answer.items);
          setCoverage(coverageRef.current);
          setCheckError(null);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setCheckError(err instanceof ApiError ? err.message : "Couldn't check the things to cover.");
        }
      })();
      inFlight.current = run.finally(() => {
        inFlight.current = null;
        setChecking(false);
      });
      return inFlight.current;
    },
    [device.id],
  );

  // Start on mount; leaving the screen drops the mic and any check in flight.
  useEffect(() => {
    void begin();
    const controller = abort.current;
    return () => {
      controller.abort();
      transcription.current?.cancel();
    };
  }, [begin]);

  /**
   * The live check runs each time a sentence turns final and each time someone pauses,
   * not on a timer (q27): at once if no check is running, else once more right after the
   * running one ends, so the newest words are always checked and two never run at once.
   */
  const checkSoon = useRef(() => {});
  checkSoon.current = () => {
    if (!live.current) return;
    if (inFlight.current) {
      checkAgain.current = true;
      return;
    }
    checkAgain.current = false;
    const transcript = latest.current;
    if (textLength(transcript) <= lastChecked.current.length) return;
    void runCheck(transcript).then(() => {
      if (checkAgain.current) checkSoon.current();
    });
  };

  useEffect(() => {
    live.current = phase === "live";
  }, [phase]);

  // Once a second: count the time.
  useEffect(() => {
    if (phase !== "live") return;
    const tick = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(tick);
  }, [phase]);

  const stop = async () => {
    setPhase("stopping");
    const t = transcription.current;
    transcription.current = null;
    const transcript = t ? [...earlier.current, ...(await t.stop())] : latest.current;
    latest.current = transcript;
    setLines(transcript);
    setPending("");
    setStream(null);
    // Let a check already running finish, then one last check on the whole visit.
    await inFlight.current;
    if (transcript.length > 0) await runCheck(transcript);
    onStop(transcript, coverageRef.current);
  };

  // The screen is exactly one window high (1280x720 up): it starts under the top bar and
  // ends at the window's bottom, the mic light takes the room that is left, and the live
  // words show the newest lines in whatever room is under the things to cover.
  const root = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(94);
  useLayoutEffect(() => {
    if (root.current) setTop(root.current.offsetTop);
  }, []);
  const micSlot = useElementSize();
  const micSize = micSlot.height > 0 ? Math.max(MIC_MIN, Math.min(MIC_MAX, Math.floor(micSlot.height / 2))) : MIC_MAX;

  const stopping = phase === "stopping";
  const shown = lines.slice(-LINES_SHOWN);

  return (
    <Box
      ref={root}
      className={phone.recording}
      px={64}
      pt={12}
      pb={20}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(400px, 1fr) minmax(600px, 700px)",
        gap: 48,
        height: `calc(100vh - ${top}px)`,
        maxWidth: 1320,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <Stack align="center" justify="space-between" gap="md" mih={0}>
        <Stack gap={4} align="center">
          <Text fz={18} fw={600} c={charted.muted}>
            {device.label}
          </Text>
          <Title order={2} fz={44} style={{ letterSpacing: "-0.03em" }}>
            {phase === "starting" ? "Starting…" : stopping ? "Finishing up…" : phase === "failed" ? "Recording paused" : "Listening"}
          </Title>
          <Group gap={10} wrap="nowrap" align="center">
            <style>{REC_KEYFRAMES}</style>
            <Box
              component="span"
              data-rec-anim
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#D9372B",
                visibility: phase === "live" ? "visible" : "hidden",
                animation: phase === "live" ? "rec-blink 1.4s ease-in-out infinite" : "none",
              }}
            />
            <Text fz={22} fw={600} c={phase === "live" ? "#D9372B" : charted.muted} style={{ fontVariantNumeric: "tabular-nums" }}>
              {phase === "live" ? "Recording " : ""}
              {clock(seconds)}
            </Text>
          </Group>
        </Stack>

        <Box ref={micSlot.ref} className={phone.micSlot} style={{ flex: "1 1 0", minHeight: 0, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MicLight stream={stream} size={micSize} />
        </Box>

        {phase === "failed" && error ? (
          <Alert color="red" radius="lg" w={460} maw="100%" title="The recording stopped">
            <Text fz={18}>{error}</Text>
            <Button mt="md" size="lg" variant="white" color="brand" onClick={() => void begin()}>
              Try again
            </Button>
          </Alert>
        ) : null}

        <Button
          onClick={() => void stop()}
          disabled={phase === "starting" || stopping}
          className={phone.stop}
          h={88}
          style={{ flex: "none" }}
          pl={44}
          pr={14}
          styles={{ label: { fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em", gap: 20 } }}
        >
          {stopping ? "Writing the note" : "Stop"}
          <Box
            component="span"
            ml={20}
            style={{ width: 60, height: 60, borderRadius: "50%", background: charted.lime, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            {stopping ? <Loader size={26} color={charted.green} /> : <IconPlayerStopFilled size={26} color={charted.green} />}
          </Box>
        </Button>
      </Stack>

      <Stack gap={12} mih={0}>
        <Box style={{ flex: "none" }}>
          <ThingsToCover questions={device.questions} coverage={coverage} compact checking={checking} />
        </Box>
        {checkError ? (
          <Text fz={16} c={charted.muted} style={{ flex: "none" }}>
            {checkError} The list stays as it is and is checked again at Stop.
          </Text>
        ) : null}
        <UnstyledButton
          onClick={() => setWordsShown((v) => !v)}
          aria-expanded={wordsShown}
          px={8}
          mt={4}
          mb={-6}
          style={{ flex: "none", alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, color: charted.muted }}
        >
          <Text fz={15} fw={600} c={charted.muted} className={phone.small}>
            What the mic hears
          </Text>
          <Text fz={14} fw={500} c="#A3A8A1" ml={6}>
            {wordsShown ? "Hide" : "Show"}
          </Text>
          {wordsShown ? <IconChevronUp size={16} color="#A3A8A1" /> : <IconChevronDown size={16} color="#A3A8A1" />}
        </UnstyledButton>
        <Box
          px={8}
          aria-live="off"
          className={phone.words}
          style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
        >
          {/* Grows to fill the room, so lines sit at the top; when they need more room it overflows upward, so the newest stay in view. */}
          {wordsShown ? (
          <Box style={{ flex: "1 0 auto" }}>
            {shown.length === 0 && !pending ? (
              <Text fz={16} c="#A3A8A1">
                The words will appear here as you talk.
              </Text>
            ) : null}
            {shown.map((line, index) => (
              <Group key={lines.length - shown.length + index} gap={10} wrap="nowrap" align="baseline">
                {line.speaker ? (
                  <Text fz={14} fw={600} c="#A3A8A1" className={phone.small} style={{ flex: "none" }}>
                    {speakerName(line.speaker, lines)}
                  </Text>
                ) : null}
                <Text fz={16} c={charted.muted} lineClamp={2}>
                  {line.text}
                </Text>
              </Group>
            ))}
            {pending ? (
              <Text fz={16} c="#A3A8A1" lineClamp={1}>
                {pending}
              </Text>
            ) : null}
          </Box>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

function textLength(transcript: TranscriptLine[]) {
  return transcript.reduce((sum, line) => sum + line.text.length, 0);
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
