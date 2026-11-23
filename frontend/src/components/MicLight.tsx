import { Box } from "@mantine/core";
import { IconMicrophone } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

import { charted } from "../theme";

interface MicLightProps {
  /** The mic stream being transcribed; null while it is starting. */
  stream: MediaStream | null;
  /** Core diameter in px; the halo around it grows to about twice that. */
  size?: number;
}

/**
 * A large round light that grows and shrinks with how loud the room is, so the
 * clinician sees from a step away that the mic hears both people (DECISIONS q17).
 * It reads the mic in the browser only. Each frame sets the size straight on the
 * elements, so React does not re-render 60 times a second. If the browser can't
 * measure the sound, the light pulses gently instead.
 */
export function MicLight({ stream, size = 168 }: MicLightProps) {
  const halo = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stream) return;
    let context: AudioContext;
    let analyser: AnalyserNode;
    try {
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      void context.resume();
    } catch {
      halo.current?.style.setProperty("animation", "micLightPulse 1.6s ease-in-out infinite");
      return;
    }

    const samples = new Uint8Array(analyser.fftSize);
    let level = 0;
    let frame = 0;

    const draw = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const centred = (sample - 128) / 128;
        sum += centred * centred;
      }
      // Speech sits around 0.02 to 0.2 RMS; the square root makes quiet voices visible.
      const loudness = Math.min(1, Math.sqrt(Math.sqrt(sum / samples.length)) * 1.6);
      // Rise at once with a voice, fall back slowly, so the light breathes rather than flickers.
      level = loudness > level ? loudness : level * 0.92 + loudness * 0.08;

      halo.current?.style.setProperty("transform", `scale(${1.1 + level * 0.9})`);
      halo.current?.style.setProperty("opacity", String(0.25 + level * 0.55));
      glow.current?.style.setProperty("transform", `scale(${1.04 + level * 0.45})`);
      core.current?.style.setProperty("transform", `scale(${1 + level * 0.08})`);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      void context.close();
    };
  }, [stream]);

  const ring = (scale: number) => ({
    position: "absolute" as const,
    inset: 0,
    margin: "auto",
    width: size * scale,
    height: size * scale,
    borderRadius: "50%",
    transition: "transform 80ms linear, opacity 120ms linear",
    willChange: "transform, opacity",
  });

  return (
    <Box
      role="img"
      aria-label={stream ? "The microphone is listening" : "Starting the microphone"}
      style={{ position: "relative", width: size * 2, height: size * 2, flex: "none" }}
    >
      <style>{`@keyframes micLightPulse { 0%, 100% { transform: scale(1); opacity: .3 } 50% { transform: scale(1.5); opacity: .7 } }`}</style>
      <div ref={halo} style={{ ...ring(1), background: charted.lime, opacity: 0.25 }} />
      <div ref={glow} style={{ ...ring(1), background: charted.pale, opacity: 0.9 }} />
      <div
        ref={core}
        style={{
          ...ring(1),
          background: charted.green,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 18px 40px rgba(40, 83, 55, 0.25)",
          opacity: stream ? 1 : 0.55,
        }}
      >
        <IconMicrophone size={size * 0.38} color={charted.lime} stroke={2} />
      </div>
    </Box>
  );
}
