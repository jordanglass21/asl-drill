import { DEFAULT_HOLD_CONFIG } from "./hold";
import { initialDoubleCheck, stepDoubleCheck, type DoubleCheckEvent, type DoubleCheckState } from "./doubleCheck";

const { holdMs, graceMs } = DEFAULT_HOLD_CONFIG;

/** Holds `letter` long enough to confirm it, one reading per frame, starting at `t`. */
const hold = (letter: string, t: number): DoubleCheckEvent[] =>
  Array.from({ length: Math.ceil(holdMs / 33) + 1 }, (_, i) => ({ type: "reading", now: t + Math.min(i * 33, holdMs), letter }));
const release = (t: number): DoubleCheckEvent => ({ type: "reading", now: t + graceMs + 1, letter: null });
const slide: DoubleCheckEvent = { type: "motion", motion: { kind: "double", style: "slide" } };

const run = (events: DoubleCheckEvent[], start: DoubleCheckState = initialDoubleCheck) =>
  events.reduce((s, e) => stepDoubleCheck(s, e), start);

describe("stepDoubleCheck", () => {
  it("doesn't count holding a letter on as a double", () => {
    expect(run([...hold("O", 0), ...hold("O", holdMs + 33)]).double).toBeNull();
  });

  it("counts a released and re-formed letter", () => {
    expect(run([...hold("O", 0), release(holdMs), ...hold("O", 1000)]).double).toEqual({ letter: "O", confirmedBy: "hold", n: 1 });
  });

  it("doesn't count a different letter after a release", () => {
    expect(run([...hold("O", 0), release(holdMs), ...hold("K", 1000)]).double).toBeNull();
  });

  it("repeats the last letter on a slide or bounce, numbering each double", () => {
    const s = run([...hold("L", 0), slide, { type: "motion", motion: { kind: "double", style: "bounce" } }]);
    expect(s.double).toEqual({ letter: "L", confirmedBy: "bounce", n: 2 });
  });

  it("ignores a double with nothing to repeat, or after J or Z", () => {
    expect(run([slide]).double).toBeNull();
    expect(run([{ type: "motion", motion: { kind: "Z" } }, slide]).double).toBeNull();
  });
});
