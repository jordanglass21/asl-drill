"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/** True when the main pointer is a finger (a phone or tablet), so keyboard hints don't apply. */
export function useTouchScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
