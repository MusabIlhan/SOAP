import { Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconCheck, IconPencil } from "@tabler/icons-react";
import { useState, type KeyboardEvent } from "react";

import { charted } from "../theme";
import type { NoteSentence } from "../types";
import classes from "./NoteSection.module.css";

export interface NoteSectionProps {
  /** "Subjective", "Objective", "Assessment" or "Plan". */
  title: string;
  /** The model's sentences, or null while the note is still being written. */
  sentences: NoteSentence[] | null;
  /** The clinician's own text once they have edited this section; null until then. */
  editedText: string | null;
  /** Called on every keystroke while editing, so "Copy note" always copies what is on screen. */
  onEdit: (text: string) => void;
  /** The sentence whose source words are open, if it is in this section. */
  selectedIndex: number | null;
  onSelectSentence: (index: number) => void;
}

/** The section as plain text: the clinician's edit if there is one, else the model's sentences. */
export function sectionText(sentences: NoteSentence[] | null, editedText: string | null): string {
  if (editedText !== null) return editedText;
  return (sentences ?? []).map((s) => s.text).join(" ");
}

/**
 * One SOAP section of the note. Each sentence can be clicked to show the words it
 * came from; "Edit" turns the section into a text box in place, and "Done" closes it.
 * Once edited, the section is the clinician's own text and its sentences are no
 * longer linked to the transcript.
 */
export function NoteSection({
  title,
  sentences,
  editedText,
  onEdit,
  selectedIndex,
  onSelectSentence,
}: NoteSectionProps) {
  const [editing, setEditing] = useState(false);
  const writing = sentences === null;
  const empty = !writing && editedText === null && sentences.length === 0;

  const startEditing = () => {
    // Seed the box with exactly what is on screen, so the first keystroke changes nothing else.
    onEdit(sectionText(sentences, editedText));
    setEditing(true);
  };

  const onSentenceKey = (event: KeyboardEvent, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectSentence(index);
    }
  };

  return (
    <Stack gap={14}>
      <Group justify="space-between" align="center" wrap="nowrap" mih={44}>
        <Text component="h3" fz={24} fw={700} c={charted.ink} lh={1.3} m={0}>
          {title}
        </Text>
        {!writing &&
          (editing ? (
            <Button
              size="md"
              variant="filled"
              leftSection={<IconCheck size={20} stroke={2.5} />}
              onClick={() => setEditing(false)}
            >
              Done
            </Button>
          ) : (
            <Button
              size="md"
              variant="subtle"
              color="brand"
              leftSection={<IconPencil size={20} />}
              onClick={startEditing}
              aria-label={`Edit ${title}`}
            >
              Edit
            </Button>
          ))}
      </Group>

      {writing ? (
        <Text fz={20} c="#A3A8A0" className={classes.writing}>
          Writing…
        </Text>
      ) : editing ? (
        <Textarea
          autosize
          minRows={2}
          autoFocus
          value={editedText ?? ""}
          onChange={(event) => onEdit(event.currentTarget.value)}
          onFocus={(event) => {
            // Caret at the end, not the start, so a typed word never lands in front of the section.
            const end = event.currentTarget.value.length;
            event.currentTarget.setSelectionRange(end, end);
          }}
          aria-label={`${title} text`}
          radius="md"
          // Pull the box out by its padding and border, so the words stay exactly where they were.
          style={{ margin: "-12px -18px" }}
          styles={{
            input: {
              fontSize: 20,
              lineHeight: 1.6,
              padding: "10px 16px",
              color: charted.ink,
              borderColor: charted.lime,
              borderWidth: 2,
            },
          }}
        />
      ) : empty ? (
        <Text fz={20} c="#A3A8A0">
          Not discussed in the visit
        </Text>
      ) : editedText !== null ? (
        <Text fz={20} lh={1.6} c={charted.ink} style={{ whiteSpace: "pre-wrap" }}>
          {editedText}
        </Text>
      ) : (
        <Text fz={20} lh={1.6} c={charted.ink}>
          {sentences.map((sentence, index) => (
            <span key={index}>
              <span
                role="button"
                tabIndex={0}
                aria-pressed={selectedIndex === index}
                title="Show the words this came from"
                className={`${classes.sentence} ${selectedIndex === index ? classes.selected : ""}`}
                onClick={() => onSelectSentence(index)}
                onKeyDown={(event) => onSentenceKey(event, index)}
              >
                {sentence.text}
              </span>
              {index < sentences.length - 1 ? " " : null}
            </span>
          ))}
        </Text>
      )}

      {!editing && editedText === null && selectedIndex !== null && sentences?.[selectedIndex] ? (
        <Source text={sentences[selectedIndex].quote} />
      ) : null}
    </Stack>
  );
}

/** The words from the visit a sentence came from, in the same box as an open thing to cover. */
function Source({ text }: { text: string }) {
  return (
    <Text
      fz={20}
      lh={1.45}
      c={charted.ink}
      mt={6}
      px={20}
      py={14}
      style={{ background: charted.mist, borderRadius: 16, borderLeft: `4px solid ${charted.lime}` }}
    >
      <Text component="span" display="block" fz={16} fw={600} c={charted.muted} mb={4}>
        Said in the visit
      </Text>
      “{text}”
    </Text>
  );
}
