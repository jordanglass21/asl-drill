// Canvas drawing for the landmark overlay. Kept thin: the geometry lives in
// overlay.ts, which is unit-tested.

import type { DetectedHand } from "./handedness";
import { handSegments } from "./overlay";

export interface OverlayColors {
  /** Bones and joints of the signing hand. */
  bone: string;
  joint: string;
  /** Any other hand in view. */
  dim: string;
}

export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: DetectedHand[],
  signingIndex: number | null,
  colors: OverlayColors,
  mirrored: boolean,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const scale = Math.max(1, width / 640);

  for (const hand of hands) {
    const signing = hand.index === signingIndex;
    const { points, lines } = handSegments(hand.landmarks, width, height, mirrored);

    ctx.strokeStyle = signing ? colors.bone : colors.dim;
    ctx.globalAlpha = signing ? 0.9 : 0.6;
    ctx.lineWidth = 1.6 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const [a, b] of lines) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = signing ? colors.joint : colors.dim;
    points.forEach((point, i) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, (i === 0 ? 4 : 2.8) * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
