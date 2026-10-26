// Picks the signing hand out of MediaPipe's hand landmarker results.

/** The minimal shape of a MediaPipe landmark that our code relies on. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** The parts of MediaPipe's HandLandmarkerResult that we consume. */
export interface HandResult {
  landmarks: Landmark[][];
  handedness: { categoryName: string; score: number }[][];
}

export type HandSide = "left" | "right";
export type HandednessSetting = "auto" | HandSide;

export interface DetectedHand {
  /** The signer's physical hand. */
  side: HandSide;
  score: number;
  landmarks: Landmark[];
  /** Index into the original result, for drawing. */
  index: number;
}

/**
 * MediaPipe labels handedness as if the input image were mirrored (a selfie
 * view). We feed it raw, un-mirrored camera frames, so its labels are swapped
 * relative to the signer's physical hands.
 */
export function labelToSide(categoryName: string): HandSide | null {
  const label = categoryName.toLowerCase();
  if (label === "left") return "right";
  if (label === "right") return "left";
  return null;
}

export function toDetectedHands(result: HandResult): DetectedHand[] {
  const hands: DetectedHand[] = [];
  result.landmarks.forEach((landmarks, index) => {
    const category = result.handedness[index]?.[0];
    const side = category ? labelToSide(category.categoryName) : null;
    if (side && category) hands.push({ side, score: category.score, landmarks, index });
  });
  return hands;
}

export interface SelectionState {
  /** The side currently treated as the signing hand in auto mode. */
  current: HandSide | null;
  /** Consecutive frames the other side has been the better candidate. */
  challengerFrames: number;
}

export const initialSelectionState: SelectionState = { current: null, challengerFrames: 0 };

/** Frames the other hand must win in a row before auto mode switches to it. */
export const DEFAULT_SWITCH_FRAMES = 5;

function best(hands: DetectedHand[], side?: HandSide): DetectedHand | null {
  let top: DetectedHand | null = null;
  for (const hand of hands) {
    if (side && hand.side !== side) continue;
    if (!top || hand.score > top.score) top = hand;
  }
  return top;
}

/**
 * Chooses the signing hand for one frame. With a fixed setting, only that hand
 * counts. In auto mode the most confident hand wins, but once a hand is chosen
 * the other one must win for `switchFrames` frames in a row to take over, so
 * the choice doesn't flicker when both hands are in view.
 */
export function selectSigningHand(
  hands: DetectedHand[],
  setting: HandednessSetting,
  state: SelectionState,
  switchFrames = DEFAULT_SWITCH_FRAMES,
): { hand: DetectedHand | null; state: SelectionState } {
  if (setting !== "auto") {
    return { hand: best(hands, setting), state: { current: setting, challengerFrames: 0 } };
  }

  const top = best(hands);
  if (!top) return { hand: null, state: { ...state, challengerFrames: 0 } };

  const incumbent = state.current ? best(hands, state.current) : null;
  if (!incumbent || top.side === state.current) {
    return { hand: top, state: { current: top.side, challengerFrames: 0 } };
  }

  const challengerFrames = state.challengerFrames + 1;
  if (challengerFrames >= switchFrames) {
    return { hand: top, state: { current: top.side, challengerFrames: 0 } };
  }
  return { hand: incumbent, state: { current: state.current, challengerFrames } };
}
