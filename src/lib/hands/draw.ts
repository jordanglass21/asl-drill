// Canvas drawing for the landmark overlay. Kept thin: the geometry lives in
// overlay.ts, which is unit-tested.

import type { DetectedHand } from "./handedness";
import { handSegments } from "./overlay";

export interface OverlayColors {
  signing: string;
  other: string;
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
    const color = hand.index === signingIndex ? colors.signing : colors.other;
    const { points, lines } = handSegments(hand.landmarks, width, height, mirrored);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    for (const [a, b] of lines) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.fillStyle = color;
    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
