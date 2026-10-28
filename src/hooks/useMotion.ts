"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialMotionState, stepMotion, type MotionEvent, type MotionState } from "@/lib/motion/detector";
import type { TrackedFrame } from "./useHandTracking";

const SHOW_MS = 1500;

/** Runs the motion detector on tracked frames and remembers the latest event briefly, for display. */
export function useMotion() {
  const stateRef = useRef<MotionState>(initialMotionState);
  const [last, setLast] = useState<MotionEvent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** Steps the detector and returns the events this frame completed. */
  const onFrame = useCallback((frame: TrackedFrame): MotionEvent[] => {
    const step = stepMotion(
      stateRef.current,
      frame.hand && frame.height > 0
        ? { t: frame.now, landmarks: frame.hand.landmarks, side: frame.hand.side, aspectRatio: frame.width / frame.height }
        : null,
    );
    stateRef.current = step.state;
    const event = step.events.at(-1);
    if (!event) return step.events;
    setLast(event);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLast(null), SHOW_MS);
    return step.events;
  }, []);

  return { last, onFrame };
}
