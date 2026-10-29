"use client";

import { Fragment } from "react";
import { useTouchScreen } from "@/hooks/useTouchScreen";
import { visibleHints, type KeyHint } from "@/lib/board/hints";

export type { KeyHint };

/** Keyboard hints pinned to the bottom of the screen; key hints are left out on touch screens. */
export function KeyHints({ hints, children }: { hints: KeyHint[]; children?: React.ReactNode }) {
  const shown = visibleHints(hints, useTouchScreen());
  return (
    <footer className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-rail bg-board pt-2.5 pb-3">
      <p className="label">
        {shown.map((hint, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="mx-2 text-edge">/</span>}
            {hint.keys && (
              <kbd className="mr-1.5 rounded-[3px] border border-edge px-1.5 py-px font-mono text-cream">{hint.keys}</kbd>
            )}
            {hint.text}
          </Fragment>
        ))}
      </p>
      {children}
    </footer>
  );
}
