import { Anchor, Box, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconCopy, IconMessage, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { NoteSection, sectionText } from "../components/NoteSection";
import { ThingsToCover } from "../components/ThingsToCover";
import { TranscriptDrawer } from "../components/TranscriptDrawer";
import { ApiError, mergeCoverage, writeNote } from "../api";
import { charted } from "../theme";
import type { NoteResponse, NoteSectionId, ReviewProps, TranscriptLine } from "../types";
import classes from "./Review.module.css";

/** The four sections, shown as "Writing…" until the note arrives. */
const SECTIONS: { id: NoteSectionId; title: string }[] = [
  { id: "subjective", title: "Subjective" },
  { id: "objective", title: "Objective" },
  { id: "assessment", title: "Assessment" },
  { id: "plan", title: "Plan" },
];

/** What is open: a green thing to cover, or one note sentence. One at a time. */
type Selection = { kind: "question"; id: string } | { kind: "sentence"; section: NoteSectionId; index: number } | null;

/**
 * The review state after Stop (q16, beats 5 to 7): the note on the left in four
 * sections, the things to cover on the right. Clicking a green thing or a note
 * sentence opens the words it came from. Each section can be edited in place, and
 * "Copy note" puts the whole note on the clipboard.
 */
export function Review({ device, transcript, coverage, onNewVisit, onCopied }: ReviewProps) {
  const [note, setNote] = useState<NoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [edits, setEdits] = useState<Partial<Record<NoteSectionId, string>>>({});
  const [selection, setSelection] = useState<Selection>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  // "What was heard" (msg:79): the lines as the clinician has fixed them, and the lines
  // the note on screen was written from. They differ until "Rewrite the note" is pressed.
  const [heardOpen, setHeardOpen] = useState(false);
  const [lines, setLines] = useState<TranscriptLine[]>(transcript);
  const [noteLines, setNoteLines] = useState<TranscriptLine[]>(transcript);

  useEffect(() => {
    setLines(transcript);
    setNoteLines(transcript);
  }, [transcript]);

  const usedLines = lines.filter((line) => line.text.trim() !== "");
  const linesChanged = JSON.stringify(usedLines) !== JSON.stringify(noteLines);

  const rewriteNote = () => {
    setNote(null);
    setEdits({});
    setSelection(null);
    setCopied(false);
    setCopyError(null);
    setNoteLines(usedLines);
    setHeardOpen(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    writeNote({ device_id: device.id, transcript: noteLines }, controller.signal)
      .then(setNote)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong while writing the note.");
      });
    return () => controller.abort();
  }, [device.id, noteLines, attempt]);

  // The note's own check can add greens; it never takes one away (q14).
  const shownCoverage = note ? mergeCoverage(coverage, note.coverage) : coverage;

  const sentencesOf = (id: NoteSectionId) => note?.sections.find((s) => s.id === id)?.sentences ?? (note ? [] : null);

  const noteText = () =>
    SECTIONS.map(({ id, title }) => `${title}\n${sectionText(sentencesOf(id), edits[id] ?? null)}`).join("\n\n");

  const copyNote = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(noteText());
      setCopied(true);
      onCopied?.();
    } catch {
      setCopyError("Couldn't copy. Select the note and copy it by hand.");
    }
  };

  const editSection = (id: NoteSectionId, text: string) => {
    setEdits((current) => ({ ...current, [id]: text }));
    setCopied(false);
    setSelection(null);
  };

  const toggle = (next: NonNullable<Selection>) =>
    setSelection((open) => (JSON.stringify(open) === JSON.stringify(next) ? null : next));

  const heading = error ? "The note couldn't be written" : note ? "Your note is ready" : "Writing your note…";
  const subline = copyError
    ? copyError
    : copied
    ? "Copied. Paste it into your records."
    : note
      ? "Check it, change anything you like, then copy it."
      : "This takes a few seconds.";

  return (
    // Fills the screen under the top bar (App makes it a column); the note and the things
    // to cover each scroll on their own, so "Copy note" never leaves the screen.
    <Box
      px={64}
      pt={8}
      pb={32}
      maw={1440}
      mx="auto"
      w="100%"
      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" mb={20} style={{ flex: "none" }}>
        <Stack gap={6}>
          <Title order={2} fz={38} style={{ letterSpacing: "-0.03em" }}>
            {heading}
          </Title>
          <Text fz={22} c={charted.muted} aria-live="polite">
            {subline}
          </Text>
        </Stack>
        <Group gap={28} align="center" wrap="nowrap" style={{ flex: "none" }}>
          <Anchor component="button" type="button" onClick={() => setHeardOpen(true)} fz={19} fw={600} c={charted.green}>
            <Group gap={6} wrap="nowrap">
              <IconMessage size={20} stroke={2.2} />
              {linesChanged ? "What was heard (changed)" : "What was heard"}
            </Group>
          </Anchor>
          <Anchor component="button" type="button" onClick={onNewVisit} fz={19} fw={600} c={charted.green}>
            <Group gap={6} wrap="nowrap">
              <IconArrowLeft size={20} stroke={2.2} />
              Start a new visit
            </Group>
          </Anchor>
          <Button
            onClick={copyNote}
            disabled={!note}
            h={72}
            pl={36}
            pr={10}
            fz={26}
            fw={600}
            color={copied ? "lime" : "brand"}
            bg={copied ? charted.lime : undefined}
            c={copied ? charted.green : "#fff"}
            styles={{ section: { marginInlineStart: 16 } }}
            rightSection={
              <span
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: copied ? charted.green : charted.lime,
                  color: copied ? charted.lime : charted.green,
                }}
              >
                {copied ? <IconCheck size={28} stroke={3} /> : <IconCopy size={26} stroke={2.2} />}
              </span>
            }
          >
            {copied ? "Copied" : "Copy note"}
          </Button>
        </Group>
      </Group>

      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
          gridTemplateRows: "minmax(0, 1fr)",
          gap: 28,
          alignItems: "start",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Card
          shadow="none"
          px={36}
          py={26}
          mah="100%"
          style={{ boxShadow: charted.cardShadow, borderColor: charted.line, overflowY: "auto" }}
        >
          <Text fz={17} fw={600} c={charted.muted} mb={8}>
            Note
          </Text>
          {error ? (
            <Stack gap={20} align="flex-start" py={8}>
              <Text fz={20} c={charted.ink}>
                {error}
              </Text>
              <Button size="lg" variant="light" leftSection={<IconRefresh size={22} />} onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            </Stack>
          ) : (
            <Stack gap={18}>
              {SECTIONS.map(({ id, title }) => (
                <NoteSection
                  key={id}
                  title={title}
                  sentences={sentencesOf(id)}
                  editedText={edits[id] ?? null}
                  onEdit={(text) => editSection(id, text)}
                  selectedIndex={selection?.kind === "sentence" && selection.section === id ? selection.index : null}
                  onSelectSentence={(index) => toggle({ kind: "sentence", section: id, index })}
                  lines={noteLines}
                />
              ))}
            </Stack>
          )}
        </Card>

        <Box className={classes.coverColumn}>
          <ThingsToCover
            questions={device.questions}
            coverage={shownCoverage}
            selectedId={selection?.kind === "question" ? selection.id : null}
            onSelect={(id) => toggle({ kind: "question", id })}
            lines={noteLines}
          />
        </Box>
      </Box>

      <TranscriptDrawer
        opened={heardOpen}
        onClose={() => setHeardOpen(false)}
        lines={lines}
        onChange={setLines}
        changed={linesChanged}
        canRewrite={note !== null || error !== null}
        onRewrite={rewriteNote}
      />
    </Box>
  );
}
