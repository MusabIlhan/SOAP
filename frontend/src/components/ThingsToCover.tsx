import { Box, Card, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { CSSProperties } from "react";

import { quoteSpeaker } from "../lib/speakers";
import { charted } from "../theme";
import type { CoverageItem, GuidingQuestion, ThingsToCoverProps, TranscriptLine } from "../types";

/**
 * The things to cover, on every state of the screen (start, recording, review).
 * A question is grey with "Not discussed yet" until the visit covers it, then green.
 * Where `onSelect` is given (review), a green question is a button that opens the
 * patient's own words. Without it (recording), a green question shows its line
 * at once, on one quiet line, so nobody has to touch the laptop.
 */
/**
 * `listMaxHeight` (start only): the rows scroll inside the card past this height, so
 * the page is the same height whichever type is picked and nothing on it jumps.
 * `compact` (recording only): tighter rows, with the covering line on the name's own
 * line, so all seven rows fit one laptop screen and a row keeps its height as it turns green.
 * `checking` (recording only, with `compact`): a check is running, so the grey rows say
 * "Checking…" in the place of "Not discussed yet", in a slot as wide as the wider of the two.
 */
export function ThingsToCover({
  questions,
  coverage,
  selectedId,
  onSelect,
  listMaxHeight,
  compact = false,
  checking = false,
  lines,
}: ThingsToCoverProps & { listMaxHeight?: string; compact?: boolean; checking?: boolean; lines?: TranscriptLine[] }) {
  const byId = new Map(coverage.map((item) => [item.question_id, item]));

  return (
    <Card
      shadow="none"
      px={compact ? 28 : 36}
      py={compact ? 12 : 24}
      style={{ boxShadow: charted.cardShadow, borderColor: charted.line }}
    >
      {compact ? <style>{LIVE_KEYFRAMES}</style> : null}
      <Text fz={17} fw={600} c={charted.muted} mb={4}>
        Things to cover
      </Text>
      <Box style={listMaxHeight ? { maxHeight: listMaxHeight, overflowY: "auto", overscrollBehavior: "contain" } : undefined}>
        {questions.map((question, index) => (
          <Row
            key={question.id}
            question={question}
            item={byId.get(question.id)}
            last={index === questions.length - 1}
            open={selectedId === question.id}
            onSelect={onSelect}
            compact={compact}
            checking={checking}
            lines={lines}
          />
        ))}
      </Box>
    </Card>
  );
}

/** Recording only: the soft breathing of "Checking…", and the covering line fading in. */
const LIVE_KEYFRAMES = `
@keyframes ttc-breathe { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
@keyframes ttc-fade-in { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { [data-ttc-anim] { animation: none !important } }
`;

interface RowProps {
  question: GuidingQuestion;
  item: CoverageItem | undefined;
  last: boolean;
  open: boolean;
  onSelect?: (questionId: string) => void;
  compact: boolean;
  checking: boolean;
  /** Review only: the visit's lines, so the open quote can say who said it. */
  lines?: TranscriptLine[];
}

function Row({ question, item, last, open, onSelect, compact, checking, lines }: RowProps) {
  const covered = Boolean(item?.covered && item.quote);
  const clickable = covered && onSelect !== undefined;
  // Recording passes no onSelect: the line shows at once. Review shows it on click.
  const showQuote = covered && (onSelect === undefined || open);

  if (compact) {
    // Recording: name, then "Not discussed yet" or the covering line, on one line; the question under it.
    return (
      <Box data-row style={{ borderBottom: last ? "none" : "1px solid #F0F0F0", padding: "6px 0" }}>
        <Box style={{ display: "flex", alignItems: "flex-start", gap: 14, width: "100%" }}>
          <Dot covered={covered} />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Box style={{ display: "flex", alignItems: "baseline", gap: 14, minWidth: 0 }}>
              <Text
                fz={21}
                fw={600}
                lh={1.3}
                c={covered ? charted.ink : charted.muted}
                style={{ flex: "none", transition: "color 300ms ease" }}
              >
                {question.label}
              </Text>
              {showQuote && item?.quote ? (
                <Text
                  data-ttc-anim
                  fz={17}
                  lh={1.3}
                  c={charted.muted}
                  lineClamp={1}
                  style={{ flex: 1, minWidth: 0, animation: "ttc-fade-in 300ms ease both" }}
                >
                  “{item.quote}”
                </Text>
              ) : (
                <Box style={{ flex: 1 }} />
              )}
              {covered ? null : <LiveStatus checking={checking} />}
            </Box>
            <Text fz={16} lh={1.35} c={charted.muted} mt={1}>
              {question.question}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

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
      {showQuote && item?.quote ? <Quote text={item.quote} full={open} who={open && lines ? quoteSpeaker(item.quote, lines) : null} /> : null}
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
    transform: covered ? "rotate(45deg) scale(1)" : "rotate(45deg) scale(0.6)",
    opacity: covered ? 1 : 0,
    transition: "opacity 300ms ease, transform 300ms ease",
  };
  return (
    <span style={ring} aria-hidden>
      <span style={tick} />
    </span>
  );
}

/**
 * Recording's grey-row status: "Not discussed yet", or "Checking…" while a check runs.
 * Both words sit in one grid cell and only one is visible, so the slot keeps the width
 * of the wider one and nothing beside it moves when the words swap.
 */
function LiveStatus({ checking }: { checking: boolean }) {
  const word: CSSProperties = { gridArea: "1 / 1", textAlign: "right", whiteSpace: "nowrap" };
  return (
    <Box style={{ display: "grid", flex: "none", marginTop: 3 }}>
      <Text fz={16} fw={500} c="#9AA096" style={{ ...word, visibility: checking ? "hidden" : "visible" }}>
        Not discussed yet
      </Text>
      <Text
        data-ttc-anim
        fz={16}
        fw={500}
        c="#9AA096"
        aria-hidden={!checking}
        style={{ ...word, visibility: checking ? "visible" : "hidden", animation: checking ? "ttc-breathe 1.6s ease-in-out infinite" : "none" }}
      >
        Checking…
      </Text>
    </Box>
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
function Quote({ text, full, who }: { text: string; full: boolean; who: string | null }) {
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
      {who ? (
        <Text component="span" display="block" fz={16} fw={600} c={charted.muted} mb={4}>
          {who} said
        </Text>
      ) : null}
      “{text}”
    </Text>
  );
}
