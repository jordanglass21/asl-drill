"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FLAP_COLORS, shouldFlip, type FlapState } from "@/lib/board/flap";

/** A little longer than the flip (150 ms delay + 220 ms land) or the fade. */
const FLIP_SETTLE_MS = 700;

interface Props {
  char: string;
  state?: FlapState;
  size?: "lg" | "md" | "sm" | "xs";
  caret?: boolean;
  /** Red caret: the model is reading a different letter. */
  caretWrong?: boolean;
  /** Set false for tiles whose state changes often (e.g. a live reading). */
  animate?: boolean;
}

/**
 * One split-flap tile. When it lands on confirmed or missed it flips: the top
 * half falls and the new bottom half lands (a fade with reduced motion).
 */
export function Flap({ char, state = "pending", size = "lg", caret = false, caretWrong = false, animate = true }: Props) {
  const [shown, setShown] = useState(state);
  const [flipFrom, setFlipFrom] = useState<FlapState | null>(null);
  if (state !== shown) {
    // Derived from the previous render, React's recommended pattern for this.
    setShown(state);
    setFlipFrom(animate && shouldFlip(shown, state) ? shown : null);
  }

  // Settle even if animationend never fires (e.g. a background tab that never paints).
  useEffect(() => {
    if (!flipFrom) return;
    const timer = setTimeout(() => setFlipFrom(null), FLIP_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [flipFrom]);

  const style = flipFrom ? ({ "--flap-from": FLAP_COLORS[flipFrom] } as CSSProperties) : undefined;
  return (
    <div
      className="flap"
      data-state={state}
      data-size={size}
      data-flipping={flipFrom ? "" : undefined}
      style={style}
      aria-hidden
      onAnimationEnd={(event) => {
        const name = event.animationName;
        if (name === "flap-land" || name === "flap-fade") setFlipFrom(null);
      }}
    >
      <div className="flap-half top">
        <span>{char}</span>
      </div>
      <div className="flap-half bottom">
        <span>{char}</span>
      </div>
      {flipFrom && (
        <>
          <div className="flap-leaf falling">
            <span>{char}</span>
          </div>
          <div className="flap-leaf landing">
            <span>{char}</span>
          </div>
        </>
      )}
      {caret && <i className="flap-caret" data-wrong={caretWrong ? "" : undefined} />}
    </div>
  );
}
