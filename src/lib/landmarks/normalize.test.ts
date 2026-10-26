import fixtures from "../../../fixtures/normalization/cases.json";
import type { HandSide } from "@/lib/hands/handedness";
import { FEATURE_COUNT, normalizeLandmarks } from "./normalize";

interface Case {
  name: string;
  input: { landmarks: { x: number; y: number; z: number }[]; side: string; aspectRatio: number };
  expected: number[] | null;
}

const cases = fixtures.cases as Case[];
const byName = (name: string): Case => {
  const found = cases.find((c) => c.name === name);
  if (!found) throw new Error(`missing fixture ${name}`);
  return found;
};

describe("normalizeLandmarks (shared fixtures)", () => {
  it.each(cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const result = normalizeLandmarks(c.input.landmarks, c.input.side as HandSide, c.input.aspectRatio);
    if (c.expected === null) {
      expect(result).toBeNull();
      return;
    }
    expect(result).toHaveLength(FEATURE_COUNT);
    result?.forEach((value, i) => {
      expect(Math.abs(value - (c.expected?.[i] ?? NaN))).toBeLessThanOrEqual(fixtures.tolerance);
    });
  });
});

describe("normalizeLandmarks", () => {
  const real = byName("real-B-right").input;

  it("puts the wrist at the origin and the middle knuckle at unit distance", () => {
    const f = normalizeLandmarks(real.landmarks, "right", real.aspectRatio) ?? [];
    expect(f.slice(0, 3)).toEqual([0, 0, 0]);
    expect(Math.hypot(f[27] ?? 0, f[28] ?? 0, f[29] ?? 0)).toBeCloseTo(1, 12);
  });

  it("treats a left hand as a right hand with x negated", () => {
    const right = normalizeLandmarks(real.landmarks, "right", real.aspectRatio) ?? [];
    const left = normalizeLandmarks(real.landmarks, "left", real.aspectRatio) ?? [];
    left.forEach((value, i) => expect(value).toBeCloseTo(i % 3 === 0 ? -(right[i] ?? 0) : (right[i] ?? 0), 12));
  });

  it("keeps rotation", () => {
    const simple = byName("simple-right").input.landmarks;
    const rotated = simple.map((lm) => ({ x: 0.5 + (lm.y - 0.5), y: 0.5 - (lm.x - 0.5), z: lm.z }));
    expect(normalizeLandmarks(rotated, "right", 1)).not.toEqual(normalizeLandmarks(simple, "right", 1));
  });

  it.each([0, -1, NaN, Infinity])("rejects aspect ratio %p", (aspect) => {
    expect(normalizeLandmarks(byName("simple-right").input.landmarks, "right", aspect)).toBeNull();
  });

  it("rejects non-finite landmarks", () => {
    const broken = byName("simple-right").input.landmarks.map((lm, i) => (i === 4 ? { ...lm, x: NaN } : lm));
    expect(normalizeLandmarks(broken, "right", 1)).toBeNull();
  });
});
