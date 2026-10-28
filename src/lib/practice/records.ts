// Personal bests and how a session compares with recent ones. Bests are kept
// in their own localStorage entry so they outlive the MAX_SESSIONS history,
// and are always merged with the history on read, so they work before the
// entry exists. Versioned and validated like the session history.

import type { SessionRecord } from "./session";
import { summarize } from "./stats";

export const BESTS_STORAGE_KEY = "asl-drill:bests";
export const BESTS_VERSION = 1;
export const BEST_COUNT = 3;
/** Runs below this accuracy don't count, so skipping letters can't buy speed. */
export const MIN_BEST_ACCURACY = 0.9;
export const RECENT_COUNT = 10;

export interface BestRun {
  sessionId: string;
  endedAt: string;
  lettersPerMinute: number;
  accuracy: number;
}

interface StoredBests {
  version: typeof BESTS_VERSION;
  bests: BestRun[];
}

/** Why a session can't be a personal best, if it can't. */
export type Ineligible = "customWords" | "accuracy";

export function ineligibility(session: SessionRecord): Ineligible | null {
  if (session.customWords) return "customWords";
  const { accuracy } = summarize(session.words);
  return accuracy === null || accuracy < MIN_BEST_ACCURACY ? "accuracy" : null;
}

export function toBestRun(session: SessionRecord): BestRun | null {
  if (ineligibility(session)) return null;
  const s = summarize(session.words);
  return { sessionId: session.id, endedAt: session.endedAt, lettersPerMinute: s.lettersPerMinute, accuracy: s.accuracy ?? 0 };
}

/** The top BEST_COUNT runs by letters per minute; on a tie the earlier run keeps its place. */
export function rankBests(runs: Iterable<BestRun>): BestRun[] {
  const byId = new Map<string, BestRun>();
  for (const run of runs) byId.set(run.sessionId, run);
  return [...byId.values()]
    .sort((a, b) => b.lettersPerMinute - a.lettersPerMinute || a.endedAt.localeCompare(b.endedAt))
    .slice(0, BEST_COUNT);
}

/** Stored bests merged with whatever the history still holds. */
export function currentBests(stored: readonly BestRun[], sessions: readonly SessionRecord[]): BestRun[] {
  const fromHistory = sessions.map(toBestRun).filter((r): r is BestRun => r !== null);
  return rankBests([...stored, ...fromHistory]);
}

export type Standing =
  | { kind: "ranked"; rank: number; /** Lead over the next run down, if there is one. */ ahead: number | null; behindFirst: number | null }
  | { kind: "unranked"; shortOfLast: number }
  | { kind: "ineligible"; reason: Ineligible };

export function standing(session: SessionRecord, bests: readonly BestRun[]): Standing {
  const reason = ineligibility(session);
  if (reason) return { kind: "ineligible", reason };
  const i = bests.findIndex((b) => b.sessionId === session.id);
  const lpm = summarize(session.words).lettersPerMinute;
  if (i === -1) return { kind: "unranked", shortOfLast: (bests.at(-1)?.lettersPerMinute ?? lpm) - lpm };
  const next = bests[i + 1];
  return {
    kind: "ranked",
    rank: i + 1,
    ahead: next ? lpm - next.lettersPerMinute : null,
    behindFirst: i > 0 ? (bests[0]?.lettersPerMinute ?? lpm) - lpm : null,
  };
}

/**
 * Mean letters per minute of up to RECENT_COUNT sessions before this one
 * (custom word lists left out), with how many it averaged. Null if none.
 */
export function recentAverage(
  session: SessionRecord,
  sessions: readonly SessionRecord[],
): { lettersPerMinute: number; count: number } | null {
  const index = sessions.findIndex((s) => s.id === session.id);
  const before = (index === -1 ? sessions : sessions.slice(0, index)).filter((s) => !s.customWords).slice(-RECENT_COUNT);
  if (before.length === 0) return null;
  const total = before.reduce((sum, s) => sum + summarize(s.words).lettersPerMinute, 0);
  return { lettersPerMinute: total / before.length, count: before.length };
}

const isRun = (v: unknown): v is BestRun => {
  const r = v as Partial<BestRun> | null;
  return (
    !!r && typeof r.sessionId === "string" && typeof r.endedAt === "string" &&
    Number.isFinite(r.lettersPerMinute) && Number.isFinite(r.accuracy)
  );
};

export function parseBests(raw: string | null | undefined): BestRun[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as Partial<StoredBests>;
    if (data.version !== BESTS_VERSION || !Array.isArray(data.bests)) return [];
    return data.bests.filter(isRun);
  } catch {
    return [];
  }
}

/** Folds the given history into the stored bests. */
export function saveBests(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  sessions: readonly SessionRecord[],
): boolean {
  try {
    if (!storage) return false;
    const value: StoredBests = { version: BESTS_VERSION, bests: currentBests(parseBests(storage.getItem(BESTS_STORAGE_KEY)), sessions) };
    storage.setItem(BESTS_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** The personal-best box: a rank (or "—") and the line under it. */
export function describeStanding(s: Standing): { value: string; note: string } {
  switch (s.kind) {
    case "ranked":
      if (s.rank === 1) return { value: "#1", note: s.ahead === null ? "Your first best" : `${s.ahead.toFixed(1)} ahead of #2` };
      return { value: `#${s.rank}`, note: `${(s.behindFirst ?? 0).toFixed(1)} behind #1` };
    case "unranked":
      return { value: "—", note: `${s.shortOfLast.toFixed(1)} short of #${BEST_COUNT}` };
    case "ineligible":
      return {
        value: "—",
        note: s.reason === "customWords" ? "Custom words don't count" : `Needs ${MIN_BEST_ACCURACY * 100}% accuracy`,
      };
  }
}

/** The line under letters per minute, e.g. "▲ 6.3 vs your last 10". */
export function describeRecent(lettersPerMinute: number, recent: ReturnType<typeof recentAverage>): {
  text: string;
  trend: "up" | "down" | null;
} {
  if (!recent) return { text: "First session", trend: null };
  const delta = lettersPerMinute - recent.lettersPerMinute;
  const than = recent.count === 1 ? "your last session" : `your last ${recent.count}`;
  return { text: `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)} vs ${than}`, trend: delta >= 0 ? "up" : "down" };
}
