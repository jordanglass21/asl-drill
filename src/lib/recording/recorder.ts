// The /record capture flow as a pure reducer. Time is passed in with each
// event, so the flow can be tested without timers or a camera.

import type { HandednessSetting, HandSide, Landmark } from "@/lib/hands/handedness";
import type { RecordedFrame, Take, TakeKind } from "./format";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export interface RecorderConfig {
  countdownMs: number;
  /** Capture length for a single letter. */
  captureMs: number;
  doubleCaptureMs: number;
  /** Word takes last wordBaseMs + wordLetterMs per letter, up to wordMaxMs. */
  wordBaseMs: number;
  wordLetterMs: number;
  wordMaxMs: number;
  /** Takes with fewer frames containing a hand are discarded. */
  minFrames: number;
}

export const DEFAULT_RECORDER_CONFIG: RecorderConfig = {
  countdownMs: 3000,
  captureMs: 2000,
  doubleCaptureMs: 2500,
  wordBaseMs: 1500,
  wordLetterMs: 700,
  wordMaxMs: 6000,
  minFrames: 10,
};

/** Words for word mode: 2–8 letters. */
export const WORD_PATTERN = /^[A-Z]{2,8}$/;

export function captureMsFor(kind: TakeKind, label: string, config: RecorderConfig = DEFAULT_RECORDER_CONFIG): number {
  if (kind === "letter") return config.captureMs;
  if (kind === "double") return config.doubleCaptureMs;
  return Math.min(config.wordMaxMs, config.wordBaseMs + config.wordLetterMs * label.length);
}

export type RecorderPhase =
  | { kind: "idle" }
  | { kind: "countdown"; until: number; take: Omit<Take, "frames" | "camera"> }
  | { kind: "capturing"; startedAt: number; until: number; take: Omit<Take, "frames" | "camera">; camera: Take["camera"] | null; frames: RecordedFrame[] };

export interface RecorderState {
  /** The selected label: a letter, a double ("OO"), or a word. */
  letter: string | null;
  kind: TakeKind;
  phase: RecorderPhase;
  takes: Take[];
  /** True when there are changes since the last export. */
  unsaved: boolean;
  notice: string | null;
}

export interface FrameSample {
  side: HandSide;
  label: string;
  score: number;
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  camera: { width: number; height: number };
}

export type RecorderEvent =
  | { type: "selectLetter"; letter: string; double?: boolean }
  | { type: "selectWord"; word: string }
  | { type: "start"; now: number; id: string; startedAt: string; handednessSetting: HandednessSetting }
  | { type: "tick"; now: number }
  | { type: "frame"; now: number; sample: FrameSample }
  | { type: "cancel" }
  | { type: "deleteLastTake" }
  | { type: "exported" };

export const initialRecorderState: RecorderState = {
  letter: null,
  kind: "letter",
  phase: { kind: "idle" },
  takes: [],
  unsaved: false,
  notice: null,
};

export function recorderReducer(
  state: RecorderState,
  event: RecorderEvent,
  config: RecorderConfig = DEFAULT_RECORDER_CONFIG,
): RecorderState {
  const { phase } = state;
  switch (event.type) {
    case "selectLetter": {
      const letter = event.letter.toUpperCase();
      if (phase.kind !== "idle" || !LETTERS.includes(letter)) return state;
      return event.double
        ? { ...state, letter: letter + letter, kind: "double", notice: null }
        : { ...state, letter, kind: "letter", notice: null };
    }

    case "selectWord": {
      const word = event.word.trim().toUpperCase();
      if (phase.kind !== "idle" || !WORD_PATTERN.test(word)) return state;
      return { ...state, letter: word, kind: "word", notice: null };
    }

    case "start":
      if (phase.kind !== "idle" || !state.letter) return state;
      return {
        ...state,
        notice: null,
        phase: {
          kind: "countdown",
          until: event.now + config.countdownMs,
          take: {
            id: event.id,
            letter: state.letter,
            kind: state.kind,
            startedAt: event.startedAt,
            handednessSetting: event.handednessSetting,
          },
        },
      };

    case "tick":
      if (phase.kind === "countdown" && event.now >= phase.until) {
        return {
          ...state,
          phase: {
            kind: "capturing",
            startedAt: phase.until,
            until: phase.until + captureMsFor(phase.take.kind ?? "letter", phase.take.letter, config),
            take: phase.take,
            camera: null,
            frames: [],
          },
        };
      }
      if (phase.kind === "capturing" && event.now >= phase.until) return finishTake(state, phase, config);
      return state;

    case "frame": {
      if (phase.kind !== "capturing" || event.now < phase.startedAt) return state;
      if (event.now >= phase.until) return finishTake(state, phase, config);
      const { sample } = event;
      const frame: RecordedFrame = {
        t: event.now - phase.startedAt,
        side: sample.side,
        handednessLabel: sample.label,
        handednessScore: sample.score,
        landmarks: sample.landmarks,
        worldLandmarks: sample.worldLandmarks,
      };
      return {
        ...state,
        phase: { ...phase, camera: phase.camera ?? sample.camera, frames: [...phase.frames, frame] },
      };
    }

    case "cancel":
      return phase.kind === "idle" ? state : { ...state, phase: { kind: "idle" }, notice: "Take cancelled." };

    case "deleteLastTake": {
      const last = state.takes.at(-1);
      if (phase.kind !== "idle" || !last) return state;
      return { ...state, takes: state.takes.slice(0, -1), unsaved: true, notice: `Deleted the last ${last.letter} take.` };
    }

    case "exported":
      return { ...state, unsaved: false, notice: "Exported." };
  }
}

function finishTake(
  state: RecorderState,
  phase: Extract<RecorderPhase, { kind: "capturing" }>,
  config: RecorderConfig,
): RecorderState {
  if (phase.frames.length < config.minFrames || !phase.camera) {
    return {
      ...state,
      phase: { kind: "idle" },
      notice: `Only ${phase.frames.length} frames had a hand, so the take was discarded. Keep your hand in view.`,
    };
  }
  const take: Take = { ...phase.take, camera: phase.camera, frames: phase.frames };
  return {
    ...state,
    phase: { kind: "idle" },
    takes: [...state.takes, take],
    unsaved: true,
    notice: `Saved ${take.kind === "word" ? `"${take.letter}"` : take.letter} take with ${take.frames.length} frames.`,
  };
}

/** Takes and frames recorded per label (letter, double, or word), for progress displays. */
export function countByLetter(takes: readonly Take[]): Record<string, { takes: number; frames: number }> {
  const counts: Record<string, { takes: number; frames: number }> = {};
  for (const take of takes) {
    const entry = (counts[take.letter] ??= { takes: 0, frames: 0 });
    entry.takes += 1;
    entry.frames += take.frames.length;
  }
  return counts;
}
