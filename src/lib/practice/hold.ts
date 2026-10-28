// Hold-to-confirm: a letter counts once the same confident reading has been
// held for `holdMs`. Brief dropouts (a frame or two without a confident
// reading) are tolerated for `graceMs` so tracking jitter doesn't reset a hold.

export interface HoldConfig {
  holdMs: number;
  graceMs: number;
}

// 150 ms: none of our correctly signed recordings confirms a wrong letter
// even this quickly, and slower signers hold longer than this anyway, so a
// short hold mostly lifts the speed limit for faster hands. Was 300 ms.
export const DEFAULT_HOLD_CONFIG: HoldConfig = { holdMs: 150, graceMs: 120 };

export interface HoldState {
  /** The letter currently being held, if any. */
  letter: string | null;
  /** When the current hold started. */
  since: number;
  /** When that letter was last seen. */
  lastSeen: number;
  /** True once this hold has produced a confirmation, until the letter changes. */
  fired: boolean;
}

export const initialHoldState: HoldState = { letter: null, since: 0, lastSeen: 0, fired: false };

export interface HoldStep {
  state: HoldState;
  /** The letter whose hold completed on this reading, if any. */
  held: string | null;
}

/** Advances the hold with one reading: an accepted letter, or null for none. */
export function stepHold(state: HoldState, letter: string | null, now: number, config = DEFAULT_HOLD_CONFIG): HoldStep {
  if (letter === null) {
    if (state.letter !== null && now - state.lastSeen > config.graceMs) {
      return { state: initialHoldState, held: null };
    }
    return { state, held: null };
  }
  if (letter !== state.letter || now - state.lastSeen > config.graceMs) {
    return { state: { letter, since: now, lastSeen: now, fired: false }, held: null };
  }
  const next = { ...state, lastSeen: now };
  if (!state.fired && now - state.since >= config.holdMs) {
    return { state: { ...next, fired: true }, held: letter };
  }
  return { state: next, held: null };
}

/** How far through the hold `letter` is (0–1), for the hold meter. */
export function holdProgress(state: HoldState, letter: string, now: number, config = DEFAULT_HOLD_CONFIG): number {
  if (state.letter !== letter || now - state.lastSeen > config.graceMs) return 0;
  if (state.fired) return 1;
  return Math.min(1, Math.max(0, (now - state.since) / config.holdMs));
}
