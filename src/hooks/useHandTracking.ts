"use client";

import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { HAND_LANDMARKER_MODEL_PATH, MEDIAPIPE_WASM_PATH } from "@/lib/hands/assets";
import { drawHands, type OverlayColors } from "@/lib/hands/draw";
import {
  initialSelectionState,
  selectSigningHand,
  toDetectedHands,
  type DetectedHand,
  type HandednessSetting,
  type HandSide,
  type SelectionState,
} from "@/lib/hands/handedness";

let landmarkerPromise: Promise<HandLandmarker> | null = null;

/** Loads MediaPipe once per page. Tries the GPU first and falls back to the CPU. */
function loadHandLandmarker(): Promise<HandLandmarker> {
  landmarkerPromise ??= (async () => {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    const create = (delegate: "GPU" | "CPU") =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_LANDMARKER_MODEL_PATH, delegate },
        runningMode: "VIDEO",
        numHands: 2,
      });
    try {
      return await create("GPU");
    } catch {
      return await create("CPU");
    }
  })();
  // Allow a retry after a failed load (e.g. a network blip).
  landmarkerPromise.catch(() => {
    landmarkerPromise = null;
  });
  return landmarkerPromise;
}

function readOverlayColors(element: Element): OverlayColors {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return { bone: read("--amber", "#f4a51c"), joint: read("--cream", "#efe5cf"), dim: read("--cream-dim", "#6e675c") };
}

export interface HandTrackingState {
  status: "idle" | "loading" | "ready" | "error";
  signingSide: HandSide | null;
  handCount: number;
  /** Retries loading MediaPipe after an error. */
  retry: () => void;
}

/** One processed video frame, passed to `onFrame`. */
export interface TrackedFrame {
  /** performance.now() when the frame was processed. */
  now: number;
  /** The signing hand, if one is in view. */
  hand: DetectedHand | null;
  hands: DetectedHand[];
  width: number;
  height: number;
}

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  setting: HandednessSetting;
  /** Called for every processed frame; may change between renders. */
  onFrame?: (frame: TrackedFrame) => void;
}

/**
 * Runs hand tracking on the live video while `active`, draws the overlay, and
 * reports which hand is signing. React state only changes when the readout
 * does, not on every frame.
 */
export function useHandTracking({ videoRef, canvasRef, active, setting, onFrame }: Options): HandTrackingState {
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [failed, setFailed] = useState(false);
  const [readout, setReadout] = useState<{ signingSide: HandSide | null; handCount: number }>({
    signingSide: null,
    handCount: 0,
  });
  const settingRef = useRef(setting);
  const selectionRef = useRef<SelectionState>(initialSelectionState);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    settingRef.current = setting;
    selectionRef.current = initialSelectionState;
  }, [setting]);

  useEffect(() => {
    if (!active || landmarker || failed) return;
    let cancelled = false;
    loadHandLandmarker().then(
      (loaded) => {
        if (!cancelled) setLandmarker(loaded);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active, landmarker, failed]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!active || !landmarker || !video || !canvas || !ctx) return;

    const colors = readOverlayColors(canvas);
    let lastVideoTime = -1;
    let frameHandle = 0;
    let stopped = false;
    let last = { signingSide: null as HandSide | null, handCount: 0 };

    const scheduleNext = () => {
      if (stopped) return;
      frameHandle =
        "requestVideoFrameCallback" in video
          ? video.requestVideoFrameCallback(onFrame)
          : requestAnimationFrame(onFrame);
    };

    const onFrame = () => {
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const hands = toDetectedHands(result);
        const { hand, state } = selectSigningHand(hands, settingRef.current, selectionRef.current);
        selectionRef.current = state;
        drawHands(ctx, hands, hand?.index ?? null, colors, true);
        onFrameRef.current?.({ now, hand, hands, width: video.videoWidth, height: video.videoHeight });

        const next = { signingSide: hand?.side ?? null, handCount: hands.length };
        if (next.signingSide !== last.signingSide || next.handCount !== last.handCount) {
          last = next;
          setReadout(next);
        }
      }
      scheduleNext();
    };

    scheduleNext();
    return () => {
      stopped = true;
      if ("cancelVideoFrameCallback" in video) video.cancelVideoFrameCallback(frameHandle);
      cancelAnimationFrame(frameHandle);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, landmarker, videoRef, canvasRef]);

  const status: HandTrackingState["status"] = !active
    ? "idle"
    : failed
      ? "error"
      : landmarker
        ? "ready"
        : "loading";
  const retry = useCallback(() => setFailed(false), []);
  return active && landmarker ? { status, ...readout, retry } : { status, signingSide: null, handCount: 0, retry };
}
