import type { BestRun } from "@/lib/practice/records";
import { MIN_BEST_ACCURACY } from "@/lib/practice/records";
import { formatSeconds, formatShortDate, type DoubleLetter, type MissedLetter, type SlowLetter } from "@/lib/practice/stats";
import { Flap } from "../board/Flap";

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded bg-rail px-3.5 py-3">
      <p className="label">
        {title}
        {note && <span className="text-cream-dim"> / {note}</span>}
      </p>
      {children}
    </section>
  );
}

export function PersonalBests({ bests, sessionId, isLatest }: { bests: BestRun[]; sessionId: string; isLatest: boolean }) {
  return (
    <Panel title="Personal bests" note="letters per min">
      {bests.length === 0 ? (
        <p className="mt-2 text-xs text-label">None yet. Finish a session with {MIN_BEST_ACCURACY * 100}% accuracy to set one.</p>
      ) : (
        <ol className="mt-2 flex flex-col">
          {bests.map((run, i) => {
            const mine = run.sessionId === sessionId;
            return (
              <li
                key={run.sessionId}
                className={`grid grid-cols-[22px_48px_40px_1fr] items-baseline gap-2.5 rounded-[3px] px-1.5 py-1 tabular-nums ${mine ? "bg-amber/10" : ""}`}
              >
                <span className={`font-display text-lg font-extrabold ${mine ? "text-amber" : "text-cream-dim"}`}>{i + 1}</span>
                <span className={`text-sm ${mine ? "text-amber" : "text-cream"}`}>{run.lettersPerMinute.toFixed(1)}</span>
                <span className="text-xs text-label">{Math.round(run.accuracy * 100)}%</span>
                <span className="text-right text-xs text-label">{mine && isLatest ? "This run" : formatShortDate(run.endedAt)}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-2 px-1.5 text-xs leading-normal text-label">
        Sessions under {MIN_BEST_ACCURACY * 100}% accuracy or with custom words don&apos;t count.
      </p>
    </Panel>
  );
}

const DOUBLE_STATUS = {
  slide: { text: "Slide", className: "text-amber" },
  bounce: { text: "Bounce", className: "text-amber" },
  hold: { text: "Re-formed", className: "text-label" },
  motion: { text: "Motion", className: "text-amber" },
} as const;

/** Each double letter and whether the slide/bounce was seen. Hidden for sessions saved before this was recorded. */
export function DoubleLetters({ doubles }: { doubles: DoubleLetter[] }) {
  if (doubles.length === 0 || doubles.some((d) => d.result === "pass" && !d.confirmedBy)) return null;
  const byMotion = doubles.filter((d) => d.confirmedBy === "slide" || d.confirmedBy === "bounce").length;
  return (
    <Panel title="Double letters" note={`${byMotion} of ${doubles.length} by motion`}>
      <ul className="mt-2 flex flex-col gap-2">
        {doubles.map((d, i) => {
          const status = d.result === "miss" ? { text: "Missed", className: "text-miss" } : DOUBLE_STATUS[d.confirmedBy ?? "hold"];
          return (
            <li key={i} className="grid grid-cols-[46px_1fr_auto] items-center gap-3 text-xs text-label">
              <span className="flex gap-[3px]">
                {[0, 1].map((k) => (
                  <Flap key={k} char={d.letter} size="xs" state={d.result === "miss" && k === 1 ? "missed" : "confirmed"} animate={false} />
                ))}
              </span>
              <span>{d.word}</span>
              <span className={`signage text-[15px] ${status.className}`}>{status.text}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function SlowestLetters({ letters }: { letters: SlowLetter[] }) {
  if (letters.length === 0) return null;
  return (
    <Panel title="Slowest letters">
      <ul className="mt-2 flex flex-col gap-2.5">
        {letters.map((l) => (
          <li key={l.letter} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
            <Flap char={l.letter} size="sm" state="confirmed" animate={false} />
            <span className="text-xs leading-normal text-label">
              {l.readAs ? (
                <>
                  Often read as <b className="font-medium text-cream">{l.readAs}</b> first
                </>
              ) : (
                "Average time to confirm"
              )}
            </span>
            <span className="text-sm tabular-nums">{formatSeconds(l.averageMs)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function MostMissed({ letters }: { letters: MissedLetter[] }) {
  return (
    <Panel title="Most missed">
      {letters.length === 0 ? (
        <p className="mt-2 text-xs text-label">Nothing missed. Clean run.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2.5">
          {letters.map((m) => (
            <li key={m.letter} className="grid grid-cols-[34px_1fr_auto] items-center gap-3">
              <Flap char={m.letter} size="sm" state="missed" animate={false} />
              <span className="text-xs leading-normal text-label">
                {m.readAs ? (
                  <>
                    Read as <b className="font-medium text-cream">{m.readAs}</b> most often
                  </>
                ) : (
                  "Skipped or timed out"
                )}
              </span>
              <span className="text-sm tabular-nums">
                {m.misses} of {m.attempts}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
