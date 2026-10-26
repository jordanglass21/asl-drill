"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSessions, SESSIONS_STORAGE_KEY } from "@/lib/practice/storage";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SESSIONS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSIONS_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** Saved sessions (newest last). Null during server rendering and before hydration. */
export function useSessions() {
  // The raw string is a stable snapshot; parsing happens once per change.
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  return useMemo(() => (raw === undefined ? null : parseSessions(raw)), [raw]);
}
