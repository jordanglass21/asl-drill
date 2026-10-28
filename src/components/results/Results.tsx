"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useSessions, useStoredBests } from "@/hooks/useSessions";
import { currentBests, describeRecent, describeStanding, recentAverage, standing } from "@/lib/practice/records";
import { findSession } from "@/lib/practice/storage";
import { formatClock, formatEnded, summarize } from "@/lib/practice/stats";
import { BoardButton } from "../board/BoardButton";
import { Departures } from "../board/Departures";
import { FlapWord } from "../board/FlapWord";
import { KeyHints } from "../board/KeyHints";
import { DoubleLetters, MostMissed, PersonalBests, SlowestLetters } from "./SidePanels";
import { WordTable } from "./WordTable";

export function Results() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const sessions = useSessions();
  const storedBests = useStoredBests();
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
  const isLatest = sessions.at(-1)?.id === session.id;
  const bests = currentBests(storedBests, sessions);
  const place = standing(session, bests);
  const best = describeStanding(place);
  const recent = describeRecent(s.lettersPerMinute, recentAverage(session, sessions));
  const newBest = isLatest && place.kind === "ranked" && place.rank === 1;

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <FlapWord text="COMPLETE" state="confirmed" size="sm" />
        {newBest && <FlapWord text="NEW BEST" state="confirmed" size="xs" />}
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
          {
            label: "Letters / min",
            value: s.lettersPerMinute.toFixed(1),
            highlight: true,
            span: 1.2,
            sub: recent.trend ? (
              <>
                <span className={recent.trend === "up" ? "text-amber" : "text-miss"}>{recent.text.slice(0, recent.text.indexOf(" vs "))}</span>
                {recent.text.slice(recent.text.indexOf(" vs "))}
              </>
            ) : (
              recent.text
            ),
          },
          {
            label: "Accuracy",
            value: s.accuracy != null ? Math.round(s.accuracy * 100) : "—",
            unit: s.accuracy != null ? "%" : undefined,
            sub: `${s.passed} of ${s.total} letters`,
          },
          { label: "Time", value: formatClock(s.activeMs), sub: "Signing, pauses left out" },
          { label: "Personal best", value: best.value, highlight: place.kind === "ranked", sub: best.note },
        ]}
      />

      <div className="grid items-start gap-2.5 md:grid-cols-[1fr_300px]">
        <WordTable summary={s} />
        <div className="flex flex-col gap-2.5">
          <PersonalBests bests={bests} sessionId={session.id} isLatest={isLatest} />
          <DoubleLetters doubles={s.doubles} />
          <SlowestLetters letters={s.slowestLetters} />
          <MostMissed letters={s.mostMissed} />
        </div>
      </div>
      {hints}
    </>
  );
}
