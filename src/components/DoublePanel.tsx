import type { DetectedDouble } from "@/lib/practice/doubleCheck";
import { Flap } from "./board/Flap";
import { DOUBLE_MARKS } from "./results/WordTable";

/** The latest double letter, with its slide, bounce, or re-formed mark. */
export function DoublePanel({ double }: { double: DetectedDouble | null }) {
  const mark = double ? DOUBLE_MARKS[double.confirmedBy] : undefined;
  return (
    <section className="flex flex-col gap-2 rounded bg-rail p-3.5" aria-label="Double letter">
      <p className="label">Double letter</p>
      {double && mark ? (
        <div className="flex items-center gap-3" aria-live="polite" aria-label={`${double.letter} doubled: ${mark.meaning}`}>
          <span className="relative pt-2">
            <span
              className={`absolute top-0 -right-1.5 z-10 rounded-[2px] px-[3px] py-px font-display text-[10px] leading-none font-extrabold ${double.confirmedBy === "hold" ? "bg-edge text-label" : "bg-amber text-board"}`}
            >
              {mark.mark}
            </span>
            {/* Keyed by count so each new double flips in, even on the same letter. */}
            <Flap key={double.n} char={double.letter} state="confirmed" size="md" />
          </span>
          <span className="font-prose text-[13px] text-amber">{mark.meaning}</span>
        </div>
      ) : (
        <p className="font-prose text-xs leading-relaxed text-label">Slide or bounce a letter, or drop it and sign it again, to double it.</p>
      )}
    </section>
  );
}
