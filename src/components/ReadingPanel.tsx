import type { LiveReading } from "@/lib/classifier/live";
import type { MotionEvent } from "@/lib/motion/detector";
import { Flap } from "./board/Flap";

interface Props {
  status: "loading" | "ready" | "error";
  reading: LiveReading | null;
  threshold: number | null;
  /** A J, Z, or double just detected, shown briefly in place of the reading. */
  motion?: MotionEvent | null;
}

/** The live letter as a flap, with a confidence meter against the threshold. */
export function ReadingPanel({ status, reading, threshold, motion = null }: Props) {
  const confidence = reading ? Math.round(reading.confidence * 100) : 0;
  const motionLetter = motion && motion.kind !== "double" ? motion.kind : null;
  const letter = motionLetter ?? (status === "ready" ? (reading?.letter ?? reading?.best ?? "") : "");
  return (
    <aside className="flex flex-col gap-3 self-start rounded bg-rail p-3.5">
      <div>
        <p className="label mb-2">Reading</p>
        <div aria-live="polite" aria-label={reading?.letter ? `Reading ${reading.letter}` : "No letter"}>
          <Flap char={letter} state={motionLetter ? "confirmed" : reading?.letter ? "current" : "pending"} size="md" animate={false} />
        </div>
        {motion && (
          <p className="mt-1.5 text-xs text-amber">
            {motion.kind === "double" ? `double letter, ${motion.style}` : `${motion.kind}, motion`}
          </p>
        )}
      </div>
      <div>
        <div className="relative h-1 overflow-hidden rounded-sm bg-amber-dim" aria-hidden>
          <div className="h-full bg-amber transition-[width] duration-100" style={{ width: `${confidence}%` }} />
          {threshold !== null && (
            <i className="absolute top-0 h-full w-px bg-cream" style={{ left: `${Math.round(threshold * 100)}%` }} />
          )}
        </div>
        <p className="mt-1 flex justify-between text-xs text-label tabular-nums">
          <span>
            {status === "error" ? "model failed" : status === "loading" ? "loading model" : reading ? "confidence" : "no hand"}
          </span>
          <span>{reading ? `${confidence}%` : ""}</span>
        </p>
      </div>
      <p className="text-[11px] leading-relaxed text-label">
        Trace J or Z, or slide or bounce a letter, to see it detected. Dim means below the{" "}
        {threshold !== null ? `${Math.round(threshold * 100)}% ` : ""}threshold.
      </p>
    </aside>
  );
}
