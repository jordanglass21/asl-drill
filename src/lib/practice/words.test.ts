import { hasDoubleLetter, needsMotion, pickWords, playableWords, seededRandom, WORDS } from "./words";

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
  it("drops J, Z, and double letters", () => {
    expect(playableWords(["JAZZ", "BOOK", "PLANET", "ZERO", "JOKE", "SMILE"])).toEqual(["PLANET", "SMILE"]);
  });

  it("leaves plenty to play", () => {
    expect(playableWords().length).toBeGreaterThan(200);
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
