"use client";

import { useCallback, useRef, useState } from "react";
import type { MotionEvent } from "@/lib/motion/detector";
import { initialDoubleCheck, stepDoubleCheck, type DetectedDouble, type DoubleCheckState } from "@/lib/practice/doubleCheck";

/**
 * The camera check's latest double letter. The hold state changes every
 * frame, so it lives in a ref and only a new double re-renders.
 */
export function useDoubleCheck() {
  const stateRef = useRef<DoubleCheckState>(initialDoubleCheck);
  const [double, setDouble] = useState<DetectedDouble | null>(null);

  const onFrame = useCallback((now: number, letter: string | null, events: readonly MotionEvent[]) => {
    let state = stepDoubleCheck(stateRef.current, { type: "reading", now, letter });
    for (const motion of events) state = stepDoubleCheck(state, { type: "motion", motion });
    if (state.double !== stateRef.current.double) setDouble(state.double);
    stateRef.current = state;
  }, []);

  return { double, onFrame };
}
