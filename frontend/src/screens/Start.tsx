import { Box, Button, Group, Loader, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconCheck, IconRefresh } from "@tabler/icons-react";

import { ThingsToCover } from "../components/ThingsToCover";
import { charted } from "../theme";
import type { Device, DeviceId } from "../types";

export interface StartProps {
  /** The three devices from the server, or null while they load. */
  devices: Device[] | null;
  /** Set when the devices could not be loaded. */
  error: string | null;
  onRetry: () => void;
  deviceId: DeviceId;
  onPickDevice: (id: DeviceId) => void;
  onStart: () => void;
}

/**
 * The start state (mocks/option1-one-screen.png): the device being evaluated,
 * one large "Start recording" button, and that device's things to cover below it.
 * "New leg or socket" is chosen when the app opens, so one press starts a visit (q13).
 */
export function Start({ devices, error, onRetry, deviceId, onPickDevice, onStart }: StartProps) {
  const device = devices?.find((d) => d.id === deviceId) ?? null;

  return (
    <Stack align="center" gap={0} pt={40} pb={80}>
      <Title order={1} style={{ letterSpacing: "-0.03em" }} c={charted.ink}>
        Ready when you are
      </Title>
      <Text fz={24} c={charted.muted} mt={14}>
        Press the button, then talk with your patient as usual.
      </Text>

      {error ? (
        <LoadError message={error} onRetry={onRetry} />
      ) : !devices || !device ? (
        <Loader color="brand" size="lg" mt={64} />
      ) : (
        <>
          <DevicePicker devices={devices} deviceId={deviceId} onPick={onPickDevice} />
          <StartButton onClick={onStart} />
          <Box w={760} mt={48}>
            <ThingsToCover questions={device.questions} coverage={[]} />
          </Box>
        </>
      )}
    </Stack>
  );
}

function DevicePicker({
  devices,
  deviceId,
  onPick,
}: {
  devices: Device[];
  deviceId: DeviceId;
  onPick: (id: DeviceId) => void;
}) {
  return (
    <Group gap={14} mt={36} role="radiogroup" aria-label="This visit is for">
      {devices.map((d) => {
        const on = d.id === deviceId;
        return (
          <UnstyledButton
            key={d.id}
            role="radio"
            aria-checked={on}
            onClick={() => onPick(d.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              height: 64,
              padding: on ? "0 28px 0 14px" : "0 28px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: on ? "#fff" : charted.green,
              background: on ? charted.green : "#fff",
              border: `2px solid ${on ? charted.green : charted.pale}`,
              transition: "background 150ms ease, color 150ms ease, border-color 150ms ease",
            }}
          >
            {on ? (
              <span
                aria-hidden
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: charted.lime,
                  color: charted.green,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCheck size={22} stroke={3} />
              </span>
            ) : null}
            {d.label}
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

/** The one big pill from the mock: white words, a lime circle with a dot. */
function StartButton({ onClick }: { onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={onClick}
      mt={36}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 20,
        padding: "18px 18px 18px 48px",
        borderRadius: 999,
        background: charted.green,
        color: "#fff",
        fontSize: 34,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        boxShadow: "0 12px 30px rgba(40, 83, 55, 0.18)",
      }}
    >
      Start recording
      <span
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: charted.lime,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: charted.green }} />
      </span>
    </UnstyledButton>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack align="center" gap={20} mt={56}>
      <Text fz={22} c={charted.ink}>
        {message}
      </Text>
      <Button onClick={onRetry} leftSection={<IconRefresh size={24} />}>
        Try again
      </Button>
    </Stack>
  );
}
