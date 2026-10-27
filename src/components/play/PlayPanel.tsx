import type { LiveReading } from "@/lib/classifier/live";
import type { TargetMode } from "@/lib/practice/view";
import { BoardButton } from "../board/BoardButton";
import { Flap } from "../board/Flap";

interface Props {
  reading: LiveReading | null;
  target: string | null;
  mode: TargetMode;
  wrongReading: string | null;
  hold: number;
  upcoming: string[];
  canStart: boolean;
  playing: boolean;
  onStart: () => void;
}

/** Side panel: what the model reads, the hold meter, and what's next. */
const MOTION_CUES: Record<string, string> = {
  J: "I hand, then hook the pinky down",
  Z: "point, then draw a Z",
};

export function PlayPanel({ reading, target, mode, wrongReading, hold, upcoming, canStart, playing, onStart }: Props) {
  const shown = wrongReading ?? reading?.letter ?? reading?.best ?? "";
  const state = wrongReading ? "missed" : reading?.letter ? "current" : "pending";
  return (
    <aside className="flex flex-col gap-3 self-start rounded bg-rail p-3.5">
      <div>
        <p className="label mb-2">Reading</p>
        <div className="flex items-end gap-3">
          <Flap char={playing ? shown : ""} state={playing ? state : "pending"} size="md" animate={false} />
          <p aria-live="polite" className="pb-1 text-xs leading-snug">
            {playing && wrongReading && target ? (
              <span className="text-miss">
                not {target}
                <br />
                <span className="text-label">keep trying</span>
              </span>
            ) : playing && mode === "motion" && target ? (
              <span className="text-amber">{MOTION_CUES[target]}</span>
            ) : playing && mode === "double" ? (
              <span className="text-amber">slide or bounce it</span>
            ) : playing && reading?.letter && reading.letter === target ? (
              <span className="text-amber">hold it</span>
            ) : null}
          </p>
        </div>
      </div>
      <div>
        <div className="h-1 overflow-hidden rounded-sm bg-amber-dim" aria-hidden>
          <div className="h-full bg-amber" style={{ width: `${Math.round(hold * 100)}%` }} />
        </div>
        <p className="mt-1 flex justify-between text-xs text-label tabular-nums">
          <span>{mode === "hold" ? "hold" : mode === "motion" ? "motion" : "double"}</span>
          <span>{Math.round(hold * 100)}%</span>
        </p>
      </div>
      {playing ? (
        <div>
          <p className="label mb-1">Next</p>
          <p className="flex flex-wrap gap-x-3 signage text-lg text-cream">{upcoming.length ? upcoming.map((word, i) => <span key={i}>{word}</span>) : "—"}</p>
        </div>
      ) : (
        <BoardButton onClick={onStart} disabled={!canStart}>
          {canStart ? "Start" : "Waiting for camera"}
        </BoardButton>
      )}
    </aside>
  );
}
