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
  /** Metric 3D coordinates centered on the hand; absent in some fixtures. */
  worldLandmarks?: Landmark[][];
  handedness: { categoryName: string; score: number }[][];
}

export type HandSide = "left" | "right";
export type HandednessSetting = "auto" | HandSide;

export interface DetectedHand {
  /** The signer's physical hand. */
  side: HandSide;
  score: number;
  /** MediaPipe's own handedness label ("Left"/"Right"), before our swap. */
  label: string;
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  /** Index into the original result, for drawing. */
  index: number;
}

/**
 * Maps MediaPipe's handedness label to the signer's physical hand. On the raw,
 * un-mirrored camera frames we pass in, MediaPipe's labels already name the
 * physical hand (confirmed with a real webcam), so no swap is needed. The
 * preview is mirrored for display only.
 */
export function labelToSide(categoryName: string): HandSide | null {
  const label = categoryName.toLowerCase();
  if (label === "left") return "left";
  if (label === "right") return "right";
  return null;
}

export function toDetectedHands(result: HandResult): DetectedHand[] {
  const hands: DetectedHand[] = [];
  result.landmarks.forEach((landmarks, index) => {
    const category = result.handedness[index]?.[0];
    const side = category ? labelToSide(category.categoryName) : null;
    if (side && category) {
      const worldLandmarks = result.worldLandmarks?.[index] ?? [];
      hands.push({ side, score: category.score, label: category.categoryName, landmarks, worldLandmarks, index });
    }
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
