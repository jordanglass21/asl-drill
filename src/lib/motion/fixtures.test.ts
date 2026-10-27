// Detector checks against a committed sample of real takes (see
// training/scripts/make_motion_fixtures.py); the full report is `npm run eval:motion`.
import fixture from "../../../fixtures/motion/takes.json";
import type { HandSide } from "@/lib/hands/handedness";
import { expectationFor, falseMotion, isHit, replayTake, type EvalTake } from "./evaluate";

interface FixtureTake {
  id: string;
  label: string;
  kind: EvalTake["kind"];
  style?: string;
  camera: EvalTake["camera"];
  frames: { t: number; side: string; landmarks: number[][] }[];
}

const takes = (fixture.takes as FixtureTake[]).map((t) => ({
  ...t,
  frames: t.frames.map((f) => ({
    t: f.t,
    side: f.side as HandSide,
    landmarks: f.landmarks.map(([x = 0, y = 0, z = 0]) => ({ x, y, z })),
  })),
}));

describe("motion detector on recorded takes", () => {
  it.each(takes.map((t) => [`${t.kind} ${t.label}${t.style ? ` (${t.style})` : ""}`, t] as const))("%s", (_name, take) => {
    const result = replayTake(take);
    const expected = expectationFor(take);
    if (expected === "none") {
      expect(falseMotion(result)).toEqual([]);
    } else {
      expect(isHit(result)).toBe(true);
    }
    expect(falseMotion(result)).toEqual([]);
  });
});
