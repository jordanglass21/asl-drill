// User settings persisted in localStorage.

import type { HandednessSetting } from "@/lib/hands/handedness";

export const HANDEDNESS_STORAGE_KEY = "asl-drill:handedness";
export const DEFAULT_HANDEDNESS: HandednessSetting = "auto";
export const HANDEDNESS_OPTIONS: readonly HandednessSetting[] = ["auto", "left", "right"];

export function parseHandedness(raw: string | null | undefined): HandednessSetting {
  return HANDEDNESS_OPTIONS.find((option) => option === raw) ?? DEFAULT_HANDEDNESS;
}

/** Reads the setting, falling back to the default if storage is unavailable. */
export function loadHandedness(storage: Pick<Storage, "getItem"> | undefined): HandednessSetting {
  try {
    return parseHandedness(storage?.getItem(HANDEDNESS_STORAGE_KEY));
  } catch {
    return DEFAULT_HANDEDNESS;
  }
}

/** Saves the setting; returns false if storage is unavailable (e.g. private mode). */
export function saveHandedness(storage: Pick<Storage, "setItem"> | undefined, value: HandednessSetting): boolean {
  try {
    if (!storage) return false;
    storage.setItem(HANDEDNESS_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

/** Steps through options for arrow-key navigation, wrapping at both ends. */
export function stepOption<T>(options: readonly T[], current: T, delta: number): T {
  const index = Math.max(0, options.indexOf(current));
  const next = options[(index + delta + options.length) % options.length];
  return next ?? current;
}
