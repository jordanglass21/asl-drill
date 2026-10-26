// What the play screen shows for a session state.

import type { FlapState } from "@/lib/board/flap";
import { holdProgress } from "./hold";
import { DEFAULT_PRACTICE_CONFIG, targetLetter, wordsSoFar, type PracticeConfig, type PracticeState } from "./session";
import { summarize, type SessionSummary } from "./stats";

export interface BoardView {
  word: string;
  wordNumber: number;
  wordCount: number;
  tiles: { char: string; state: FlapState }[];
  target: string | null;
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
  return {
    word,
    wordNumber: state.wordIndex + 1,
    wordCount: state.words.length,
    tiles,
    target,
    hold: target ? holdProgress(state.hold, target, now, config.hold) : 0,
    wrongReading: target && state.reading && state.reading !== target ? state.reading : null,
    upcoming: [...word.slice(resolved.length + 1)],
    summary: summarize(wordsSoFar(state), state.activeMs),
  };
}
