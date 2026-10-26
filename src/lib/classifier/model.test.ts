// The TypeScript half of the classifier parity check; the Python half is
// training/tests/test_classifier_parity.py. Both read the same fixture.
import shippedModel from "../../../public/models/letters-v1.json";
import parity from "../../../fixtures/classifier/parity.json";
import { ModelError, parseModel, predictProbabilities, topLetter, type ExportedModel } from "./model";

const exported = shippedModel as ExportedModel;
const model = parseModel(exported);

describe("letter model parity with Python", () => {
  it.each(parity.cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const probabilities = predictProbabilities(model, c.input);
    expect(probabilities).toHaveLength(c.expected.length);
    probabilities.forEach((p, i) => expect(Math.abs(p - (c.expected[i] ?? NaN))).toBeLessThanOrEqual(parity.tolerance));
  });
});

describe("parseModel", () => {
  it("loads the shipped model", () => {
    expect(model.labels).toEqual("ABCDEFGHIKLMNOPQRSTUVWXY".split(""));
    expect(model.threshold).toBeGreaterThan(0);
    expect(model.layers.map((l) => [l.inputs, l.outputs])).toEqual([
      [63, 128],
      [128, 64],
      [64, 24],
    ]);
  });

  it.each([
    ["another format", { ...exported, format: "nope" }],
    ["a newer version", { ...exported, version: 2 }],
    ["a different normalization", { ...exported, normalizationVersion: 2 }],
    ["mismatched labels", { ...exported, labels: ["A"] }],
    ["a bad threshold", { ...exported, threshold: 1.5 }],
    ["truncated weights", { ...exported, layers: [{ ...exported.layers[0], weights: "AAAA" }, ...exported.layers.slice(1)] }],
  ])("rejects %s", (_name, data) => {
    expect(() => parseModel(data)).toThrow(ModelError);
  });

  it("rejects non-objects", () => {
    expect(() => parseModel(null)).toThrow(ModelError);
  });
});

describe("predictProbabilities", () => {
  it("returns a probability distribution", () => {
    const p = predictProbabilities(model, parity.cases[0]?.input ?? []);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Math.min(...p)).toBeGreaterThanOrEqual(0);
  });

  it("rejects the wrong number of features", () => {
    expect(() => predictProbabilities(model, [1, 2, 3])).toThrow(ModelError);
  });
});

describe("topLetter", () => {
  const tiny = { ...model, labels: ["A", "B", "C"], threshold: 0.6 };

  it("returns the most likely letter above the threshold", () => {
    expect(topLetter(tiny, [0.1, 0.7, 0.2])).toEqual({ letter: "B", confidence: 0.7 });
  });

  it("returns null below the threshold", () => {
    expect(topLetter(tiny, [0.3, 0.4, 0.3])).toBeNull();
  });

  it("accepts a threshold override", () => {
    expect(topLetter(tiny, [0.3, 0.4, 0.3], 0.35)?.letter).toBe("B");
  });
});
