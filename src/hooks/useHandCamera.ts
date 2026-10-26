"use client";

import { useRef } from "react";
import type { HandednessSetting } from "@/lib/hands/handedness";
import { useCamera } from "./useCamera";
import { useHandTracking, type TrackedFrame } from "./useHandTracking";

/** Camera plus hand tracking, wired together for a <CameraStage>. */
export function useHandCamera({ setting, onFrame }: { setting: HandednessSetting; onFrame?: (frame: TrackedFrame) => void }) {
  const { state: cameraState, videoRef, start } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tracking = useHandTracking({
    videoRef,
    canvasRef,
    active: cameraState.status === "ready",
    setting,
    onFrame,
  });
  return { cameraState, videoRef, canvasRef, start, tracking };
}
