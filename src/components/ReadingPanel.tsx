import type { LiveReading } from "@/lib/classifier/live";
import { Flap } from "./board/Flap";

interface Props {
  status: "loading" | "ready" | "error";
  reading: LiveReading | null;
  threshold: number | null;
}

/** The live letter as a flap, with a confidence meter against the threshold. */
export function ReadingPanel({ status, reading, threshold }: Props) {
  const confidence = reading ? Math.round(reading.confidence * 100) : 0;
  const letter = status === "ready" ? (reading?.letter ?? reading?.best ?? "") : "";
  return (
    <aside className="flex flex-col gap-3 self-start rounded bg-rail p-3.5">
      <div>
        <p className="label mb-2">Reading</p>
        <div aria-live="polite" aria-label={reading?.letter ? `Reading ${reading.letter}` : "No letter"}>
          <Flap char={letter} state={reading?.letter ? "current" : "pending"} size="md" />
        </div>
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
        Static letters only. J and Z need motion and come later. Dim means below the {threshold !== null ? `${Math.round(threshold * 100)}% ` : ""}
        threshold.
      </p>
    </aside>
  );
}
