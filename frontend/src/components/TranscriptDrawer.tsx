import { Box, Button, Drawer, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconMicrophone, IconPlayerStopFilled, IconPlus, IconRefresh } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ADDED_SPEAKER, speakerName as plainName } from "../lib/speakers";
import { startTranscription, type Transcription } from "../lib/transcribe";
import { charted } from "../theme";
import type { TranscriptLine } from "../types";

export { ADDED_SPEAKER };

export interface TranscriptDrawerProps {
  opened: boolean;
  onClose: () => void;
  /** The lines as the clinician has them now, fixes and added lines included. */
  lines: TranscriptLine[];
  onChange: (lines: TranscriptLine[]) => void;
  /** True once a line differs from the words the note was written from. */
  changed: boolean;
  /** False while a note is being written, so a second rewrite can't start. */
  canRewrite: boolean;
  onRewrite: () => void;
  /** "Record more" (msg:99): the lines spoken after the visit, already marked as added. */
  onRecorded: (added: TranscriptLine[]) => void;
  /** Extra class on the drawer root; review uses it to go full width on a phone. */
  className?: string;
}

/**
 * "What was heard" on review (msg:79): the words of the visit, one line per speaker
 * turn, each fixable in place, plus lines the recording missed. Nothing changes in
 * the note until "Rewrite the note" is pressed. It slides over the page, so the
 * review stays one window high.
 */
export function TranscriptDrawer({ opened, onClose, lines, onChange, changed, canRewrite, onRewrite, onRecorded, className }: TranscriptDrawerProps) {
  // "Record more" (msg:99): the mic through the same transcription as the visit.
  const [recording, setRecording] = useState<"off" | "starting" | "live" | "stopping">("off");
  const [heard, setHeard] = useState("");
  const [recordError, setRecordError] = useState<string | null>(null);
  const transcription = useRef<Transcription | null>(null);
  // Stop resolves after a wait, so it calls the newest onRecorded, not the one from when it was pressed.
  const recordedRef = useRef(onRecorded);
  recordedRef.current = onRecorded;

  // Lines spoken after the visit join the list as added lines, and the note is rewritten at once.
  const addRecorded = useCallback(
    (spoken: TranscriptLine[]) => {
      const added = spoken
        .map((line) => ({ speaker: ADDED_SPEAKER, text: line.text.trim() }))
        .filter((line) => line.text !== "");
      if (added.length > 0) recordedRef.current(added);
    },
    [],
  );

  const startRecording = async () => {
    setRecordError(null);
    setHeard("");
    setRecording("starting");
    try {
      const t = await startTranscription({
        onUpdate: ({ lines: done, pending }) => setHeard([...done.map((line) => line.text.trim()), pending].join(" ").trim()),
        onSpeechEnd: () => {},
        onError: () => {
          transcription.current = null;
          setRecording("off");
          setRecordError("Could not start recording. Type the line instead.");
        },
      });
      transcription.current = t;
      setRecording("live");
    } catch {
      setRecording("off");
      setRecordError("Could not start recording. Type the line instead.");
    }
  };

  const stopRecording = async () => {
    const t = transcription.current;
    transcription.current = null;
    if (!t) return setRecording("off");
    setRecording("stopping");
    const spoken = await t.stop();
    setRecording("off");
    setHeard("");
    addRecorded(spoken);
  };

  // Leaving review, or closing the panel, drops a recording still running.
  useEffect(() => () => transcription.current?.cancel(), []);
  useEffect(() => {
    if (opened || !transcription.current) return;
    transcription.current.cancel();
    transcription.current = null;
    setRecording("off");
    setHeard("");
  }, [opened]);

  // Dev only: the browser check drives the Stop path with scripted lines, since a fake mic says no words.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __recordMore?: (spoken: TranscriptLine[]) => void };
    w.__recordMore = addRecorded;
    return () => {
      delete w.__recordMore;
    };
  }, [addRecorded]);

  const listening = recording === "live" || recording === "stopping";

  const setText = (index: number, text: string) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, text } : line)));

  const addLine = () => onChange([...lines, { speaker: ADDED_SPEAKER, text: "" }]);
  // Shown as Clinician / Patient; the lines keep Soniox's labels for the server.
  const speakerName = (speaker: string) => plainName(speaker, lines);

  return (
    <Drawer
      className={className}
      opened={opened}
      onClose={onClose}
      position="right"
      size={600}
      padding={32}
      title={
        <Stack gap={4}>
          <Text component="span" fz={28} fw={700} c={charted.ink} style={{ letterSpacing: "-0.02em" }}>
            What was heard
          </Text>
          <Text component="span" fz={18} c={charted.muted}>
            Fix any words that were heard wrong.
          </Text>
        </Stack>
      }
      closeButtonProps={{ size: "lg", "aria-label": "Close what was heard" }}
      styles={{ body: { paddingBottom: 0 } }}
    >
      <Stack gap={18}>
        {lines.map((line, index) => (
          <Stack key={index} gap={4}>
            <Text fz={16} fw={600} c={line.speaker === ADDED_SPEAKER ? charted.green : charted.muted}>
              {speakerName(line.speaker)}
            </Text>
            <Textarea
              autosize
              minRows={1}
              value={line.text}
              autoFocus={line.speaker === ADDED_SPEAKER && line.text === "" && index === lines.length - 1}
              placeholder={line.speaker === ADDED_SPEAKER ? "Type what was said" : undefined}
              onChange={(event) => setText(index, event.currentTarget.value)}
              aria-label={`${speakerName(line.speaker)}, line ${index + 1}`}
              radius="md"
              styles={{
                input: {
                  fontSize: 19,
                  lineHeight: 1.5,
                  padding: "8px 14px",
                  color: charted.ink,
                  borderColor: line.speaker === ADDED_SPEAKER ? charted.lime : charted.line,
                },
              }}
            />
          </Stack>
        ))}

        <Group gap={12} wrap="wrap">
          <Button
            variant="light"
            size="md"
            fz={18}
            leftSection={<IconPlus size={20} stroke={2.4} />}
            onClick={addLine}
            disabled={recording !== "off"}
          >
            Add a line the recording missed
          </Button>
          <Button
            variant={listening ? "filled" : "light"}
            color={listening ? "red" : undefined}
            size="md"
            fz={18}
            leftSection={listening ? <IconPlayerStopFilled size={18} /> : <IconMicrophone size={20} stroke={2.2} />}
            loading={recording === "starting" || recording === "stopping"}
            onClick={() => void (listening ? stopRecording() : startRecording())}
          >
            {listening ? "Stop" : "Record more"}
          </Button>
        </Group>

        {listening ? (
          <Stack gap={6} aria-live="polite">
            <Group gap={10} wrap="nowrap">
              <span aria-hidden style={{ width: 14, height: 14, borderRadius: "50%", background: "#d93025", flex: "none" }} />
              <Text fz={17} fw={600} c={charted.ink}>
                Listening. Say what to add, then press Stop.
              </Text>
            </Group>
            <Text fz={19} lh={1.5} c={heard ? charted.ink : charted.muted}>
              {heard || "Nothing heard yet."}
            </Text>
          </Stack>
        ) : null}

        {recordError ? (
          <Text fz={17} c={charted.ink} role="alert">
            {recordError}
          </Text>
        ) : null}

        {/* Stays at the bottom of the drawer while the lines scroll. */}
        <Box
          py={20}
          style={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            borderTop: changed ? `1px solid ${charted.line}` : "none",
          }}
        >
          {changed ? (
            <Stack gap={8} align="flex-start">
              <Button
                h={60}
                px={28}
                fz={22}
                fw={600}
                leftSection={<IconRefresh size={24} stroke={2.2} />}
                disabled={!canRewrite}
                onClick={onRewrite}
              >
                Rewrite the note
              </Button>
              <Text fz={17} c={charted.muted}>
                Sections you changed by hand will be written again.
              </Text>
            </Stack>
          ) : null}
        </Box>
      </Stack>
    </Drawer>
  );
}
