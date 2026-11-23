import { Box, Button, Drawer, Stack, Text, Textarea } from "@mantine/core";
import { IconPlus, IconRefresh } from "@tabler/icons-react";

import { charted } from "../theme";
import type { TranscriptLine } from "../types";

/** The speaker label sent to the server for a line the clinician adds after the visit. */
export const ADDED_SPEAKER = "Added after the visit";

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
}

function speakerName(speaker: string): string {
  if (speaker === ADDED_SPEAKER) return ADDED_SPEAKER;
  return speaker ? `Speaker ${speaker}` : "Speaker";
}

/**
 * "What was heard" on review (msg:79): the words of the visit, one line per speaker
 * turn, each fixable in place, plus lines the recording missed. Nothing changes in
 * the note until "Rewrite the note" is pressed. It slides over the page, so the
 * review stays one window high.
 */
export function TranscriptDrawer({ opened, onClose, lines, onChange, changed, canRewrite, onRewrite }: TranscriptDrawerProps) {
  const setText = (index: number, text: string) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, text } : line)));

  const addLine = () => onChange([...lines, { speaker: ADDED_SPEAKER, text: "" }]);

  return (
    <Drawer
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

        <Button
          variant="light"
          size="md"
          fz={18}
          leftSection={<IconPlus size={20} stroke={2.4} />}
          onClick={addLine}
          style={{ alignSelf: "flex-start" }}
        >
          Add a line the recording missed
        </Button>

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
