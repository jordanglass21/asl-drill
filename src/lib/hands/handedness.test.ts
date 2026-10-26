import leftHandFixture from "./__fixtures__/left-hand.json";
import noHandsFixture from "./__fixtures__/no-hands.json";
import rightHandFixture from "./__fixtures__/right-hand.json";
import twoHandsFixture from "./__fixtures__/two-hands.json";
import {
  initialSelectionState,
  labelToSide,
  selectSigningHand,
  toDetectedHands,
  type DetectedHand,
  type HandSide,
  type SelectionState,
} from "./handedness";

const hand = (side: HandSide, score: number, index = 0): DetectedHand => ({ side, score, landmarks: [], index });

describe("labelToSide", () => {
  it("swaps MediaPipe's mirrored labels to the signer's physical hand", () => {
    expect(labelToSide("Left")).toBe("right");
    expect(labelToSide("Right")).toBe("left");
  });

  it("rejects unknown labels", () => {
    expect(labelToSide("")).toBeNull();
    expect(labelToSide("Both")).toBeNull();
  });
});

describe("toDetectedHands", () => {
  it("reads a single right hand", () => {
    const hands = toDetectedHands(rightHandFixture);
    expect(hands).toHaveLength(1);
    expect(hands[0]).toMatchObject({ side: "right", score: 0.97, index: 0 });
    expect(hands[0]?.landmarks).toHaveLength(21);
  });

  it("reads a single left hand", () => {
    expect(toDetectedHands(leftHandFixture).map((h) => h.side)).toEqual(["left"]);
  });

  it("reads both hands with their original indices", () => {
    expect(toDetectedHands(twoHandsFixture).map((h) => [h.side, h.index])).toEqual([
      ["left", 0],
      ["right", 1],
    ]);
  });

  it("returns nothing when no hands are present", () => {
    expect(toDetectedHands(noHandsFixture)).toEqual([]);
  });

  it("skips hands without a handedness label", () => {
    expect(toDetectedHands({ landmarks: [[]], handedness: [[]] })).toEqual([]);
  });
});

describe("selectSigningHand", () => {
  it("uses only the configured hand when set to left or right", () => {
    const hands = toDetectedHands(twoHandsFixture);
    expect(selectSigningHand(hands, "left", initialSelectionState).hand?.side).toBe("left");
    expect(selectSigningHand(hands, "right", initialSelectionState).hand?.side).toBe("right");
  });

  it("finds no hand when the configured hand is out of view", () => {
    const hands = toDetectedHands(rightHandFixture);
    expect(selectSigningHand(hands, "left", initialSelectionState).hand).toBeNull();
  });

  it("picks the most confident hand in auto mode", () => {
    const { hand: chosen, state } = selectSigningHand(toDetectedHands(twoHandsFixture), "auto", initialSelectionState);
    expect(chosen?.side).toBe("right");
    expect(state.current).toBe("right");
  });

  it("switches immediately when the current hand leaves the frame", () => {
    const state: SelectionState = { current: "right", challengerFrames: 0 };
    expect(selectSigningHand([hand("left", 0.9)], "auto", state).hand?.side).toBe("left");
  });

  it("waits for the other hand to win several frames in a row before switching", () => {
    const frame = [hand("right", 0.8), hand("left", 0.95, 1)];
    let state: SelectionState = { current: "right", challengerFrames: 0 };
    for (let i = 0; i < 4; i++) {
      const step = selectSigningHand(frame, "auto", state, 5);
      expect(step.hand?.side).toBe("right");
      state = step.state;
    }
    expect(selectSigningHand(frame, "auto", state, 5).hand?.side).toBe("left");
  });

  it("resets the switch countdown when the current hand wins again", () => {
    let state: SelectionState = { current: "right", challengerFrames: 0 };
    state = selectSigningHand([hand("right", 0.8), hand("left", 0.95, 1)], "auto", state).state;
    expect(state.challengerFrames).toBe(1);
    state = selectSigningHand([hand("right", 0.99), hand("left", 0.95, 1)], "auto", state).state;
    expect(state.challengerFrames).toBe(0);
  });

  it("keeps the current choice through frames with no hands", () => {
    const state: SelectionState = { current: "left", challengerFrames: 2 };
    const step = selectSigningHand([], "auto", state);
    expect(step.hand).toBeNull();
    expect(step.state).toEqual({ current: "left", challengerFrames: 0 });
  });
});
