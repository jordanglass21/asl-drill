// Display helpers for the /record page.

import type { RecorderPhase } from "./recorder";

/** What the overlay should show for the current phase at time `now`. */
export function phaseOverlay(phase: RecorderPhase, now: number): { label: string; detail: string } | null {
  if (phase.kind === "countdown") {
    return { label: String(Math.max(1, Math.ceil((phase.until - now) / 1000))), detail: "get ready" };
  }
  if (phase.kind === "capturing") {
    return { label: "●", detail: `recording, ${phase.frames.length} frames` };
  }
  return null;
}
