"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { HandednessSetting } from "@/lib/hands/handedness";
import { buildRecordingFile, recordingFileName } from "@/lib/recording/format";
import { initialRecorderState, recorderReducer, type RecorderEvent } from "@/lib/recording/recorder";
import type { TrackedFrame } from "./useHandTracking";

const reducer = (state: typeof initialRecorderState, event: RecorderEvent) => recorderReducer(state, event);

function downloadJson(data: unknown, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Drives the /record flow: letter keys pick a letter (shift for a double),
 * "/" opens word mode, space starts a take, escape cancels, backspace deletes
 * the last take, cmd/ctrl+S exports.
 */
export function useRecorder({
  handedness,
  enabled,
  onWordKey,
}: {
  handedness: HandednessSetting;
  enabled: boolean;
  /** Called when "/" is pressed, to focus the word box. */
  onWordKey?: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, initialRecorderState);
  const [now, setNow] = useState(0);
  const capturingRef = useRef(false);
  const active = state.phase.kind !== "idle";

  useEffect(() => {
    capturingRef.current = state.phase.kind === "capturing";
  }, [state.phase.kind]);

  const start = useCallback(() => {
    if (!enabled) return;
    dispatch({
      type: "start",
      now: performance.now(),
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      handednessSetting: handedness,
    });
  }, [enabled, handedness]);

  const exportTakes = useCallback(() => {
    if (state.takes.length === 0) return;
    const createdAt = new Date();
    downloadJson(buildRecordingFile(state.takes, createdAt.toISOString()), recordingFileName(createdAt));
    dispatch({ type: "exported" });
  }, [state.takes]);

  const onFrame = useCallback((frame: TrackedFrame) => {
    if (!capturingRef.current || !frame.hand) return;
    const { hand } = frame;
    dispatch({
      type: "frame",
      now: frame.now,
      sample: {
        side: hand.side,
        label: hand.label,
        score: hand.score,
        landmarks: hand.landmarks,
        worldLandmarks: hand.worldLandmarks,
        camera: { width: frame.width, height: frame.height },
      },
    });
  }, []);

  // Drive countdown and capture deadlines while a take is in progress.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      dispatch({ type: "tick", now: t });
    }, 50);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        exportTakes();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (event.key === " ") {
        event.preventDefault();
        start();
      } else if (event.key === "Escape") {
        dispatch({ type: "cancel" });
      } else if (event.key === "Backspace") {
        dispatch({ type: "deleteLastTake" });
      } else if (/^[a-z]$/i.test(event.key)) {
        dispatch({ type: "selectLetter", letter: event.key, double: event.shiftKey });
      } else if (event.key === "/") {
        event.preventDefault();
        onWordKey?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [start, exportTakes, onWordKey]);

  useEffect(() => {
    if (!state.unsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.unsaved]);

  const selectLetter = useCallback(
    (letter: string, double = false) => dispatch({ type: "selectLetter", letter, double }),
    [],
  );
  const selectWord = useCallback((word: string) => dispatch({ type: "selectWord", word }), []);

  return { state, now, onFrame, start, exportTakes, selectLetter, selectWord };
}
