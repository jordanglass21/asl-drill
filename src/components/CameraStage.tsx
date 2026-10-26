"use client";

import type { ReactNode, RefObject } from "react";
import type { HandTrackingState } from "@/hooks/useHandTracking";
import { CAMERA_ERROR_MESSAGES, type CameraState } from "@/lib/camera/status";
import { CameraMessage } from "./CameraMessage";

interface Props {
  cameraState: CameraState;
  tracking: HandTrackingState;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onStart: () => void;
  /** Rendered over the live preview (e.g. a countdown). */
  children?: ReactNode;
}

/** Mirrored camera preview with the landmark overlay and permission messages. */
export function CameraStage({ cameraState, tracking, videoRef, canvasRef, onStart, children }: Props) {
  const ready = cameraState.status === "ready";
  const message =
    cameraState.status === "idle"
      ? {
          title: "Turn on your camera to start",
          detail: "Hand tracking runs entirely in your browser. Video never leaves your device.",
          action: { label: "enable camera", onClick: onStart },
        }
      : cameraState.status === "requesting"
        ? { title: "Waiting for camera permission…", detail: "Allow camera access in your browser's prompt." }
        : cameraState.status === "error"
          ? { ...CAMERA_ERROR_MESSAGES[cameraState.reason], action: { label: "try again", onClick: onStart } }
          : tracking.status === "error"
            ? {
                title: "Couldn't load hand tracking",
                detail: "Check your connection, then try again.",
                action: { label: "try again", onClick: tracking.retry },
              }
            : null;

  return (
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
      {message ? (
        <div className="absolute inset-0 bg-surface/95">
          <CameraMessage {...message} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

