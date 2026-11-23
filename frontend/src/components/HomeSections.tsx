import { Box, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import {
  IconArrowRight,
  IconCheck,
  IconClockHour9,
  IconEye,
  IconFileAlert,
  IconMicrophone,
  IconPointer,
  IconFileText,
  type Icon,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { charted } from "../theme";

/**
 * The parts of the home page below the nav: the brand mark, the picture of a
 * visit becoming a note, the clinician's three pains and the three steps.
 * Every word is about a prosthetist's visit (CASE.md, DEMO-SCRIPT.md); nothing
 * here claims a number we can't show in the demo.
 */

// ── Brand ──────────────────────────────────────────────────────────────

/** The green tile with a lime ring, from mocks/base.css. */
export function Logo({ size = 40 }: { size?: number }) {
  const inset = Math.round(size / 4);
  return (
    <Box
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 3.6,
        background: charted.green,
        position: "relative",
        flex: "none",
      }}
    >
      <Box
        style={{
          position: "absolute",
          inset,
          border: `3px solid ${charted.lime}`,
          borderRightColor: "transparent",
          borderRadius: "50%",
        }}
      />
    </Box>
  );
}

// ── The picture: a visit becoming a note ───────────────────────────────

const cardStyle = {
  position: "absolute" as const,
  background: "#fff",
  border: `1px solid ${charted.line}`,
  borderRadius: 24,
  boxShadow: charted.cardShadow,
  padding: 24,
};

function CardLabel({ children }: { children: ReactNode }) {
  return (
    <Text fz={15} fw={700} c={charted.muted} tt="uppercase" style={{ letterSpacing: "0.06em" }}>
      {children}
    </Text>
  );
}

function Said({ who, children }: { who: string; children: ReactNode }) {
  return (
    <Box>
      <Text fz={14} fw={700} c={charted.muted}>
        {who}
      </Text>
      <Text fz={17} lh={1.45} c={charted.ink}>
        {children}
      </Text>
    </Box>
  );
}

function Covered({ label, done }: { label: string; done: boolean }) {
  return (
    <Group gap={12} wrap="nowrap">
      <ThemeIcon
        size={26}
        radius={999}
        color={done ? "brand" : "gray"}
        variant={done ? "filled" : "outline"}
        style={done ? undefined : { borderColor: "#CFD5C8", background: "#fff" }}
      >
        {done ? <IconCheck size={16} stroke={3} color={charted.lime} /> : null}
      </ThemeIcon>
      <Text fz={17} fw={600} c={done ? charted.ink : charted.muted}>
        {label}
      </Text>
    </Group>
  );
}

function NoteLine({ section, children }: { section: string; children: ReactNode }) {
  return (
    <Box>
      <Text fz={14} fw={700} c={charted.green}>
        {section}
      </Text>
      <Text fz={16} lh={1.45} c={charted.ink}>
        {children}
      </Text>
    </Box>
  );
}

/**
 * Three cards: what was said, the things to cover turning green, and the note
 * written from it. The words are the demo visit's own (DEMO-SCRIPT.md).
 */
export function VisitToNotePicture() {
  return (
    <Box
      role="img"
      aria-label="What the patient said, the things to cover turning green, and the note written from it"
      style={{ position: "relative", width: 600, height: 500, flex: "none" }}
    >
      {/* Soft frame behind the cards, like the browser window in the Framer picture. */}
      <Box
        style={{
          position: "absolute",
          left: 40,
          top: 30,
          right: 10,
          bottom: 40,
          borderRadius: 28,
          background: "rgba(255,255,255,0.55)",
          border: `1px solid ${charted.pale}`,
        }}
      />

      {/* What was said */}
      <Box style={{ ...cardStyle, left: 0, top: 70, width: 270 }}>
        <Stack gap={14}>
          <Group justify="space-between">
            <CardLabel>The visit</CardLabel>
            <Box
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: charted.green,
                boxShadow: `0 0 0 7px ${charted.pale}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconMicrophone size={18} color={charted.lime} stroke={2.2} />
            </Box>
          </Group>
          <Said who="Patient">I'm wearing three extra socks just to keep it on.</Said>
          <Said who="Clinician">We did a six-minute walk test today, and you covered 350 meters.</Said>
        </Stack>
      </Box>

      {/* Things to cover */}
      <Box style={{ ...cardStyle, left: 190, top: 330, width: 250, padding: 20 }}>
        <Stack gap={12}>
          <CardLabel>Things to cover</CardLabel>
          <Covered label="Why this device" done />
          <Covered label="Walking test" done />
          <Covered label="Wish to walk" done={false} />
        </Stack>
      </Box>

      {/* The note */}
      <Box style={{ ...cardStyle, right: 0, top: 0, width: 280 }}>
        <Stack gap={12}>
          <CardLabel>SOAP note</CardLabel>
          <NoteLine section="Subjective">Socket is loose; wears three extra socks to keep it on.</NoteLine>
          <NoteLine section="Objective">Six-minute walk test: 350 meters.</NoteLine>
          <NoteLine section="Plan">New socket and a dynamic-response foot.</NoteLine>
        </Stack>
      </Box>

      {/* The arrow from the visit to the note */}
      <ThemeIcon
        size={56}
        radius={999}
        color="lime"
        style={{ position: "absolute", left: 270, top: 150, boxShadow: charted.cardShadow }}
      >
        <IconArrowRight size={28} color={charted.green} stroke={2.4} />
      </ThemeIcon>
    </Box>
  );
}

// ── Sections ───────────────────────────────────────────────────────────

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <Stack gap={12} align="center" ta="center" maw={820} mx="auto">
      <Text fz={18} fw={700} c={charted.green} tt="uppercase" style={{ letterSpacing: "0.08em" }}>
        {kicker}
      </Text>
      <Title order={2} c={charted.ink} style={{ letterSpacing: "-0.03em" }}>
        {title}
      </Title>
    </Stack>
  );
}

interface Point {
  icon: Icon;
  title: string;
  body: string;
}

const pains: Point[] = [
  {
    icon: IconEye,
    title: "Your hands are busy",
    body: "You are casting a limb or checking a brace. Turning to type breaks eye contact with the patient.",
  },
  {
    icon: IconFileAlert,
    title: "One missed detail, one denied claim",
    body: "Medicare wants the walking level, the limb's condition and why this device. Forget one and the claim comes back.",
  },
  {
    icon: IconClockHour9,
    title: "Notes after hours",
    body: "The day's visits get written up in the evening, from memory, long after the patient went home.",
  },
];

/** The clinician's three pains, from the written brief. */
export function PainsSection() {
  return (
    <Stack gap={48}>
      <SectionHeading kicker="The problem" title="The note shouldn't follow you home." />
      <SimpleGrid cols={3} spacing={28}>
        {pains.map(({ icon: PainIcon, title, body }) => (
          <Paper
            key={title}
            p={32}
            radius={24}
            withBorder
            style={{ borderColor: charted.line, boxShadow: charted.cardShadow }}
          >
            <Stack gap={16}>
              <ThemeIcon size={60} radius={999} color="lime" variant="light">
                <PainIcon size={30} color={charted.green} stroke={2} />
              </ThemeIcon>
              <Title order={4} c={charted.ink}>
                {title}
              </Title>
              <Text fz={19} lh={1.55} c={charted.muted}>
                {body}
              </Text>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

const steps: Point[] = [
  {
    icon: IconPointer,
    title: "Pick the device",
    body: "A new leg or socket, an ankle-foot brace or a knee brace. Everi shows what that visit has to cover.",
  },
  {
    icon: IconMicrophone,
    title: "Record the visit",
    body: "Talk with your patient as you always do. Each thing to cover turns green when it is said.",
  },
  {
    icon: IconFileText,
    title: "Review the note",
    body: "The SOAP note is ready when you press Stop. Click any green item to see the patient's own words, fix a line, copy it.",
  },
];

/** How it works, in the three steps the app itself takes. */
export function StepsSection() {
  return (
    <Stack gap={48}>
      <SectionHeading kicker="How it works" title="Three steps, one screen." />
      <SimpleGrid cols={3} spacing={28}>
        {steps.map(({ icon: StepIcon, title, body }, i) => (
          <Stack key={title} gap={16} p={8}>
            <Group gap={16} wrap="nowrap">
              <ThemeIcon size={60} radius={999} color="brand">
                <StepIcon size={28} color={charted.lime} stroke={2} />
              </ThemeIcon>
              <Text fz={20} fw={700} c={charted.muted}>
                Step {i + 1}
              </Text>
            </Group>
            <Title order={3} c={charted.ink} style={{ letterSpacing: "-0.02em" }}>
              {title}
            </Title>
            <Text fz={19} lh={1.55} c={charted.muted}>
              {body}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
