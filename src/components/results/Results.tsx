"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSessions } from "@/hooks/useSessions";
import { findSession } from "@/lib/practice/storage";
import { formatClock, formatEnded, summarize } from "@/lib/practice/stats";
import { BoardButton } from "../board/BoardButton";
import { Departures } from "../board/Departures";
import { Flap } from "../board/Flap";
import { FlapWord } from "../board/FlapWord";
import { KeyHints } from "../board/KeyHints";

export function Results() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const sessions = useSessions();
  const session = sessions ? findSession(sessions, id) : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") router.push("/play");
      else if (event.key === "Escape") router.push("/camera");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const hints = (
    <KeyHints hints={[{ keys: "enter", text: "new session" }, { keys: "esc", text: "camera check" }]}>
      <p className="label">Stats saved on this device</p>
    </KeyHints>
  );

  if (sessions === null) return hints;
  if (!session) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <FlapWord text="NO DATA" size="sm" />
          <p className="font-display text-2xl font-extrabold uppercase tracking-[0.04em]">No sessions yet</p>
          <p className="text-xs text-label">Play a session and your results land here.</p>
          <BoardButton onClick={() => router.push("/play")}>Play</BoardButton>
        </div>
        {hints}
      </>
    );
  }

  const s = summarize(session.words);
  return (
    <>
      <div className="flex flex-col items-center gap-1.5">
        <FlapWord text="COMPLETE" state="confirmed" size="sm" />
        <dl className="flex gap-7">
          <div className="flex flex-col items-center gap-0.5">
            <dt className="label">Words</dt>
            <dd className="text-sm text-cream tabular-nums">{session.words.length}</dd>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <dt className="label">Ended</dt>
            <dd className="text-sm text-cream tabular-nums">{formatEnded(session.endedAt)}</dd>
          </div>
        </dl>
      </div>

      <Departures
        items={[
          { label: "Letters / min", value: s.lettersPerMinute.toFixed(1), highlight: true },
          { label: "Accuracy", value: s.accuracy != null ? Math.round(s.accuracy * 100) : "—", unit: s.accuracy != null ? "%" : undefined },
          { label: "Letters", value: s.passed, unit: `/ ${s.total}` },
          { label: "Best streak", value: s.bestStreak, highlight: true },
          { label: "Time", value: formatClock(s.activeMs) },
        ]}
      />

      <div className="grid items-start gap-2.5 md:grid-cols-[1fr_300px]">
        <section className="overflow-x-auto rounded bg-rail px-3.5 py-3">
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr>
                <th className="label pr-2 pb-1.5 text-left font-normal">Word</th>
                <th className="label pr-2 pb-1.5 text-right font-normal">Time</th>
                <th className="label pr-2 pb-1.5 text-right font-normal">Letters / min</th>
                <th className="label pb-1.5 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {s.words.map((word, i) => (
                <tr key={i} className="border-t border-board">
                  <td className="py-[3px] pr-2">
                    <div className="flex gap-[3px]" aria-label={word.word}>
                      {word.letters.map((letter, j) => (
                        <Flap
                          key={j}
                          char={letter.letter}
                          size="xs"
                          state={letter.result === "pass" ? "confirmed" : "missed"}
                          animate={false}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="pr-2 text-right text-sm">{formatClock(word.activeMs)}</td>
                  <td className="pr-2 text-right text-sm">{word.lettersPerMinute.toFixed(1)}</td>
                  <td className={`text-right signage text-[15px] ${word.misses ? "text-miss" : "text-amber"}`}>
                    {word.misses ? `${word.misses} missed` : "On time"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded bg-rail px-3.5 py-3">
          <p className="label">Most missed</p>
          {s.mostMissed.length === 0 ? (
            <p className="mt-2 text-xs text-label">Nothing missed. Clean run.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2.5">
              {s.mostMissed.map((m) => (
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
        </section>
      </div>
      {hints}
    </>
  );
}
