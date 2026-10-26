import type { HandednessSetting, HandSide } from "./handedness";

/** Short status line describing what tracking currently sees. */
export function trackingReadout(
  tracking: { status: "idle" | "loading" | "ready" | "error"; signingSide: HandSide | null },
  setting: HandednessSetting,
): string {
  if (tracking.status === "loading") return "loading hand tracking…";
  if (tracking.status !== "ready") return "";
  if (tracking.signingSide) return `tracking ${tracking.signingSide} hand`;
  return setting === "auto" ? "show a hand" : `show your ${setting} hand`;
}
