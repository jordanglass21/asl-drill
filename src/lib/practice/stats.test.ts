import type { LetterResult, WordResult } from "./session";
import { formatClock, formatEnded, formatSeconds, formatShortDate, summarize } from "./stats";

const l = (
  letter: string,
  result: "pass" | "miss",
  readAs: string | null = null,
  activeMs = 1000,
  confirmedBy?: LetterResult["confirmedBy"],
): LetterResult => ({ letter, result, activeMs, readAs, ...(confirmedBy ? { confirmedBy } : {}) });

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
    expect(s.words.map((w) => [w.word, w.misses])).toEqual([
      ["MAP", 1],
      ["MOM", 2],
      ["CAT", 0],
    ]);
  });

  it("finds each word's slowest letter, the first on a tie", () => {
    const slow = summarize([
      { word: "CAR", letters: [l("C", "pass", null, 900), l("A", "pass", null, 2600), l("R", "pass", null, 2600)], activeMs: 6100 },
    ]);
    expect(slow.words[0]?.slowest?.letter).toBe("A");
    expect(summarize([{ word: "", letters: [], activeMs: 0 }]).words[0]?.slowest).toBeNull();
  });

  it("ranks the slowest passed letters by their average time", () => {
    const slow = summarize([
      { word: "RAM", letters: [l("R", "pass", "U", 3000), l("A", "pass", null, 500), l("M", "pass", null, 2000)], activeMs: 5500 },
      { word: "RIM", letters: [l("R", "pass", null, 1000), l("I", "pass", null, 400), l("M", "miss", null, 8000)], activeMs: 9400 },
    ]);
    expect(slow.slowestLetters).toEqual([
      { letter: "M", averageMs: 2000, readAs: null }, // the missed M's 8 s doesn't count
      { letter: "R", averageMs: 2000, readAs: "U" },
      { letter: "A", averageMs: 500, readAs: null },
    ]);
  });

  it("lists double letters and how they were confirmed, leaving out J and Z", () => {
    const d = summarize([
      { word: "BOOK", letters: [l("B", "pass"), l("O", "pass"), l("O", "pass", null, 1000, "slide"), l("K", "pass")], activeMs: 4000 },
      { word: "BELL", letters: [l("B", "pass"), l("E", "pass"), l("L", "pass"), l("L", "miss")], activeMs: 4000 },
      { word: "JAZZ", letters: [l("J", "pass"), l("A", "pass"), l("Z", "pass"), l("Z", "pass", null, 1000, "motion")], activeMs: 4000 },
    ]);
    expect(d.doubles).toEqual([
      { word: "BOOK", letter: "O", result: "pass", confirmedBy: "slide" },
      { word: "BELL", letter: "L", result: "miss", confirmedBy: undefined },
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

describe("formatShortDate", () => {
  const now = new Date(2026, 9, 27, 18, 0);

  it("shows the time today and the day otherwise", () => {
    expect(formatShortDate(new Date(2026, 9, 27, 17, 31).toISOString(), now, "en-US")).toBe("Today 5:31 PM");
    expect(formatShortDate(new Date(2026, 9, 26, 9, 5).toISOString(), now, "en-US")).toBe("Oct 26");
    expect(formatShortDate(new Date(2025, 11, 31).toISOString(), now, "en-US")).toBe("Dec 31, 2025");
    expect(formatShortDate("nope", now)).toBe("");
  });
});

describe("formatSeconds", () => {
  it("shows one decimal", () => {
    expect(formatSeconds(2560)).toBe("2.6 s");
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
