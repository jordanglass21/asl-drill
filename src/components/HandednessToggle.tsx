"use client";

import { useRef, type KeyboardEvent } from "react";
import type { HandednessSetting } from "@/lib/hands/handedness";
import { HANDEDNESS_OPTIONS, stepOption } from "@/lib/settings";

interface Props {
  value: HandednessSetting;
  onChange: (value: HandednessSetting) => void;
}

/** Monkeytype-style segmented control; arrow keys move between options. */
export function HandednessToggle({ value, onChange }: Props) {
  const buttons = useRef(new Map<HandednessSetting, HTMLButtonElement>());

  const onKeyDown = (event: KeyboardEvent) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = stepOption(HANDEDNESS_OPTIONS, value, delta);
    onChange(next);
    buttons.current.get(next)?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Signing hand" className="flex items-center gap-1 text-sm" onKeyDown={onKeyDown}>
      <span className="mr-2 text-muted">hand</span>
      {HANDEDNESS_OPTIONS.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            ref={(el) => {
              if (el) buttons.current.set(option, el);
              else buttons.current.delete(option);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option)}
            className={`rounded px-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              selected ? "text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
