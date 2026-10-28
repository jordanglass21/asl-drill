// Session statistics for the live departures row and the results screen.

import { MOTION_LETTERS, type LetterResult, type WordResult } from "./session";

export interface WordSummary {
  word: string;
  letters: WordResult["letters"];
  activeMs: number;
  misses: number;
  /** The letter that took longest, if the word has any. */
  slowest: LetterResult | null;
}

export interface MissedLetter {
  letter: string;
  misses: number;
  attempts: number;
  /** The wrong letter it was most often read as when missed, if any. */
  readAs: string | null;
}

export interface SlowLetter {
  letter: string;
  /** Mean active time to confirm it. */
  averageMs: number;
  /** The wrong letter it was most often read as on the way, if any. */
  readAs: string | null;
}

/** The second letter of a double (the second O in BOOK), and how it went. */
export interface DoubleLetter {
  word: string;
  letter: string;
  result: LetterResult["result"];
  confirmedBy: LetterResult["confirmedBy"];
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
  slowestLetters: SlowLetter[];
  doubles: DoubleLetter[];
}

const TOP_LETTERS = 3;

function mostCommon(counts: Map<string, number>): string | null {
  let best: string | null = null;
  for (const [key, n] of counts) if (best === null || n > (counts.get(best) ?? 0)) best = key;
  return best;
}

const perMinute = (count: number, ms: number) => (ms > 0 ? (count / ms) * 60_000 : 0);

export function summarize(words: readonly WordResult[], activeMs?: number): SessionSummary {
  let passed = 0;
  let total = 0;
  let streak = 0;
  let bestStreak = 0;
  const byLetter = new Map<string, { attempts: number; misses: number; readAs: Map<string, number> }>();
  const passedBy = new Map<string, { ms: number; count: number; readAs: Map<string, number> }>();
  const doubles: DoubleLetter[] = [];

  for (const word of words) {
    word.letters.forEach((result, i) => {
      if (i > 0 && word.word[i] === word.word[i - 1] && !MOTION_LETTERS.has(result.letter)) {
        doubles.push({ word: word.word, letter: result.letter, result: result.result, confirmedBy: result.confirmedBy });
      }
      total += 1;
      const entry = byLetter.get(result.letter) ?? { attempts: 0, misses: 0, readAs: new Map() };
      entry.attempts += 1;
      if (result.result === "pass") {
        passed += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        const slow = passedBy.get(result.letter) ?? { ms: 0, count: 0, readAs: new Map() };
        slow.ms += result.activeMs;
        slow.count += 1;
        if (result.readAs) slow.readAs.set(result.readAs, (slow.readAs.get(result.readAs) ?? 0) + 1);
        passedBy.set(result.letter, slow);
      } else {
        streak = 0;
        entry.misses += 1;
        if (result.readAs) entry.readAs.set(result.readAs, (entry.readAs.get(result.readAs) ?? 0) + 1);
      }
      byLetter.set(result.letter, entry);
    });
  }

  const totalMs = activeMs ?? words.reduce((sum, w) => sum + w.activeMs, 0);
  const mostMissed: MissedLetter[] = [...byLetter.entries()]
    .filter(([, e]) => e.misses > 0)
    .map(([letter, e]) => ({ letter, misses: e.misses, attempts: e.attempts, readAs: mostCommon(e.readAs) }))
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
    words: words.map((w) => ({
      word: w.word,
      letters: w.letters,
      activeMs: w.activeMs,
      misses: w.letters.filter((l) => l.result === "miss").length,
      slowest: w.letters.reduce<LetterResult | null>((a, l) => (a === null || l.activeMs > a.activeMs ? l : a), null),
    })),
    mostMissed,
    slowestLetters: [...passedBy.entries()]
      .map(([letter, e]) => ({ letter, averageMs: e.ms / e.count, readAs: mostCommon(e.readAs) }))
      .sort((a, b) => b.averageMs - a.averageMs || a.letter.localeCompare(b.letter))
      .slice(0, TOP_LETTERS),
    doubles,
  };
}

/** mm:ss for the departures board. */
export function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A short date for lists: "Today 5:31 PM", or "Oct 26" for an earlier day; "" if unparseable. */
export function formatShortDate(iso: string, now: Date = new Date(), locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) return formatEnded(iso, now, locale);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Seconds to one decimal, e.g. "2.6 s". */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

/** When a session ended, e.g. "Today 5:31 PM" or "10/26/2026 5:31 PM"; "" if unparseable. */
export function formatEnded(iso: string, now: Date = new Date(), locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const day = date.toDateString() === now.toDateString() ? "Today" : date.toLocaleDateString(locale);
  return `${day} ${time}`;
}
