import type { LetterResult, WordResult } from "./session";
import { formatClock, formatEnded, summarize } from "./stats";

const l = (letter: string, result: "pass" | "miss", readAs: string | null = null): LetterResult => ({
  letter,
  result,
  activeMs: 1000,
  readAs,
});

const words: WordResult[] = [
  { word: "MAP", letters: [l("M", "miss", "S"), l("A", "pass"), l("P", "pass")], activeMs: 15_000 },
  { word: "MOM", letters: [l("M", "miss", "S"), l("O", "pass"), l("M", "miss", "N")], activeMs: 15_000 },
  { word: "CAT", letters: [l("C", "pass"), l("A", "pass"), l("T", "pass")], activeMs: 30_000 },
];

describe("summarize", () => {
  const s = summarize(words);

  it("counts passes, accuracy, and letters per active minute", () => {
    expect(s.passed).toBe(6);
    expect(s.total).toBe(9);
    expect(s.accuracy).toBeCloseTo(6 / 9);
    expect(s.activeMs).toBe(60_000);
    expect(s.lettersPerMinute).toBeCloseTo(6);
  });

  it("tracks the current and best streak", () => {
    expect(s.bestStreak).toBe(3);
    expect(s.streak).toBe(3);
  });

  it("summarizes each word", () => {
    expect(s.words.map((w) => [w.word, w.misses, Math.round(w.lettersPerMinute)])).toEqual([
      ["MAP", 1, 8],
      ["MOM", 2, 4],
      ["CAT", 0, 6],
    ]);
  });

  it("ranks the most-missed letters with what they were read as", () => {
    expect(s.mostMissed).toEqual([{ letter: "M", misses: 3, attempts: 3, readAs: "S" }]);
  });

  it("handles an empty session", () => {
    expect(summarize([])).toMatchObject({ passed: 0, total: 0, accuracy: null, lettersPerMinute: 0, bestStreak: 0 });
  });

  it("uses an explicit active time when given", () => {
    expect(summarize(words, 120_000).lettersPerMinute).toBeCloseTo(3);
  });
});

describe("formatClock", () => {
  it("formats mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(184_900)).toBe("03:04");
  });
});

describe("formatEnded", () => {
  const now = new Date(2026, 9, 27, 18, 0);

  it("says Today for a session that ended today", () => {
    expect(formatEnded(new Date(2026, 9, 27, 17, 31).toISOString(), now, "en-US")).toBe("Today 5:31 PM");
  });

  it("shows the date for an earlier day", () => {
    expect(formatEnded(new Date(2026, 9, 26, 9, 5).toISOString(), now, "en-US")).toBe("10/26/2026 9:05 AM");
  });

  it("returns an empty string for a bad timestamp", () => {
    expect(formatEnded("not a date", now)).toBe("");
  });
});
