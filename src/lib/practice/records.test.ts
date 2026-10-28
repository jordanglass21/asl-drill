import {
  BESTS_STORAGE_KEY,
  currentBests,
  describeRecent,
  describeStanding,
  parseBests,
  rankBests,
  recentAverage,
  saveBests,
  standing,
  toBestRun,
  type BestRun,
} from "./records";
import type { SessionRecord } from "./session";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};

/** A session of 10 letters over one minute: `passed` letters per minute, at passed/10 accuracy. */
const session = (id: string, passed: number, extra: Partial<SessionRecord> = {}): SessionRecord => ({
  id,
  startedAt: "2026-10-27T17:00:00.000Z",
  endedAt: `2026-10-27T17:${id.padStart(2, "0")}:00.000Z`,
  words: [
    {
      word: "ABCDEFGHIK",
      activeMs: 60_000,
      letters: [..."ABCDEFGHIK"].map((letter, i) => ({ letter, result: i < passed ? "pass" : "miss", activeMs: 6000, readAs: null })),
    },
  ],
  ...extra,
});

const run = (id: string, lpm: number, endedAt = `2026-10-27T17:${id.padStart(2, "0")}:00.000Z`): BestRun => ({
  sessionId: id,
  endedAt,
  lettersPerMinute: lpm,
  accuracy: 1,
});

describe("toBestRun", () => {
  it("counts sessions with at least 90% accuracy", () => {
    expect(toBestRun(session("1", 9))).toEqual({ sessionId: "1", endedAt: session("1", 9).endedAt, lettersPerMinute: 9, accuracy: 0.9 });
    expect(toBestRun(session("2", 8))).toBeNull();
  });

  it("leaves out custom word lists", () => {
    expect(toBestRun(session("1", 10, { customWords: true }))).toBeNull();
  });
});

describe("rankBests", () => {
  it("keeps the top 3 by letters per minute, once per session", () => {
    expect(rankBests([run("1", 30), run("2", 50), run("3", 40), run("4", 20), run("2", 50)]).map((r) => r.sessionId)).toEqual([
      "2",
      "3",
      "1",
    ]);
  });

  it("lets the earlier run keep its place on a tie", () => {
    expect(rankBests([run("2", 40), run("1", 40)]).map((r) => r.sessionId)).toEqual(["1", "2"]);
  });
});

describe("currentBests", () => {
  it("merges stored bests with the history, so bests outlive trimmed sessions", () => {
    const bests = currentBests([run("old", 12, "2026-10-01T00:00:00.000Z")], [session("1", 9), session("2", 10), session("3", 8)]);
    expect(bests.map((b) => b.sessionId)).toEqual(["old", "2", "1"]);
  });
});

describe("standing", () => {
  const sessions = [session("1", 9), session("2", 10), session("3", 9), session("4", 10)];
  const bests = currentBests([run("old", 9.5, "2026-10-01T00:00:00.000Z")], sessions);

  it("ranks a session in the bests, with its lead or gap", () => {
    expect(bests.map((b) => b.sessionId)).toEqual(["2", "4", "old"]);
    expect(standing(sessions[1]!, bests)).toEqual({ kind: "ranked", rank: 1, ahead: 0, behindFirst: null });
    expect(standing(sessions[3]!, bests)).toEqual({ kind: "ranked", rank: 2, ahead: 0.5, behindFirst: 0 });
  });

  it("gives the gap to the last best for a session that missed out", () => {
    expect(standing(sessions[0]!, bests)).toEqual({ kind: "unranked", shortOfLast: 0.5 });
  });

  it("says why a session can't count", () => {
    expect(standing(session("5", 8), bests)).toEqual({ kind: "ineligible", reason: "accuracy" });
    expect(standing(session("6", 10, { customWords: true }), bests)).toEqual({ kind: "ineligible", reason: "customWords" });
  });
});

describe("describeStanding", () => {
  it("words each case for the personal-best box", () => {
    expect(describeStanding({ kind: "ranked", rank: 1, ahead: 4.31, behindFirst: null })).toEqual({ value: "#1", note: "4.3 ahead of #2" });
    expect(describeStanding({ kind: "ranked", rank: 1, ahead: null, behindFirst: null }).note).toBe("Your first best");
    expect(describeStanding({ kind: "ranked", rank: 3, ahead: null, behindFirst: 8.8 })).toEqual({ value: "#3", note: "8.8 behind #1" });
    expect(describeStanding({ kind: "unranked", shortOfLast: 2.4 })).toEqual({ value: "—", note: "2.4 short of #3" });
    expect(describeStanding({ kind: "ineligible", reason: "accuracy" }).note).toBe("Needs 90% accuracy");
    expect(describeStanding({ kind: "ineligible", reason: "customWords" }).note).toBe("Custom words don't count");
  });
});

describe("recentAverage", () => {
  it("averages up to 10 sessions before this one, leaving out custom lists", () => {
    const sessions = [
      ...Array.from({ length: 11 }, (_, i) => session(String(i + 1), i === 0 ? 0 : 8)),
      session("12", 10, { customWords: true }),
      session("13", 9),
    ];
    expect(recentAverage(sessions[12]!, sessions)).toEqual({ lettersPerMinute: 8, count: 10 });
    expect(recentAverage(sessions[0]!, sessions)).toBeNull();
  });
});

describe("describeRecent", () => {
  it("shows the change against recent sessions", () => {
    expect(describeRecent(48.6, { lettersPerMinute: 42.3, count: 10 })).toEqual({ text: "▲ 6.3 vs your last 10", trend: "up" });
    expect(describeRecent(37.4, { lettersPerMinute: 38.5, count: 1 })).toEqual({ text: "▼ 1.1 vs your last session", trend: "down" });
    expect(describeRecent(30, null)).toEqual({ text: "First session", trend: null });
  });
});

describe("bests storage", () => {
  it("saves the merged bests and reads them back", () => {
    const storage = memoryStorage();
    expect(saveBests(storage, [session("1", 9), session("2", 10)])).toBe(true);
    expect(saveBests(storage, [session("3", 9)])).toBe(true); // history trimmed: earlier bests survive
    expect(parseBests(storage.data.get(BESTS_STORAGE_KEY)).map((b) => b.sessionId)).toEqual(["2", "1", "3"]);
  });

  it("ignores malformed or other-version data", () => {
    expect(parseBests("not json")).toEqual([]);
    expect(parseBests(JSON.stringify({ version: 2, bests: [run("1", 1)] }))).toEqual([]);
    expect(parseBests(JSON.stringify({ version: 1, bests: [run("1", 1), { sessionId: "x" }] })).map((b) => b.sessionId)).toEqual(["1"]);
  });

  it("survives blocked storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(saveBests(blocked, [session("1", 10)])).toBe(false);
    expect(saveBests(undefined, [])).toBe(false);
  });
});
