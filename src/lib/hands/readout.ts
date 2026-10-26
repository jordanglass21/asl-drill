import type { HandednessSetting, HandSide } from "./handedness";

/** Short status describing what tracking currently sees, for the camera tag. */
export function trackingReadout(
  tracking: { status: "idle" | "loading" | "ready" | "error"; signingSide: HandSide | null },
  setting: HandednessSetting,
): string {
  if (tracking.status === "loading") return "loading tracking";
  if (tracking.status !== "ready") return "";
  if (tracking.signingSide) return `${tracking.signingSide} hand`;
  return setting === "auto" ? "show a hand" : `show ${setting} hand`;
}
