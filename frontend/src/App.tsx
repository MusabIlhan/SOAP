import { Box, Group, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

import { ApiError, fetchDevices } from "./api";
import { Logo } from "./components/HomeSections";
import Home from "./screens/Home";
import { Recording } from "./screens/Recording";
import { Review } from "./screens/Review";
import { Start } from "./screens/Start";
import { charted } from "./theme";
import type { CoverageItem, Device, DeviceId, TranscriptLine } from "./types";

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

  if (view.name === "home") return <Home onEnter={openApp} />;

  return (
    <Box mih="100vh">
      {/* Recording names the device under its own title, so the bar shows it on review only. */}
      <TopBar step={view.name === "review" ? 2 : 1} device={view.name === "review" ? device : null} />
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
        <Recording
          device={device}
          onStop={(transcript, coverage) => setView({ name: "review", transcript, coverage })}
        />
      ) : (
        <Review
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

/** The same logo and name as the home page's nav bar. */
function Brand() {
  return (
    <Group gap={12} wrap="nowrap">
      <Logo size={36} />
      <Text fz={26} fw={700} c={charted.ink} style={{ letterSpacing: "-0.04em" }}>
        Everi
      </Text>
    </Group>
  );
}
