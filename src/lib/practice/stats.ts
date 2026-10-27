// Session statistics for the live departures row and the results screen.

import type { WordResult } from "./session";

export interface WordSummary {
  word: string;
  letters: WordResult["letters"];
  activeMs: number;
  lettersPerMinute: number;
  misses: number;
}

export interface MissedLetter {
  letter: string;
  misses: number;
  attempts: number;
  /** The wrong letter it was most often read as when missed, if any. */
  readAs: string | null;
}

export interface SessionSummary {
  passed: number;
  total: number;
  /** 0–1, or null before any letter. */
  accuracy: number | null;
  /** Correctly confirmed letters per minute of active practice. */
  lettersPerMinute: number;
  activeMs: number;
  streak: number;
  bestStreak: number;
  words: WordSummary[];
  mostMissed: MissedLetter[];
}

const perMinute = (count: number, ms: number) => (ms > 0 ? (count / ms) * 60_000 : 0);

export function summarize(words: readonly WordResult[], activeMs?: number): SessionSummary {
  let passed = 0;
  let total = 0;
  let streak = 0;
  let bestStreak = 0;
  const byLetter = new Map<string, { attempts: number; misses: number; readAs: Map<string, number> }>();

  for (const word of words) {
    for (const result of word.letters) {
      total += 1;
      const entry = byLetter.get(result.letter) ?? { attempts: 0, misses: 0, readAs: new Map() };
      entry.attempts += 1;
      if (result.result === "pass") {
        passed += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
        entry.misses += 1;
        if (result.readAs) entry.readAs.set(result.readAs, (entry.readAs.get(result.readAs) ?? 0) + 1);
      }
      byLetter.set(result.letter, entry);
    }
  }

  const totalMs = activeMs ?? words.reduce((sum, w) => sum + w.activeMs, 0);
  const mostMissed: MissedLetter[] = [...byLetter.entries()]
    .filter(([, e]) => e.misses > 0)
    .map(([letter, e]) => {
      let readAs: string | null = null;
      for (const [l, n] of e.readAs) if (readAs === null || n > (e.readAs.get(readAs) ?? 0)) readAs = l;
      return { letter, misses: e.misses, attempts: e.attempts, readAs };
    })
    .sort((a, b) => b.misses - a.misses || b.misses / b.attempts - a.misses / a.attempts || a.letter.localeCompare(b.letter))
    .slice(0, 5);

  return {
    passed,
    total,
    accuracy: total ? passed / total : null,
    lettersPerMinute: perMinute(passed, totalMs),
    activeMs: totalMs,
    streak,
    bestStreak,
    words: words.map((w) => {
      const wordPassed = w.letters.filter((l) => l.result === "pass").length;
      return {
        word: w.word,
        letters: w.letters,
        activeMs: w.activeMs,
        lettersPerMinute: perMinute(wordPassed, w.activeMs),
        misses: w.letters.length - wordPassed,
      };
    }),
    mostMissed,
  };
}

/** mm:ss for the departures board. */
export function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** When a session ended, e.g. "Today 5:31 PM" or "10/26/2026 5:31 PM"; "" if unparseable. */
export function formatEnded(iso: string, now: Date = new Date(), locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const day = date.toDateString() === now.toDateString() ? "Today" : date.toLocaleDateString(locale);
  return `${day} ${time}`;
}
