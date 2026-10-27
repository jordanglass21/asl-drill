// Motion detection for J, Z, and double letters over a rolling buffer of the
// signing hand. Pure: feed it one sample per frame and it returns events.
//
// Positions are aspect-corrected image coordinates, mirrored for left hands so
// every signer looks right-handed, and measured in hand sizes (wrist to
// middle knuckle) so distance from the camera doesn't matter.

import type { HandSide, Landmark } from "@/lib/hands/handedness";
import { normalizeLandmarks } from "@/lib/landmarks/normalize";
import { isJShape, isZShape, measureShape } from "./shape";

export interface MotionSample {
  /** Milliseconds, monotonic. */
  t: number;
  landmarks: readonly Landmark[];
  side: HandSide;
  aspectRatio: number;
}

export type MotionEvent = { kind: "J" } | { kind: "Z" } | { kind: "double"; style: "slide" | "bounce" };

export interface MotionConfig {
  bufferMs: number;
  /** J: window, share of frames in the J handshape, and pinky-tip travel (hand sizes). */
  jWindowMs: number;
  jShapeShare: number;
  jMinDown: number;
  jMinAcross: number;
  jMinPath: number;
  /** Z: window, share of frames pointing, index-tip direction reversals, stroke size, travel. */
  zWindowMs: number;
  zShapeShare: number;
  zMinReversals: number;
  zStroke: number;
  zMinPath: number;
  /**
   * Double: window, how steady the handshape must stay (RMS change of the
   * normalized features), sideways slide, and bounce size and count. Uses
   * handshape steadiness rather than the letter model, which misreads some
   * letters mid-slide (T as M).
   */
  doubleWindowMs: number;
  doubleMaxShapeChange: number;
  doubleMinSlide: number;
  bounceAmplitude: number;
  bounceMinReversals: number;
  /** Quiet time after an event before the same kind can fire again. */
  refractoryMs: number;
}

export const DEFAULT_MOTION_CONFIG: MotionConfig = {
  bufferMs: 2200,
  jWindowMs: 1300,
  jShapeShare: 0.6,
  jMinDown: 0.8,
  jMinAcross: 0.8,
  jMinPath: 2.0,
  zWindowMs: 2200,
  zShapeShare: 0.6,
  zMinReversals: 2,
  zStroke: 0.6,
  zMinPath: 3.0,
  doubleWindowMs: 1200,
  doubleMaxShapeChange: 0.06,
  doubleMinSlide: 0.5,
  bounceAmplitude: 0.15,
  bounceMinReversals: 2,
  refractoryMs: 800,
};

interface Point {
  t: number;
  wrist: [number, number];
  indexTip: [number, number];
  pinkyTip: [number, number];
  scale: number;
  jShape: boolean;
  zShape: boolean;
  features: number[];
}

export interface MotionState {
  points: Point[];
  lastFired: Partial<Record<MotionEvent["kind"], number>>;
}

export const initialMotionState: MotionState = { points: [], lastFired: {} };

function toPoint(sample: MotionSample): Point | null {
  const { landmarks, side, aspectRatio } = sample;
  const at = (i: number): [number, number] | null => {
    const lm = landmarks[i];
    if (!lm) return null;
    const x = lm.x * aspectRatio;
    return [side === "left" ? -x : x, lm.y];
  };
  const wrist = at(0);
  const knuckle = at(9);
  const indexTip = at(8);
  const pinkyTip = at(20);
  const features = normalizeLandmarks(landmarks, side, aspectRatio);
  if (!wrist || !knuckle || !indexTip || !pinkyTip || !features) return null;
  const scale = Math.hypot(knuckle[0] - wrist[0], knuckle[1] - wrist[1]);
  if (!(scale > 0)) return null;
  const shape = measureShape(features);
  return { t: sample.t, wrist, indexTip, pinkyTip, scale, jShape: isJShape(shape), zShape: isZShape(shape), features };
}

/**
 * Counts direction reversals, ignoring wiggles smaller than `amplitude`
 * (hysteresis). Right-left-right is two reversals, as is down-up-down.
 */
export function countReversals(values: readonly number[], amplitude: number): number {
  const first = values[0] ?? 0;
  let reversals = 0;
  let direction = 0;
  let high = first;
  let low = first;
  let extreme = first;
  for (const v of values.slice(1)) {
    if (direction === 0) {
      high = Math.max(high, v);
      low = Math.min(low, v);
      if (v - low >= amplitude) [direction, extreme] = [1, v];
      else if (high - v >= amplitude) [direction, extreme] = [-1, v];
    } else if (direction === 1) {
      if (v > extreme) extreme = v;
      else if (extreme - v >= amplitude) [reversals, direction, extreme] = [reversals + 1, -1, v];
    } else if (v < extreme) {
      extreme = v;
    } else if (v - extreme >= amplitude) {
      [reversals, direction, extreme] = [reversals + 1, 1, v];
    }
  }
  return reversals;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

interface Track {
  xs: number[];
  ys: number[];
  path: number;
}

function track(points: Point[], pick: (p: Point) => [number, number]): Track {
  const scale = median(points.map((p) => p.scale)) || 1;
  const xs = points.map((p) => pick(p)[0] / scale);
  const ys = points.map((p) => pick(p)[1] / scale);
  let path = 0;
  for (let i = 1; i < xs.length; i++) path += Math.hypot((xs[i] ?? 0) - (xs[i - 1] ?? 0), (ys[i] ?? 0) - (ys[i - 1] ?? 0));
  return { xs, ys, path };
}

const extent = (values: number[]) => (values.length ? Math.max(...values) - Math.min(...values) : 0);
const share = (points: Point[], test: (p: Point) => boolean) =>
  points.length ? points.filter(test).length / points.length : 0;
const within = (points: Point[], now: number, ms: number) => points.filter((p) => now - p.t <= ms);

/**
 * J: an I hand whose pinky tip travels down and hooks sideways. Only frames in
 * the I shape count toward the trace, and the hand must still be in it at the
 * end, so moving from I into the next letter isn't mistaken for a J.
 */
export function detectJ(points: Point[], now: number, config: MotionConfig): boolean {
  const window = within(points, now, config.jWindowMs);
  if (window.length < 8 || !window.at(-1)?.jShape || share(window, (p) => p.jShape) < config.jShapeShare) return false;
  const tip = track(
    window.filter((p) => p.jShape),
    (p) => p.pinkyTip,
  );
  const start = tip.ys[0] ?? 0;
  const down = Math.max(...tip.ys) - start;
  return down >= config.jMinDown && extent(tip.xs) >= config.jMinAcross && tip.path >= config.jMinPath;
}

/** Z: a pointing hand whose index tip draws three strokes (two sideways reversals). */
export function detectZ(points: Point[], now: number, config: MotionConfig): boolean {
  const window = within(points, now, config.zWindowMs);
  if (window.length < 10 || share(window, (p) => p.zShape) < config.zShapeShare) return false;
  const tip = track(
    window.filter((p) => p.zShape),
    (p) => p.indexTip,
  );
  return countReversals(tip.xs, config.zStroke) >= config.zMinReversals && tip.path >= config.zMinPath;
}

/** RMS change of the normalized handshape across the window: small when the shape is held. */
export function shapeChange(points: readonly { features: number[] }[]): number {
  if (points.length === 0) return 0;
  const size = points[0]?.features.length ?? 0;
  const mean = new Array<number>(size).fill(0);
  for (const p of points) p.features.forEach((v, i) => (mean[i] = (mean[i] ?? 0) + v / points.length));
  let total = 0;
  for (const p of points) p.features.forEach((v, i) => (total += (v - (mean[i] ?? 0)) ** 2));
  return Math.sqrt(total / (points.length * 21));
}

/** Double: a steady handshape while the wrist bounces or slides sideways. */
export function detectDouble(points: Point[], now: number, config: MotionConfig): "slide" | "bounce" | null {
  const window = within(points, now, config.doubleWindowMs);
  if (window.length < 10 || shapeChange(window) > config.doubleMaxShapeChange) return null;
  const wrist = track(window, (p) => p.wrist);
  if (countReversals(wrist.ys, config.bounceAmplitude) >= config.bounceMinReversals) return "bounce";
  if (Math.abs((wrist.xs.at(-1) ?? 0) - (wrist.xs[0] ?? 0)) >= config.doubleMinSlide) return "slide";
  return null;
}

/** Adds one frame and returns any motion completed by it. */
export function stepMotion(
  state: MotionState,
  sample: MotionSample | null,
  config: MotionConfig = DEFAULT_MOTION_CONFIG,
): { state: MotionState; events: MotionEvent[] } {
  const point = sample ? toPoint(sample) : null;
  if (!point) return { state, events: [] };
  const now = point.t;
  let points = [...state.points.filter((p) => now - p.t <= config.bufferMs), point];
  const lastFired = { ...state.lastFired };
  const events: MotionEvent[] = [];
  const ready = (kind: MotionEvent["kind"]) => now - (lastFired[kind] ?? -Infinity) >= config.refractoryMs;

  if (ready("J") && detectJ(points, now, config)) events.push({ kind: "J" });
  if (ready("Z") && detectZ(points, now, config)) events.push({ kind: "Z" });
  if (ready("double")) {
    const style = detectDouble(points, now, config);
    if (style) events.push({ kind: "double", style });
  }
  for (const event of events) lastFired[event.kind] = now;
  // A finished J or Z shouldn't be counted again, so drop the frames it used.
  if (events.some((e) => e.kind === "J" || e.kind === "Z")) points = [point];
  return { state: { points, lastFired }, events };
}
