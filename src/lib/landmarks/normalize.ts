// Landmark normalization. Must match training/asl_drill/normalize.py exactly;
// both are tested against the shared cases in fixtures/normalization/.

import type { HandSide, Landmark } from "@/lib/hands/handedness";

/** Bump (in both languages) whenever the output changes; models record it. */
export const NORMALIZATION_VERSION = 1;
export const LANDMARK_COUNT = 21;
export const FEATURE_COUNT = LANDMARK_COUNT * 3;
const WRIST = 0;
const MIDDLE_MCP = 9;
/**
 * Below this wrist-to-knuckle distance the hand is degenerate (collapsed or
 * far too small to read), so no features are produced.
 */
export const MIN_HAND_SCALE = 1e-3;

/**
 * Turns 21 MediaPipe landmarks into 63 classifier features.
 *
 * 1. Scale x and z by the frame's aspect ratio (width / height) so all axes
 *    share y's units. MediaPipe normalizes x by width, y by height, and z
 *    roughly like x.
 * 2. Translate so the wrist is the origin.
 * 3. Mirror x for a left hand, so the classifier always sees a right hand.
 * 4. Divide by the 3D wrist-to-middle-knuckle distance.
 *
 * Rotation is deliberately kept: some letters (K/P, G/Q, H/U) differ mainly in
 * orientation. Returns null for unusable input.
 */
export function normalizeLandmarks(
  landmarks: readonly Landmark[],
  side: HandSide,
  aspectRatio: number,
): number[] | null {
  if (landmarks.length !== LANDMARK_COUNT || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return null;
  if (side !== "left" && side !== "right") return null;
  if (!landmarks.every((lm) => Number.isFinite(lm.x) && Number.isFinite(lm.y) && Number.isFinite(lm.z))) {
    return null;
  }

  const wrist = landmarks[WRIST];
  const knuckle = landmarks[MIDDLE_MCP];
  if (!wrist || !knuckle) return null;

  const scale = Math.hypot(
    (knuckle.x - wrist.x) * aspectRatio,
    knuckle.y - wrist.y,
    (knuckle.z - wrist.z) * aspectRatio,
  );
  if (!(scale >= MIN_HAND_SCALE)) return null;

  const mirror = side === "left" ? -1 : 1;
  const features: number[] = [];
  for (const lm of landmarks) {
    features.push(
      (mirror * (lm.x - wrist.x) * aspectRatio) / scale,
      (lm.y - wrist.y) / scale,
      ((lm.z - wrist.z) * aspectRatio) / scale,
    );
  }
  return features;
}
