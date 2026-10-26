"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HandednessSetting } from "@/lib/hands/handedness";
import { DEFAULT_HANDEDNESS, HANDEDNESS_STORAGE_KEY, loadHandedness, saveHandedness } from "@/lib/settings";

const listeners = new Set<() => void>();
// Used when localStorage is unavailable, so the setting still works for this visit.
let unsavedValue: HandednessSetting | null = null;

function localStorageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === HANDEDNESS_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => unsavedValue ?? loadHandedness(localStorageOrUndefined());
const getServerSnapshot = () => DEFAULT_HANDEDNESS;

/** The signer's handedness setting, persisted in localStorage and shared across tabs. */
export function useHandednessSetting() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback((next: HandednessSetting) => {
    unsavedValue = saveHandedness(localStorageOrUndefined(), next) ? null : next;
    listeners.forEach((listener) => listener());
  }, []);
  return [value, setValue] as const;
}
