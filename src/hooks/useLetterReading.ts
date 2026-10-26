"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LETTER_MODEL_PATH, readHand, readingChanged, type LiveReading } from "@/lib/classifier/live";
import { parseModel, type LetterModel } from "@/lib/classifier/model";
import type { TrackedFrame } from "./useHandTracking";

let modelPromise: Promise<LetterModel> | null = null;

function loadLetterModel(): Promise<LetterModel> {
  modelPromise ??= fetch(LETTER_MODEL_PATH)
    .then((response) => {
      if (!response.ok) throw new Error(`model request failed: ${response.status}`);
      return response.json();
    })
    .then(parseModel);
  modelPromise.catch(() => {
    modelPromise = null;
  });
  return modelPromise;
}

/** Loads the letter model and turns tracked frames into a live letter reading. */
export function useLetterReading() {
  const [model, setModel] = useState<LetterModel | null>(null);
  const [failed, setFailed] = useState(false);
  const [reading, setReading] = useState<LiveReading | null>(null);
  const modelRef = useRef<LetterModel | null>(null);
  const lastRef = useRef<LiveReading | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLetterModel().then(
      (loaded) => {
        if (cancelled) return;
        modelRef.current = loaded;
        setModel(loaded);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const onFrame = useCallback((frame: TrackedFrame) => {
    const loaded = modelRef.current;
    if (!loaded) return;
    const next = frame.hand ? readHand(loaded, frame.hand, frame.width, frame.height) : null;
    if (readingChanged(lastRef.current, next)) {
      lastRef.current = next;
      setReading(next);
    }
  }, []);

  return { status: failed ? "error" : model ? "ready" : "loading", reading, onFrame } as const;
}
