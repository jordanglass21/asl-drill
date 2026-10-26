import { holdProgress, initialHoldState, stepHold, type HoldState } from "./hold";

const config = { holdMs: 300, graceMs: 120 };

function run(readings: [number, string | null][]) {
  let state: HoldState = initialHoldState;
  const held: [number, string][] = [];
  for (const [now, letter] of readings) {
    const step = stepHold(state, letter, now, config);
    state = step.state;
    if (step.held) held.push([now, step.held]);
  }
  return { state, held };
}

const frames = (letter: string | null, from: number, to: number, step = 33): [number, string | null][] => {
  const out: [number, string | null][] = [];
  for (let t = from; t <= to; t += step) out.push([t, letter]);
  return out;
};

describe("stepHold", () => {
  it("confirms a letter held for the hold time, once", () => {
    const { held } = run(frames("A", 0, 1000));
    expect(held).toHaveLength(1);
    expect(held[0]?.[1]).toBe("A");
    expect(held[0]?.[0]).toBeGreaterThanOrEqual(300);
    expect(held[0]?.[0]).toBeLessThan(340);
  });

  it("doesn't confirm a hold that's too short", () => {
    expect(run(frames("A", 0, 250)).held).toEqual([]);
  });

  it("restarts the hold when the letter changes", () => {
    const { held } = run([...frames("A", 0, 200), ...frames("S", 233, 700)]);
    expect(held.map(([, l]) => l)).toEqual(["S"]);
    expect(held[0]?.[0]).toBeGreaterThanOrEqual(533);
  });

  it("tolerates a brief dropout", () => {
    const { held } = run([...frames("A", 0, 165), [198, null], [231, null], ...frames("A", 264, 400)]);
    expect(held.map(([, l]) => l)).toEqual(["A"]);
  });

  it("resets after a dropout longer than the grace period", () => {
    const { held } = run([...frames("A", 0, 200), ...frames(null, 233, 400), ...frames("A", 433, 600)]);
    expect(held).toEqual([]);
  });

  it("confirms the same letter again only after releasing it", () => {
    const { held } = run([...frames("A", 0, 400), ...frames(null, 433, 700), ...frames("A", 733, 1100)]);
    expect(held.map(([, l]) => l)).toEqual(["A", "A"]);
  });
});

describe("holdProgress", () => {
  it("fills from 0 to 1 over the hold", () => {
    const mid = run(frames("A", 0, 150, 30)).state; // camera-rate frames up to t=150
    expect(holdProgress(mid, "A", 150, config)).toBeCloseTo(0.5);
    expect(holdProgress(mid, "B", 150, config)).toBe(0);
    expect(holdProgress(mid, "A", 400, config)).toBe(0);
  });
});
