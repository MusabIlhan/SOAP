import { Box, Card, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { CSSProperties } from "react";

import { charted } from "../theme";
import type { CoverageItem, GuidingQuestion, ThingsToCoverProps } from "../types";

/**
 * The things to cover, on every state of the screen (start, recording, review).
 * A question is grey with "Not discussed yet" until the visit covers it, then green.
 * Where `onSelect` is given (review), a green question is a button that opens the
 * patient's own words. Without it (recording), a green question shows its line
 * at once, on one quiet line, so nobody has to touch the laptop.
 */
export function ThingsToCover({ questions, coverage, selectedId, onSelect }: ThingsToCoverProps) {
  const byId = new Map(coverage.map((item) => [item.question_id, item]));

  return (
    <Card shadow="none" px={36} py={24} style={{ boxShadow: charted.cardShadow, borderColor: charted.line }}>
      <Text fz={17} fw={600} c={charted.muted} mb={4}>
        Things to cover
      </Text>
      {questions.map((question, index) => (
        <Row
          key={question.id}
          question={question}
          item={byId.get(question.id)}
          last={index === questions.length - 1}
          open={selectedId === question.id}
          onSelect={onSelect}
        />
      ))}
    </Card>
  );
}

interface RowProps {
  question: GuidingQuestion;
  item: CoverageItem | undefined;
  last: boolean;
  open: boolean;
  onSelect?: (questionId: string) => void;
}

function Row({ question, item, last, open, onSelect }: RowProps) {
  const covered = Boolean(item?.covered && item.quote);
  const clickable = covered && onSelect !== undefined;
  // Recording passes no onSelect: the line shows at once. Review shows it on click.
  const showQuote = covered && (onSelect === undefined || open);

  const body = (
    <Box style={{ display: "flex", alignItems: "flex-start", gap: 16, width: "100%" }}>
      <Dot covered={covered} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text fz={22} fw={600} lh={1.3} c={covered ? charted.ink : charted.muted}>
          {question.label}
        </Text>
        <Text fz={17} lh={1.4} c={charted.muted} mt={2}>
          {question.question}
        </Text>
      </Box>
      <Status covered={covered} clickable={clickable} open={open} />
    </Box>
  );

  return (
    <Box style={{ borderBottom: last ? "none" : "1px solid #F0F0F0", padding: "14px 0" }}>
      {clickable ? (
        <UnstyledButton
          onClick={() => onSelect?.(question.id)}
          aria-expanded={open}
          style={{ width: "100%", borderRadius: 12 }}
        >
          {body}
        </UnstyledButton>
      ) : (
        body
      )}
      {showQuote && item?.quote ? <Quote text={item.quote} full={open} /> : null}
    </Box>
  );
}

/** The round mark: an empty ring, or green with a lime tick (mocks/base.css .dot). */
function Dot({ covered }: { covered: boolean }) {
  const ring: CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    flex: "none",
    marginTop: 1,
    position: "relative",
    border: `2px solid ${covered ? charted.green : "#CFD5C8"}`,
    background: covered ? charted.green : "transparent",
    transition: "background 300ms ease, border-color 300ms ease",
  };
  const tick: CSSProperties = {
    position: "absolute",
    left: 9,
    top: 4,
    width: 7,
    height: 14,
    border: `solid ${charted.lime}`,
    borderWidth: "0 3px 3px 0",
    transform: "rotate(45deg)",
  };
  return (
    <span style={ring} aria-hidden>
      {covered ? <span style={tick} /> : null}
    </span>
  );
}

function Status({ covered, clickable, open }: { covered: boolean; clickable: boolean; open: boolean }) {
  if (!covered) {
    return (
      <Text fz={16} fw={500} c="#9AA096" style={{ flex: "none", marginTop: 3 }}>
        Not discussed yet
      </Text>
    );
  }
  if (!clickable) return null;
  const Chevron = open ? IconChevronDown : IconChevronRight;
  return (
    <Box style={{ display: "flex", alignItems: "center", gap: 4, flex: "none", marginTop: 3, color: charted.green }}>
      <Text fz={16} fw={600} c={charted.green}>
        {open ? "Hide words" : "What was said"}
      </Text>
      <Chevron size={20} stroke={2.2} />
    </Box>
  );
}

/** The line from the visit that covered the question, word for word. */
function Quote({ text, full }: { text: string; full: boolean }) {
  return (
    <Text
      fz={full ? 20 : 17}
      lh={1.45}
      c={full ? charted.ink : charted.muted}
      lineClamp={full ? undefined : 1}
      mt={10}
      ml={46}
      px={full ? 20 : 0}
      py={full ? 14 : 0}
      style={full ? { background: charted.mist, borderRadius: 16, borderLeft: `4px solid ${charted.lime}` } : undefined}
    >
      “{text}”
    </Text>
  );
}
