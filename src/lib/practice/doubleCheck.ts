// The camera check's double-letter readout. With no target word, a double is
// counted the way a practice session would count the second of a pair: a
// slide or bounce repeats the last confirmed letter, and releasing a letter
// and forming it again counts when it matches the last one. Holding on
// doesn't repeat a letter.

import type { MotionEvent } from "@/lib/motion/detector";
import { DEFAULT_HOLD_CONFIG, initialHoldState, stepHold, type HoldConfig, type HoldState } from "./hold";
import { MOTION_LETTERS, type Confirmation } from "./session";

export interface DetectedDouble {
  letter: string;
  confirmedBy: Extract<Confirmation, "slide" | "bounce" | "hold">;
  /** Counts doubles, so the same letter doubled twice still reads as new. */
  n: number;
}

export interface DoubleCheckState {
  /** The last confirmed letter. */
  last: string | null;
  hold: HoldState;
  double: DetectedDouble | null;
}

export const initialDoubleCheck: DoubleCheckState = { last: null, hold: initialHoldState, double: null };

export type DoubleCheckEvent = { type: "reading"; now: number; letter: string | null } | { type: "motion"; motion: MotionEvent };

function doubled(state: DoubleCheckState, letter: string, confirmedBy: DetectedDouble["confirmedBy"]): DoubleCheckState {
  return { ...state, last: letter, double: { letter, confirmedBy, n: (state.double?.n ?? 0) + 1 } };
}

export function stepDoubleCheck(
  state: DoubleCheckState,
  event: DoubleCheckEvent,
  config: HoldConfig = DEFAULT_HOLD_CONFIG,
): DoubleCheckState {
  if (event.type === "reading") {
    const { state: hold, held } = stepHold(state.hold, event.letter, event.now, config);
    const next = { ...state, hold };
    if (held === null || MOTION_LETTERS.has(held)) return next;
    return held === state.last ? doubled(next, held, "hold") : { ...next, last: held };
  }
  const { motion } = event;
  if (motion.kind !== "double") return { ...state, last: motion.kind };
  // J and Z can't be doubled this way.
  return state.last && !MOTION_LETTERS.has(state.last) ? doubled(state, state.last, motion.style) : state;
}
