// Geometry for drawing hand landmarks over the camera preview.

import type { Landmark } from "./handedness";

/** MediaPipe's 21-point hand skeleton, as [from, to] landmark index pairs. */
export const HAND_CONNECTIONS: readonly (readonly [number, number])[] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
];

export interface Point {
  x: number;
  y: number;
}

/**
 * Converts a normalized landmark (0–1, relative to the raw camera frame) to
 * canvas pixels. With `mirrored`, x is flipped to line up with a mirrored
 * (selfie-style) preview.
 */
export function toCanvasPoint(landmark: Landmark, width: number, height: number, mirrored: boolean): Point {
  const x = mirrored ? 1 - landmark.x : landmark.x;
  return { x: x * width, y: landmark.y * height };
}

export interface HandSegments {
  points: Point[];
  lines: [Point, Point][];
}

/** Projects one hand into the points and skeleton lines to draw. */
export function handSegments(landmarks: Landmark[], width: number, height: number, mirrored: boolean): HandSegments {
  const points = landmarks.map((lm) => toCanvasPoint(lm, width, height, mirrored));
  const lines: [Point, Point][] = [];
  for (const [from, to] of HAND_CONNECTIONS) {
    const a = points[from];
    const b = points[to];
    if (a && b) lines.push([a, b]);
  }
  return { points, lines };
}
