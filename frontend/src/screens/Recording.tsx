import { Alert, Box, Button, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconPlayerStopFilled } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, checkCoverage, mergeCoverage } from "../api";
import { MicLight } from "../components/MicLight";
import { ThingsToCover } from "../components/ThingsToCover";
import { startTranscription, type Transcription } from "../lib/transcribe";
import { charted } from "../theme";
import type { CoverageItem, RecordingProps, TranscriptLine } from "../types";

/** How many of the latest lines show under the things to cover. */
const LINES_SHOWN = 3;

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
  const [seconds, setSeconds] = useState(0);

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
   * The live check runs each time someone pauses after speaking, not on a timer (q27):
   * at once if no check is running, else once more right after the running one ends.
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

  const stopping = phase === "stopping";
  const shown = lines.slice(-LINES_SHOWN);

  return (
    <Box px={64} pt={32} pb={48} style={{ display: "grid", gridTemplateColumns: "minmax(420px, 1fr) minmax(560px, 660px)", gap: 56, alignItems: "start", maxWidth: 1320, margin: "0 auto" }}>
      <Stack align="center" gap="lg" pt={8}>
        <Stack gap={4} align="center">
          <Text fz={18} fw={600} c={charted.muted}>
            {device.label}
          </Text>
          <Title order={2} fz={44} style={{ letterSpacing: "-0.03em" }}>
            {phase === "starting" ? "Starting…" : stopping ? "Finishing up…" : phase === "failed" ? "Recording paused" : "Listening"}
          </Title>
          <Text fz={22} fw={500} c={charted.muted} style={{ fontVariantNumeric: "tabular-nums" }}>
            {clock(seconds)}
          </Text>
        </Stack>

        <MicLight stream={stream} />

        {phase === "failed" && error ? (
          <Alert color="red" radius="lg" w={460} title="The recording stopped">
            <Text fz={18}>{error}</Text>
            <Button mt="md" size="lg" variant="white" color="brand" onClick={() => void begin()}>
              Try again
            </Button>
          </Alert>
        ) : null}

        <Button
          onClick={() => void stop()}
          disabled={phase === "starting" || stopping}
          h={88}
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

      <Stack gap="lg">
        <ThingsToCover questions={device.questions} coverage={coverage} />
        {checkError ? (
          <Text fz={16} c={charted.muted}>
            {checkError} The list stays as it is and is checked again at Stop.
          </Text>
        ) : null}
        <Box px={8} aria-live="off">
          <Text fz={15} fw={600} c={charted.muted} mb={6}>
            What the mic hears
          </Text>
          {shown.length === 0 && !pending ? (
            <Text fz={16} c="#A3A8A1">
              The words will appear here as you talk.
            </Text>
          ) : null}
          {shown.map((line, index) => (
            <Group key={lines.length - shown.length + index} gap={10} wrap="nowrap" align="baseline">
              {line.speaker ? (
                <Text fz={14} fw={600} c="#A3A8A1" style={{ flex: "none" }}>
                  Speaker {line.speaker}
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
