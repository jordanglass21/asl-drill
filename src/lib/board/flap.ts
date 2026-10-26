// Rules for split-flap tiles on the board.

export type FlapState = "pending" | "current" | "confirmed" | "missed";

/** A tile flips only when it lands on a result: confirmed or missed. */
export function shouldFlip(previous: FlapState, next: FlapState): boolean {
  return previous !== next && (next === "confirmed" || next === "missed");
}

/** The CSS color a tile shows in each state, used for the face it flips away from. */
export const FLAP_COLORS: Record<FlapState, string> = {
  pending: "var(--cream-dim)",
  current: "var(--cream)",
  confirmed: "var(--amber)",
  missed: "var(--miss)",
};

/** Splits text into flap characters; spaces become blank tiles. */
export function toFlapChars(text: string): string[] {
  return [...text.toUpperCase()].map((ch) => (ch === " " ? "" : ch));
}
