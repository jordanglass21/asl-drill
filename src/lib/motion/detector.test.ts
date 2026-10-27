import fixture from "../../../fixtures/motion/takes.json";
import type { HandSide } from "@/lib/hands/handedness";
import {
  countReversals,
  DEFAULT_MOTION_CONFIG,
  initialMotionState,
  stepMotion,
  type MotionEvent,
  type MotionState,
} from "./detector";

describe("countReversals", () => {
  it("counts a Z-like right-left-right as two reversals", () => {
    expect(countReversals([0, 1, 2, 1, 0, 1, 2], 0.6)).toBe(2);
  });

  it("counts the first move in either direction", () => {
    expect(countReversals([0, -1, 0], 0.6)).toBe(1);
    expect(countReversals([0, 1, 0], 0.6)).toBe(1);
  });

  it("ignores wiggles smaller than the amplitude", () => {
    expect(countReversals([0, 0.2, 0, 0.2, 0, 0.2], 0.6)).toBe(0);
    expect(countReversals([0, 1, 0.8, 1.6, 1.4, 2], 0.6)).toBe(0);
  });

  it("handles empty and flat input", () => {
    expect(countReversals([], 0.5)).toBe(0);
    expect(countReversals([1, 1, 1], 0.5)).toBe(0);
  });
});


// A real static Y take, moved synthetically: in-place bounces, slides, holds.
const yTake = fixture.takes.find((t) => t.label === "Y");
const base = (yTake?.frames[0]?.landmarks ?? []).map(([x = 0, y = 0, z = 0]) => ({ x, y, z }));
const handSize = Math.hypot(((base[9]?.x ?? 0) - (base[0]?.x ?? 0)) * (16 / 9), (base[9]?.y ?? 0) - (base[0]?.y ?? 0));

function replay(offset: (t: number) => [number, number], ms = 1600, side: HandSide = "right"): MotionEvent[] {
  let state: MotionState = initialMotionState;
  const events: MotionEvent[] = [];
  for (let t = 0; t <= ms; t += 33) {
    const [dx, dy] = offset(t);
    const landmarks = base.map((p) => ({ x: p.x + (dx * handSize) / (16 / 9), y: p.y + dy * handSize, z: p.z }));
    const step = stepMotion(state, { t, landmarks, side, aspectRatio: 16 / 9 });
    state = step.state;
    events.push(...step.events);
  }
  return events;
}

describe("stepMotion (synthetic)", () => {
  it("detects a pure in-place bounce", () => {
    const events = replay((t) => [0, 0.3 * Math.sin((t / 1000) * 2 * Math.PI * 2.5)]);
    expect(events).toContainEqual({ kind: "double", style: "bounce" });
  });

  it("detects a sideways slide", () => {
    const events = replay((t) => [-Math.min(t, 600) / 600, 0]);
    expect(events).toContainEqual({ kind: "double", style: "slide" });
  });

  it("works the same for a left hand", () => {
    const events = replay((t) => [Math.min(t, 600) / 600, 0], 1600, "left");
    expect(events).toContainEqual({ kind: "double", style: "slide" });
  });

  it("ignores a steady hold with tracking jitter", () => {
    expect(replay((t) => [0.02 * Math.sin(t), 0.02 * Math.cos(t * 1.3)])).toEqual([]);
  });

  it("fires once per gesture, then waits out the refractory period", () => {
    const events = replay((t) => [-Math.min(t, 600) / 600, 0], 700);
    expect(events.filter((e) => e.kind === "double")).toHaveLength(1);
    expect(DEFAULT_MOTION_CONFIG.refractoryMs).toBeGreaterThan(0);
  });

  it("never treats a still pinky-up hand as J", () => {
    const ITake = fixture.takes.find((t) => t.label === "I");
    let state: MotionState = initialMotionState;
    for (const f of ITake?.frames ?? []) {
      const landmarks = f.landmarks.map(([x = 0, y = 0, z = 0]) => ({ x, y, z }));
      const step = stepMotion(state, { t: f.t, landmarks, side: f.side as HandSide, aspectRatio: 16 / 9 });
      state = step.state;
      expect(step.events).toEqual([]);
    }
  });

  it("skips frames it can't measure", () => {
    expect(stepMotion(initialMotionState, null).events).toEqual([]);
    expect(stepMotion(initialMotionState, { t: 0, landmarks: [], side: "right", aspectRatio: 1 }).events).toEqual([]);
  });
});
