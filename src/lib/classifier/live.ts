// Turns a tracked hand into a letter prediction for the live readout.

import type { DetectedHand } from "@/lib/hands/handedness";
import { normalizeLandmarks } from "@/lib/landmarks/normalize";
import { predictProbabilities, topLetter, type LetterModel } from "./model";

/** Versioned like the MediaPipe assets: replace the file under a new name. */
export const LETTER_MODEL_PATH = "/models/letters-v3.json";

export interface LiveReading {
  /** Accepted letter, or null below the confidence threshold. */
  letter: string | null;
  /** The best guess and its probability, even when below the threshold. */
  best: string;
  confidence: number;
}

export function readHand(
  model: LetterModel,
  hand: DetectedHand,
  frameWidth: number,
  frameHeight: number,
): LiveReading | null {
  if (!(frameWidth > 0 && frameHeight > 0)) return null;
  const features = normalizeLandmarks(hand.landmarks, hand.side, frameWidth / frameHeight);
  if (!features) return null;
  const probabilities = predictProbabilities(model, features);
  const best = topLetter(model, probabilities, 0);
  if (!best) return null;
  const accepted = topLetter(model, probabilities);
  return { letter: accepted?.letter ?? null, best: best.letter, confidence: best.confidence };
}

/** Whether the on-screen readout should change, so React doesn't re-render every frame. */
export function readingChanged(prev: LiveReading | null, next: LiveReading | null, step = 0.05): boolean {
  if (prev === null || next === null) return prev !== next;
  return prev.letter !== next.letter || prev.best !== next.best || Math.abs(prev.confidence - next.confidence) >= step;
}
