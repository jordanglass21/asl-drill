"use client";

import { useRef } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { useHandTracking } from "@/hooks/useHandTracking";
import { CAMERA_ERROR_MESSAGES } from "@/lib/camera/status";
import { CameraMessage } from "./CameraMessage";
import { HandednessToggle } from "./HandednessToggle";

export function CameraCheck() {
  const [handedness, setHandedness] = useHandednessSetting();
  const { state, videoRef, start } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ready = state.status === "ready";
  const tracking = useHandTracking({ videoRef, canvasRef, active: ready, setting: handedness });

  const message =
    state.status === "idle"
      ? {
          title: "Turn on your camera to start",
          detail: "Hand tracking runs entirely in your browser. Video never leaves your device.",
          action: { label: "enable camera", onClick: start },
        }
      : state.status === "requesting"
        ? { title: "Waiting for camera permission…", detail: "Allow camera access in your browser's prompt." }
        : state.status === "error"
          ? { ...CAMERA_ERROR_MESSAGES[state.reason], action: { label: "try again", onClick: start } }
          : tracking.status === "error"
            ? {
                title: "Couldn't load hand tracking",
                detail: "Check your connection, then try again.",
                action: { label: "try again", onClick: tracking.retry },
              }
            : null;

  const readout =
    tracking.status === "loading"
      ? "loading hand tracking…"
      : tracking.status !== "ready"
        ? ""
        : tracking.signingSide
          ? `tracking ${tracking.signingSide} hand`
          : handedness === "auto"
            ? "show a hand"
            : `show your ${handedness} hand`;

  return (
    <section className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HandednessToggle value={handedness} onChange={setHandedness} />
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Mirrored camera preview"
          className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${ready ? "" : "invisible"}`}
        />
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${ready ? "" : "invisible"}`}
        />
        {message && (
          <div className="absolute inset-0 bg-surface/95">
            <CameraMessage {...message} />
          </div>
        )}
      </div>
    </section>
  );
}
