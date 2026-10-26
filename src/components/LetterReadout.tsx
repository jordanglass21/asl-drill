import type { LiveReading } from "@/lib/classifier/live";

interface Props {
  status: "loading" | "ready" | "error";
  reading: LiveReading | null;
}

/** The live predicted letter and its confidence, overlaid on the preview. */
export function LetterReadout({ status, reading }: Props) {
  const confidence = reading ? Math.round(reading.confidence * 100) : 0;
  return (
    <div className="pointer-events-none absolute right-4 top-4 flex w-28 flex-col items-center gap-2 rounded-lg bg-background/80 px-3 py-3">
      <p aria-live="polite" className={`text-6xl leading-none ${reading?.letter ? "text-accent" : "text-muted"}`}>
        {status !== "ready" ? "…" : (reading?.letter ?? reading?.best.toLowerCase() ?? "–")}
      </p>
      <div className="h-1 w-full overflow-hidden rounded bg-surface" aria-hidden>
        <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${confidence}%` }} />
      </div>
      <p className="text-xs text-muted">
        {status === "error" ? "model failed to load" : status === "loading" ? "loading model" : reading ? `${confidence}%` : "no hand"}
      </p>
    </div>
  );
}
