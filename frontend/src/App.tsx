import { Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

import { ApiError, fetchDevices } from "./api";
import { ThingsToCover } from "./components/ThingsToCover";
import { Start } from "./screens/Start";
import { charted } from "./theme";
import type {
  CoverageItem,
  Device,
  DeviceId,
  RecordingProps,
  ReviewProps,
  TranscriptLine,
} from "./types";

/**
 * The home page, then one screen that changes state: start, recording, review.
 * The address ending in #app opens the start state directly, so the demo never
 * depends on the home page.
 */
type View =
  | { name: "home" }
  | { name: "start" }
  | { name: "recording" }
  | { name: "review"; transcript: TranscriptLine[]; coverage: CoverageItem[] };

const APP_HASH = "#app";

function viewFromHash(): View {
  return window.location.hash === APP_HASH ? { name: "start" } : { name: "home" };
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  // "New leg or socket" is chosen when the app opens (q13); the server lists it first.
  const [deviceId, setDeviceId] = useState<DeviceId>("leg");

  const loadDevices = useCallback(() => {
    setDevicesError(null);
    fetchDevices()
      .then((list) => {
        setDevices(list);
        if (list.length > 0 && !list.some((d) => d.id === deviceId)) setDeviceId(list[0].id);
      })
      .catch((err: unknown) => {
        setDevicesError(err instanceof ApiError ? err.message : "Couldn't load the devices.");
      });
    // Only on first load and on "Try again"; the chosen device is checked, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(loadDevices, [loadDevices]);

  // Back and forward between the home page and #app. A visit in progress is never left.
  useEffect(() => {
    const onHashChange = () => {
      setView((current) => {
        if (current.name === "home" && window.location.hash === APP_HASH) return { name: "start" };
        if (current.name === "start" && window.location.hash !== APP_HASH) return { name: "home" };
        return current;
      });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const openApp = () => {
    window.location.hash = APP_HASH;
    setView({ name: "start" });
  };

  const device = devices?.find((d) => d.id === deviceId) ?? null;

  if (view.name === "home") return <HomePlaceholder onOpenApp={openApp} />;

  return (
    <Box mih="100vh">
      <TopBar step={view.name === "review" ? 2 : 1} device={view.name === "start" ? null : device} />
      {view.name === "start" || !device ? (
        <Start
          devices={devices}
          error={devicesError}
          onRetry={loadDevices}
          deviceId={deviceId}
          onPickDevice={setDeviceId}
          onStart={() => setView({ name: "recording" })}
        />
      ) : view.name === "recording" ? (
        <RecordingPlaceholder
          device={device}
          onStop={(transcript, coverage) => setView({ name: "review", transcript, coverage })}
        />
      ) : (
        <ReviewPlaceholder
          device={device}
          transcript={view.transcript}
          coverage={view.coverage}
          onNewVisit={() => setView({ name: "start" })}
        />
      )}
    </Box>
  );
}

// ── The bar on every state (mocks/option1-one-screen.png) ─────────────

function TopBar({ step, device }: { step: 1 | 2 | 3; device: Device | null }) {
  return (
    <Group justify="space-between" align="center" px={64} py={24} wrap="nowrap">
      <Box w={320}>
        <Brand />
      </Box>
      <Group gap={10}>
        {(["Record", "Review", "Done"] as const).map((label, i) => {
          const on = i + 1 === step;
          return (
            <Text
              key={label}
              component="span"
              fz={18}
              fw={600}
              px={18}
              py={8}
              style={{
                borderRadius: 999,
                background: on ? charted.green : "#fff",
                color: on ? "#fff" : charted.muted,
                border: `1px solid ${on ? charted.green : charted.line}`,
              }}
            >
              {i + 1} {label}
            </Text>
          );
        })}
      </Group>
      <Text w={320} ta="right" fz={20} fw={500} c={charted.muted} truncate>
        {device?.label ?? ""}
      </Text>
    </Group>
  );
}

function Brand() {
  return (
    <Group gap={12} wrap="nowrap">
      <span
        aria-hidden
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: charted.green,
          position: "relative",
          flex: "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 9,
            border: `3px solid ${charted.lime}`,
            borderRightColor: "transparent",
            borderRadius: "50%",
          }}
        />
      </span>
      <Text fz={26} fw={700} c={charted.ink} style={{ letterSpacing: "-0.04em" }}>
        Visit notes
      </Text>
    </Group>
  );
}

// ── Placeholders: s6 swaps in s7's Home.tsx, s3's Recording.tsx and s5's Review.tsx ──

function HomePlaceholder({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <Box mih="100vh">
      <Group px={64} py={24}>
        <Brand />
      </Group>
      <Stack align="center" gap={24} pt={120}>
        <Title order={1}>Visit notes that write themselves</Title>
        <Text fz={24} c={charted.muted}>
          Talk with your patient. The note is ready when they leave.
        </Text>
        <Button onClick={onOpenApp} mt={16}>
          Start recording
        </Button>
      </Stack>
    </Box>
  );
}

function RecordingPlaceholder({ device, onStop }: RecordingProps) {
  return (
    <Stack align="center" gap={32} pt={40} pb={80}>
      <Title order={1}>Recording</Title>
      <Button color="red" onClick={() => onStop([], [])}>
        Stop
      </Button>
      <Box w={760}>
        <ThingsToCover questions={device.questions} coverage={[]} />
      </Box>
    </Stack>
  );
}

function ReviewPlaceholder({ device, coverage, onNewVisit }: ReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <Stack align="center" gap={32} pt={40} pb={80}>
      <Title order={1}>Your note</Title>
      <Box w={760}>
        <ThingsToCover
          questions={device.questions}
          coverage={coverage}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((open) => (open === id ? null : id))}
        />
      </Box>
      <Button variant="default" onClick={onNewVisit}>
        New visit
      </Button>
    </Stack>
  );
}
