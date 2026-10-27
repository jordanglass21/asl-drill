"use client";

import type { ReactNode, RefObject } from "react";
import type { HandTrackingState } from "@/hooks/useHandTracking";
import { CAMERA_ERROR_MESSAGES, CAMERA_STATUS_MESSAGES, type CameraState } from "@/lib/camera/status";
import { CameraMessage } from "./CameraMessage";

interface Props {
  cameraState: CameraState;
  tracking: HandTrackingState;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onStart: () => void;
  /** Short status shown in the panel's corner, e.g. "right hand". */
  tag?: string;
  /** Rendered over the live preview (e.g. a countdown). */
  children?: ReactNode;
  /** Leave more room below the preview, for pages with more controls. */
  compact?: boolean;
}

/** Mirrored camera preview with the landmark overlay and permission messages. */
export function CameraStage({ cameraState, tracking, videoRef, canvasRef, onStart, tag, children, compact = false }: Props) {
  const ready = cameraState.status === "ready";
  const message =
    cameraState.status === "idle"
      ? { ...CAMERA_STATUS_MESSAGES.idle, action: { label: "Enable camera", onClick: onStart } }
      : cameraState.status === "requesting"
        ? CAMERA_STATUS_MESSAGES.requesting
        : cameraState.status === "error"
          ? { ...CAMERA_ERROR_MESSAGES[cameraState.reason], action: { label: "Try again", onClick: onStart } }
          : tracking.status === "error"
            ? { ...CAMERA_STATUS_MESSAGES.trackingFailed, action: { label: "Try again", onClick: tracking.retry } }
            : null;

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded bg-panel ${
        compact ? "max-h-[calc(100vh-330px)] min-h-[170px]" : "max-h-[calc(100vh-300px)] min-h-[260px]"
      }`}
    >
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
      {ready && (
        <p className="label pointer-events-none absolute top-2.5 left-3">
          Camera{tag && <><span className="mx-1.5 text-edge">/</span><b className="font-bold text-amber">{tag}</b></>}
        </p>
      )}
      {message ? <div className="absolute inset-0 bg-panel">{<CameraMessage {...message} />}</div> : children}
    </div>
  );
}
