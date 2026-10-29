// Which footer hints to show. Hints tied to a key mean nothing on a touch
// screen with no keyboard, so they're left out there.

export interface KeyHint {
  keys?: string;
  text: string;
}

export function visibleHints(hints: readonly KeyHint[], touch: boolean): KeyHint[] {
  return touch ? hints.filter((hint) => !hint.keys) : [...hints];
}
