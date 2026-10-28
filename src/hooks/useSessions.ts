"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { BESTS_STORAGE_KEY, parseBests } from "@/lib/practice/records";
import { parseSessions, SESSIONS_STORAGE_KEY } from "@/lib/practice/storage";

/** A localStorage entry's raw string, kept in sync with other tabs. Undefined during server rendering. */
function useStoredRaw(key: string): string | null | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    [key],
  );
  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/** Saved sessions (newest last). Null during server rendering and before hydration. */
export function useSessions() {
  // The raw string is a stable snapshot; parsing happens once per change.
  const raw = useStoredRaw(SESSIONS_STORAGE_KEY);
  return useMemo(() => (raw === undefined ? null : parseSessions(raw)), [raw]);
}

/** Stored personal bests; merge with the history via currentBests(). */
export function useStoredBests() {
  const raw = useStoredRaw(BESTS_STORAGE_KEY);
  return useMemo(() => parseBests(raw), [raw]);
}
