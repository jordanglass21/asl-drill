// Handshape checks from finger geometry, for the motion letters. The letter
// model doesn't know J or Z, so these gate the motion detectors instead.

import { normalizeLandmarks } from "@/lib/landmarks/normalize";
import type { HandSide, Landmark } from "@/lib/hands/handedness";

/** [PIP, TIP] landmark indices per finger. */
const FINGERS = { index: [6, 8], middle: [10, 12], ring: [14, 16], pinky: [18, 20] } as const;
type Finger = keyof typeof FINGERS;

/** Tip/PIP distance-from-wrist ratio: ~1.3 when straight, under 1 when curled. */
export const EXTENDED_RATIO = 1.1;
export const CURLED_RATIO = 1.0;
/** Thumb tip within this distance (hand units) of the middle PIP counts as tucked. */
export const THUMB_TUCKED = 0.7;

export interface HandShape {
  extension: Record<Finger, number>;
  thumbToMiddle: number;
}

const dist = (p: number[], a: number, b?: number) => {
  const [ax, ay, az] = [p[a * 3] ?? 0, p[a * 3 + 1] ?? 0, p[a * 3 + 2] ?? 0];
  if (b === undefined) return Math.hypot(ax, ay, az);
  return Math.hypot(ax - (p[b * 3] ?? 0), ay - (p[b * 3 + 1] ?? 0), az - (p[b * 3 + 2] ?? 0));
};

/** Measures a hand from normalized features (wrist at the origin, unit hand size). */
export function measureShape(features: readonly number[]): HandShape {
  const p = [...features];
  const extension = {} as Record<Finger, number>;
  for (const [name, [pip, tip]] of Object.entries(FINGERS) as [Finger, readonly [number, number]][]) {
    const pipDistance = dist(p, pip);
    extension[name] = pipDistance > 0 ? dist(p, tip) / pipDistance : 0;
  }
  return { extension, thumbToMiddle: dist(p, 4, 10) };
}

/** Shape of a raw hand, or null if it can't be normalized. */
export function shapeOf(landmarks: readonly Landmark[], side: HandSide, aspectRatio: number): HandShape | null {
  const features = normalizeLandmarks(landmarks, side, aspectRatio);
  return features ? measureShape(features) : null;
}

const only = (shape: HandShape, finger: Finger) =>
  (Object.keys(FINGERS) as Finger[]).every((f) =>
    f === finger ? shape.extension[f] >= EXTENDED_RATIO : shape.extension[f] <= CURLED_RATIO,
  );

/** J's handshape (I): only the pinky up, thumb tucked (which rules out Y). */
export const isJShape = (shape: HandShape) => only(shape, "pinky") && shape.thumbToMiddle < THUMB_TUCKED;

/**
 * Z's handshape: the index pointing. The middle finger only has to be short of
 * straight, since it tends to open a little mid-stroke; a straight middle
 * finger (U, V, R) still doesn't count.
 */
export const isZShape = ({ extension }: HandShape) =>
  extension.index >= EXTENDED_RATIO &&
  extension.middle < EXTENDED_RATIO &&
  extension.ring <= CURLED_RATIO &&
  extension.pinky <= CURLED_RATIO;
