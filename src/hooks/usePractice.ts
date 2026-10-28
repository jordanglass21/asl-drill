"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { readHand } from "@/lib/classifier/live";
import type { LetterModel } from "@/lib/classifier/model";
import { initialMotionState, stepMotion, type MotionState } from "@/lib/motion/detector";
import { initialPracticeState, practiceReducer, type PracticeEvent, type PracticeState } from "@/lib/practice/session";
import { saveBests } from "@/lib/practice/records";
import { loadSessions, saveSession } from "@/lib/practice/storage";
import { boardView } from "@/lib/practice/view";
import { pickWords, playableWords } from "@/lib/practice/words";
import type { TrackedFrame } from "./useHandTracking";

export const WORDS_PER_SESSION = 10;
const TICK_MS = 100;

const reducer = (state: PracticeState, event: PracticeEvent) => practiceReducer(state, event);

function localStorageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Runs a practice session: feeds each tracked frame's reading and any J, Z, or
 * double-letter motion to the session reducer, ticks the clock, handles keys (enter start, esc skip letter, tab
 * new word), and saves the session then opens its results when it ends.
 */
export function usePractice({
  model,
  canStart,
  words,
}: {
  model: LetterModel | null;
  canStart: () => boolean;
  /** Fixed words to play (e.g. from ?words=); otherwise random ones. */
  words?: string[] | null;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialPracticeState);
  const [now, setNow] = useState(0);
  const modelRef = useRef(model);
  const motionRef = useRef<MotionState>(initialMotionState);
  const playingRef = useRef(false);
  const playing = state.phase === "playing";

  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const onFrame = useCallback((frame: TrackedFrame) => {
    const loaded = modelRef.current;
    if (!playingRef.current || !loaded) return;
    const reading = frame.hand ? readHand(loaded, frame.hand, frame.width, frame.height) : null;
    dispatch({ type: "reading", now: frame.now, letter: reading?.letter ?? null, hand: frame.hand !== null });
    const motion = stepMotion(
      motionRef.current,
      frame.hand && frame.height > 0
        ? { t: frame.now, landmarks: frame.hand.landmarks, side: frame.hand.side, aspectRatio: frame.width / frame.height }
        : null,
    );
    motionRef.current = motion.state;
    for (const event of motion.events) dispatch({ type: "motion", now: frame.now, motion: event });
  }, []);

  const start = useCallback(() => {
    if (!canStart()) return;
    motionRef.current = initialMotionState;
    dispatch({
      type: "start",
      now: performance.now(),
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      words: words ?? pickWords(playableWords(), WORDS_PER_SESSION),
      customWords: !!words,
    });
  }, [canStart, words]);

  const skipLetter = useCallback(() => dispatch({ type: "skipLetter", now: performance.now() }), []);

  const wordsRef = useRef<string[]>([]);
  useEffect(() => {
    wordsRef.current = state.phase === "playing" ? state.words : [];
  }, [state]);
  const newWord = useCallback(() => {
    const [word] = pickWords(playableWords(), 1, Math.random, wordsRef.current);
    if (word) dispatch({ type: "replaceWord", now: performance.now(), word });
  }, []);

  // Clock: drives timeouts, pauses, and the pause between words.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      dispatch({ type: "tick", now: t, hidden: document.visibilityState === "hidden", isoNow: new Date().toISOString() });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [playing]);

  // Next keeps a visited page mounted but hidden (Activity) and re-runs its
  // effects when it's shown again. Start over each time /play is left, or the
  // finished session would reopen its results as soon as the player comes back.
  useLayoutEffect(
    () => () => {
      motionRef.current = initialMotionState;
      dispatch({ type: "reset" });
    },
    [],
  );

  // Save and show results when the session ends.
  useEffect(() => {
    if (state.phase !== "done") return;
    const storage = localStorageOrUndefined();
    saveSession(storage, state.record);
    saveBests(storage, loadSessions(storage));
    router.push(`/results?id=${encodeURIComponent(state.record.id)}`);
  }, [state, router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [role=radiogroup]")) return;
      if (event.key === "Enter" && !playingRef.current) {
        event.preventDefault();
        start();
      } else if (event.key === "Escape" && playingRef.current) {
        skipLetter();
      } else if (event.key === "Tab" && playingRef.current) {
        event.preventDefault();
        newWord();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [start, skipLetter, newWord]);

  return { phase: state.phase, view: boardView(state, now), onFrame, start, skipLetter, newWord };
}
