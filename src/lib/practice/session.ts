// A practice session as a pure reducer. Time comes in with every event, so
// whole sessions can be replayed in tests without a camera.
//
// Forgiving rules: a letter passes when its handshape is held (hold.ts). J and
// Z pass on their motion instead, and the second of a double letter passes on
// a slide or bounce, or by releasing the handshape and forming it again. A
// wrong handshape never fails a letter; it's missed only when skipped or after
// `letterTimeoutMs` of active time. Active time pauses while no hand is in
// view, while the tab is hidden, and between words.

import type { MotionEvent } from "@/lib/motion/detector";
import { DEFAULT_HOLD_CONFIG, initialHoldState, stepHold, type HoldConfig, type HoldState } from "./hold";

/** Letters confirmed by motion rather than by holding a handshape. */
export const MOTION_LETTERS = new Set(["J", "Z"]);

export interface PracticeConfig {
  hold: HoldConfig;
  letterTimeoutMs: number;
  /** No hand for this long pauses the clock. */
  idleAfterMs: number;
  /** Pause after a finished word before the next appears. */
  wordPauseMs: number;
  /** Cap on one clock step, so a stalled tab can't add a huge chunk of time. */
  maxStepMs: number;
}

export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  hold: DEFAULT_HOLD_CONFIG,
  letterTimeoutMs: 8000,
  idleAfterMs: 1000,
  wordPauseMs: 700,
  maxStepMs: 250,
};

export interface LetterResult {
  letter: string;
  result: "pass" | "miss";
  /** Active time spent on this letter. */
  activeMs: number;
  /** The wrong letter read most while on this one, if any. */
  readAs: string | null;
  skipped?: boolean;
  /** How a passed letter was confirmed. Missing on sessions saved before it was recorded. */
  confirmedBy?: Confirmation;
}

/** "hold": a held handshape (for the second of a double, one released and formed again). */
export type Confirmation = "hold" | "slide" | "bounce" | "motion";

export interface WordResult {
  word: string;
  letters: LetterResult[];
  activeMs: number;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  endedAt: string;
  words: WordResult[];
  /** Played from a fixed ?words= list, so it doesn't count toward personal bests. */
  customWords?: true;
  /** The hold-to-confirm time it was played with. Missing on sessions from before 150 ms (they used 300). */
  holdMs?: number;
}

interface Playing {
  phase: "playing";
  id: string;
  customWords: boolean;
  startedAt: string;
  words: string[];
  wordIndex: number;
  done: WordResult[];
  /** Results so far in the current word. */
  current: LetterResult[];
  wordActiveMs: number;
  letterActiveMs: number;
  /** Active time each wrong letter was read during the current letter. */
  wrongMs: Record<string, number>;
  hold: HoldState;
  /** The latest accepted reading, or null. */
  reading: string | null;
  lastNow: number;
  lastHandAt: number;
  hidden: boolean;
  activeMs: number;
  /** Set while pausing between words. */
  wordDoneAt: number | null;
}

export type PracticeState = { phase: "ready" } | Playing | { phase: "done"; record: SessionRecord };

export type PracticeEvent =
  | { type: "start"; now: number; id: string; startedAt: string; words: string[]; customWords?: boolean }
  | { type: "reading"; now: number; letter: string | null; hand: boolean }
  | { type: "motion"; now: number; motion: MotionEvent }
  | { type: "tick"; now: number; hidden: boolean; isoNow: string }
  | { type: "skipLetter"; now: number }
  | { type: "replaceWord"; now: number; word: string }
  | { type: "reset" };

export const initialPracticeState: PracticeState = { phase: "ready" };

export function practiceReducer(
  state: PracticeState,
  event: PracticeEvent,
  config: PracticeConfig = DEFAULT_PRACTICE_CONFIG,
): PracticeState {
  if (event.type === "reset") return initialPracticeState;
  if (event.type === "start") {
    if (state.phase === "playing" || event.words.length === 0) return state;
    return {
      phase: "playing",
      id: event.id,
      customWords: event.customWords ?? false,
      startedAt: event.startedAt,
      words: event.words.map((w) => w.toUpperCase()),
      wordIndex: 0,
      done: [],
      current: [],
      wordActiveMs: 0,
      letterActiveMs: 0,
      wrongMs: {},
      hold: initialHoldState,
      reading: null,
      lastNow: event.now,
      lastHandAt: event.now,
      hidden: false,
      activeMs: 0,
      wordDoneAt: null,
    };
  }
  if (state.phase !== "playing") return state;

  switch (event.type) {
    case "reading": {
      let next = advanceClock(state, event.now, config);
      if (event.hand) next = { ...next, lastHandAt: event.now };
      if (next.wordDoneAt !== null) return { ...next, reading: event.letter };
      const { state: hold, held } = stepHold(next.hold, event.letter, event.now, config.hold);
      next = { ...next, hold, reading: event.letter };
      const target = targetLetter(next);
      if (held !== null && held === target && !MOTION_LETTERS.has(target)) return resolveLetter(next, "pass", event.now, { confirmedBy: "hold" });
      return next;
    }
    case "motion": {
      const next = advanceClock(state, event.now, config);
      if (next.wordDoneAt !== null) return next;
      const target = targetLetter(next);
      if (target === null) return next;
      const { motion } = event;
      const passes = MOTION_LETTERS.has(target)
        ? motion.kind === target
        : motion.kind === "double" && isRepeat(next);
      if (!passes) return next;
      return resolveLetter(next, "pass", event.now, { confirmedBy: motion.kind === "double" ? motion.style : "motion" });
    }
    case "tick": {
      const next = advanceClock({ ...state, hidden: event.hidden }, event.now, config);
      if (next.wordDoneAt !== null && event.now - next.wordDoneAt >= config.wordPauseMs) {
        return nextWord(next, event.isoNow, config.hold.holdMs);
      }
      return next;
    }
    case "skipLetter": {
      if (state.wordDoneAt !== null) return state;
      return resolveLetter(advanceClock(state, event.now, config), "miss", event.now, { skipped: true });
    }
    case "replaceWord": {
      if (state.wordDoneAt !== null) return state;
      const words = [...state.words];
      words[state.wordIndex] = event.word.toUpperCase();
      return { ...resetLetter(state), words, current: [], wordActiveMs: 0, lastNow: event.now };
    }
  }
}

export function targetLetter(state: Playing): string | null {
  return state.words[state.wordIndex]?.[state.current.length] ?? null;
}

/** Whether the target is the second of a double letter (e.g. the second O in BOOK). */
export function isRepeat(state: Playing): boolean {
  const target = targetLetter(state);
  return target !== null && state.current.length > 0 && state.words[state.wordIndex]?.[state.current.length - 1] === target;
}

function isActive(state: Playing, now: number, config: PracticeConfig): boolean {
  return !state.hidden && state.wordDoneAt === null && now - state.lastHandAt <= config.idleAfterMs;
}

/** Adds elapsed active time, then misses the letter if it has timed out. */
function advanceClock(state: Playing, now: number, config: PracticeConfig): Playing {
  const dt = Math.min(Math.max(0, now - state.lastNow), config.maxStepMs);
  if (!isActive(state, now, config) || dt === 0) return { ...state, lastNow: now };
  const wrong = state.reading !== null && state.reading !== targetLetter(state) ? state.reading : null;
  const next: Playing = {
    ...state,
    lastNow: now,
    activeMs: state.activeMs + dt,
    wordActiveMs: state.wordActiveMs + dt,
    letterActiveMs: state.letterActiveMs + dt,
    wrongMs: wrong ? { ...state.wrongMs, [wrong]: (state.wrongMs[wrong] ?? 0) + dt } : state.wrongMs,
  };
  return next.letterActiveMs >= config.letterTimeoutMs ? resolveLetter(next, "miss", now) : next;
}

function mostRead(wrongMs: Record<string, number>): string | null {
  let best: string | null = null;
  for (const [letter, ms] of Object.entries(wrongMs)) {
    if (best === null || ms > (wrongMs[best] ?? 0)) best = letter;
  }
  return best;
}

function resetLetter(state: Playing): Playing {
  return { ...state, letterActiveMs: 0, wrongMs: {}, hold: initialHoldState };
}

function resolveLetter(
  state: Playing,
  result: "pass" | "miss",
  now: number,
  { skipped = false, confirmedBy }: { skipped?: boolean; confirmedBy?: Confirmation } = {},
): Playing {
  const letter = targetLetter(state);
  if (letter === null) return state;
  const entry: LetterResult = { letter, result, activeMs: state.letterActiveMs, readAs: mostRead(state.wrongMs) };
  if (skipped) entry.skipped = true;
  if (confirmedBy) entry.confirmedBy = confirmedBy;
  const current = [...state.current, entry];
  const wordDone = current.length >= (state.words[state.wordIndex]?.length ?? 0);
  // Keep a completed hold "fired" so continuing to hold the same handshape
  // can't confirm the second of a double letter; it has to be released (or
  // slid/bounced) first.
  const hold = result === "pass" ? state.hold : initialHoldState;
  return { ...resetLetter(state), hold, current, wordDoneAt: wordDone ? now : null };
}

function nextWord(state: Playing, isoNow: string, holdMs: number): PracticeState {
  const word = state.words[state.wordIndex] ?? "";
  const done = [...state.done, { word, letters: state.current, activeMs: state.wordActiveMs }];
  if (state.wordIndex + 1 >= state.words.length) {
    const record: SessionRecord = { id: state.id, startedAt: state.startedAt, endedAt: isoNow, words: done, holdMs };
    if (state.customWords) record.customWords = true;
    return { phase: "done", record };
  }
  return {
    ...state,
    done,
    wordIndex: state.wordIndex + 1,
    current: [],
    wordActiveMs: 0,
    wordDoneAt: null,
    hold: initialHoldState,
    lastHandAt: state.lastNow,
  };
}

/** Words so far, including the one in progress, for live stats. */
export function wordsSoFar(state: Playing): WordResult[] {
  const word = state.words[state.wordIndex] ?? "";
  return state.current.length ? [...state.done, { word, letters: state.current, activeMs: state.wordActiveMs }] : state.done;
}
