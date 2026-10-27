// What the play screen shows for a session state.

import type { FlapState } from "@/lib/board/flap";
import { holdProgress } from "./hold";
import {
  DEFAULT_PRACTICE_CONFIG,
  isRepeat,
  MOTION_LETTERS,
  targetLetter,
  wordsSoFar,
  type PracticeConfig,
  type PracticeState,
} from "./session";

/** How the current letter is confirmed. */
export type TargetMode = "hold" | "motion" | "double";
import { summarize, type SessionSummary } from "./stats";

export interface BoardView {
  word: string;
  wordNumber: number;
  wordCount: number;
  tiles: { char: string; state: FlapState }[];
  target: string | null;
  mode: TargetMode;
  /** 0–1 progress of holding the target letter. */
  hold: number;
  /** A confident reading of some other letter, to flag on screen. */
  wrongReading: string | null;
  /** Letters after the current one in this word. */
  upcoming: string[];
  summary: SessionSummary;
}

export function boardView(state: PracticeState, now: number, config: PracticeConfig = DEFAULT_PRACTICE_CONFIG): BoardView | null {
  if (state.phase !== "playing") return null;
  const word = state.words[state.wordIndex] ?? "";
  const target = targetLetter(state);
  const resolved = state.current;
  const tiles = [...word].map((char, i) => {
    const result = resolved[i];
    const tileState: FlapState = result
      ? result.result === "pass"
        ? "confirmed"
        : "missed"
      : i === resolved.length
        ? "current"
        : "pending";
    return { char, state: tileState };
  });
  const mode: TargetMode = target && MOTION_LETTERS.has(target) ? "motion" : isRepeat(state) ? "double" : "hold";
  return {
    word,
    wordNumber: state.wordIndex + 1,
    wordCount: state.words.length,
    tiles,
    target,
    mode,
    // A fired hold on the first of a double isn't progress toward the second.
    hold: target && mode === "hold" ? holdProgress(state.hold, target, now, config.hold) : 0,
    // The model can't read J or Z, so any reading during them isn't "wrong".
    wrongReading: target && mode !== "motion" && state.reading && state.reading !== target ? state.reading : null,
    upcoming: [...word.slice(resolved.length + 1)],
    summary: summarize(wordsSoFar(state), state.activeMs),
  };
}
