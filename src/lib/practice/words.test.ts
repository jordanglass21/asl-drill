import { hasDoubleLetter, needsMotion, parseWordList, pickWords, playableWords, seededRandom, WORDS } from "./words";

describe("word list", () => {
  it("has a few hundred unique, uppercase, 3–7 letter words", () => {
    expect(WORDS.length).toBeGreaterThan(300);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    for (const word of WORDS) expect(word).toMatch(/^[A-Z]{3,7}$/);
  });

  it("includes motion and double-letter words for M6", () => {
    expect(WORDS.filter(needsMotion).length).toBeGreaterThan(5);
    expect(WORDS.filter(hasDoubleLetter).length).toBeGreaterThan(5);
  });
});

describe("playableWords", () => {
  const sample = ["JAZZ", "BOOK", "PLANET", "ZERO", "JOKE", "SMILE"];

  it("plays everything by default", () => {
    expect(playableWords(sample)).toEqual(sample);
    expect(playableWords()).toEqual([...WORDS]);
  });

  it("can leave out motion letters or doubles", () => {
    expect(playableWords(sample, { motion: false })).toEqual(["BOOK", "PLANET", "SMILE"]);
    expect(playableWords(sample, { doubles: false })).toEqual(["PLANET", "ZERO", "JOKE", "SMILE"]);
    expect(playableWords(sample, { motion: false, doubles: false })).toEqual(["PLANET", "SMILE"]);
  });
});

describe("pickWords", () => {
  const pool = ["ONE", "TWO", "SIX", "TEN", "CAR"];

  it("is reproducible with a seed and never repeats", () => {
    const a = pickWords(pool, 4, seededRandom(42));
    expect(a).toEqual(pickWords(pool, 4, seededRandom(42)));
    expect(new Set(a).size).toBe(4);
  });

  it("returns the whole pool when asked for more", () => {
    expect(pickWords(pool, 10, seededRandom(1)).sort()).toEqual([...pool].sort());
  });

  it("avoids excluded words", () => {
    expect(pickWords(pool, 5, seededRandom(3), ["ONE", "TWO"]).sort()).toEqual(["CAR", "SIX", "TEN"]);
  });
});

describe("parseWordList", () => {
  it("reads a comma-separated list", () => {
    expect(parseWordList("jazz, Book,JELLY")).toEqual(["JAZZ", "BOOK", "JELLY"]);
  });

  it("drops invalid entries and rejects empty lists", () => {
    expect(parseWordList("jazz,a,b2,")).toEqual(["JAZZ"]);
    expect(parseWordList("")).toBeNull();
    expect(parseWordList(null)).toBeNull();
    expect(parseWordList("1,2")).toBeNull();
  });
});
