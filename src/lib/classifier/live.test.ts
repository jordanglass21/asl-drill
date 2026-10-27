import shippedModel from "../../../public/models/letters-v4.json";
import normalizationCases from "../../../fixtures/normalization/cases.json";
import type { DetectedHand } from "@/lib/hands/handedness";
import { readHand, readingChanged } from "./live";
import { parseModel } from "./model";

const model = parseModel(shippedModel);
const realB = normalizationCases.cases.find((c) => c.name === "real-B-right");
// This dataset sample is a mirrored hand (the training chirality model gives it
// p(right) = 0.04), so it's read as a left hand, as training did.
const hand: DetectedHand = {
  side: "left",
  score: 0.98,
  label: "Left",
  landmarks: realB?.input.landmarks ?? [],
  worldLandmarks: [],
  index: 0,
};

describe("readHand", () => {
  it("reads a real B handshape as B", () => {
    const reading = readHand(model, hand, 1280, 960);
    expect(reading?.best).toBe("B");
    expect(reading?.letter).toBe("B");
  });

  it("hides the letter, but keeps the guess, below the threshold", () => {
    const strict = { ...model, threshold: 0.999999 };
    const reading = readHand(strict, hand, 1280, 960);
    expect(reading?.letter).toBeNull();
    expect(reading?.best).toBe("B");
  });

  it("returns null for unusable input", () => {
    expect(readHand(model, { ...hand, landmarks: [] }, 1280, 720)).toBeNull();
    expect(readHand(model, hand, 0, 720)).toBeNull();
  });
});

describe("readingChanged", () => {
  const a = { letter: "A", best: "A", confidence: 0.9 };

  it("ignores small confidence wobble", () => {
    expect(readingChanged(a, { ...a, confidence: 0.92 })).toBe(false);
  });

  it("updates on a new letter, a bigger confidence change, or the hand appearing or leaving", () => {
    expect(readingChanged(a, { ...a, letter: "S", best: "S" })).toBe(true);
    expect(readingChanged(a, { ...a, confidence: 0.8 })).toBe(true);
    expect(readingChanged(a, null)).toBe(true);
    expect(readingChanged(null, a)).toBe(true);
    expect(readingChanged(null, null)).toBe(false);
  });
});
