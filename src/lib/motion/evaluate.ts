// Replays recorded takes through the letter model and the motion detector,
// for the motion report and the fixture tests.

import type { HandSide, Landmark } from "@/lib/hands/handedness";
import { DEFAULT_MOTION_CONFIG, initialMotionState, stepMotion, type MotionConfig, type MotionEvent } from "./detector";

export interface EvalFrame {
  t: number;
  side: HandSide;
  landmarks: Landmark[];
}

export interface EvalTake {
  id: string;
  label: string;
  kind: "letter" | "double" | "word";
  camera: { width: number; height: number };
  frames: EvalFrame[];
}

export type Expectation = "J" | "Z" | "double" | "none";

/** What a take should trigger: J/Z takes their motion, doubles a double, everything else nothing. */
export function expectationFor(take: Pick<EvalTake, "label" | "kind">): Expectation {
  if (take.kind === "double") return "double";
  if (take.kind === "letter" && (take.label === "J" || take.label === "Z")) return take.label;
  return "none";
}

export interface TakeResult {
  take: EvalTake;
  expected: Expectation;
  events: (MotionEvent & { t: number })[];
}

export function replayTake(take: EvalTake, config: MotionConfig = DEFAULT_MOTION_CONFIG): TakeResult {
  let state = initialMotionState;
  const events: TakeResult["events"] = [];
  const aspectRatio = take.camera.width / take.camera.height;
  for (const frame of take.frames) {
    const step = stepMotion(state, { t: frame.t, landmarks: frame.landmarks, side: frame.side, aspectRatio }, config);
    state = step.state;
    for (const event of step.events) events.push({ ...event, t: frame.t });
  }
  return { take, expected: expectationFor(take), events };
}

/** J/Z hits need the right motion; double hits need a double motion. */
export function isHit(result: TakeResult): boolean {
  const { expected, events } = result;
  if (expected === "J" || expected === "Z") return events.some((e) => e.kind === expected);
  if (expected === "double") return events.some((e) => e.kind === "double");
  return false;
}

/** A J or Z where none was signed. (Stray doubles are reported separately: they only matter on double letters.) */
export function falseMotion(result: TakeResult): MotionEvent[] {
  return result.events.filter((e) => (e.kind === "J" || e.kind === "Z") && e.kind !== result.expected);
}

export interface MotionSummary {
  rows: { group: string; takes: number; hits: number; falseMotion: number; strayDoubles: number }[];
}

export function summarizeMotion(results: TakeResult[]): MotionSummary {
  const groups = new Map<string, TakeResult[]>();
  for (const r of results) {
    const group = r.expected === "none" ? (r.take.kind === "word" ? "words" : "static letters") : r.expected === "double" ? "doubles" : r.expected;
    groups.set(group, [...(groups.get(group) ?? []), r]);
  }
  const order = ["J", "Z", "doubles", "words", "static letters"];
  return {
    rows: order
      .filter((g) => groups.has(g))
      .map((group) => {
        const rs = groups.get(group) ?? [];
        return {
          group,
          takes: rs.length,
          hits: rs.filter(isHit).length,
          falseMotion: rs.filter((r) => falseMotion(r).length > 0).length,
          strayDoubles: rs.filter((r) => r.expected !== "double" && r.events.some((e) => e.kind === "double")).length,
        };
      }),
  };
}
