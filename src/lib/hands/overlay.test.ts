import rightHandFixture from "./__fixtures__/right-hand.json";
import { HAND_CONNECTIONS, handSegments, toCanvasPoint } from "./overlay";

describe("HAND_CONNECTIONS", () => {
  it("covers all 21 landmarks with valid indices", () => {
    const used = new Set(HAND_CONNECTIONS.flat());
    expect(used.size).toBe(21);
    expect(Math.min(...used)).toBe(0);
    expect(Math.max(...used)).toBe(20);
  });
});

describe("toCanvasPoint", () => {
  const lm = { x: 0.25, y: 0.5, z: 0 };

  it("scales normalized coordinates to the canvas", () => {
    expect(toCanvasPoint(lm, 640, 480, false)).toEqual({ x: 160, y: 240 });
  });

  it("flips x for a mirrored preview", () => {
    expect(toCanvasPoint(lm, 640, 480, true)).toEqual({ x: 480, y: 240 });
  });
});

describe("handSegments", () => {
  it("projects a full hand into points and skeleton lines", () => {
    const landmarks = rightHandFixture.landmarks[0] ?? [];
    const { points, lines } = handSegments(landmarks, 100, 100, true);
    expect(points).toHaveLength(21);
    expect(lines).toHaveLength(HAND_CONNECTIONS.length);
  });

  it("skips lines whose landmarks are missing", () => {
    const { lines } = handSegments([{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }], 10, 10, false);
    expect(lines).toEqual([[{ x: 0, y: 0 }, { x: 10, y: 10 }]]);
  });
});
