import { emptyAnswers, hasAnswers, NONE, toFormBody, toggleLetter } from "./form";

describe("toggleLetter", () => {
  it("adds and removes letters", () => {
    expect(toggleLetter(toggleLetter([], "K"), "T")).toEqual(["K", "T"]);
    expect(toggleLetter(["K", "T"], "K")).toEqual(["T"]);
  });

  it("treats None and letters as exclusive", () => {
    expect(toggleLetter(["K", "T"], NONE)).toEqual([NONE]);
    expect(toggleLetter([NONE], "K")).toEqual(["K"]);
    expect(toggleLetter([NONE], NONE)).toEqual([]);
  });
});

describe("hasAnswers", () => {
  it("needs at least one answer", () => {
    expect(hasAnswers(emptyAnswers)).toBe(false);
    expect(hasAnswers({ ...emptyAnswers, notes: "   " })).toBe(false);
    expect(hasAnswers({ ...emptyAnswers, speed: "Too slow" })).toBe(true);
    expect(hasAnswers({ ...emptyAnswers, bounce: "Didn't work" })).toBe(true);
    expect(hasAnswers({ ...emptyAnswers, letters: [NONE] })).toBe(true);
  });
});

describe("toFormBody", () => {
  it("sends each answer to its field, letters alphabetically", () => {
    const body = toFormBody({
      letters: ["T", "K"],
      slide: "Worked",
      bounce: "Didn't try",
      speed: "About right",
      experience: "Some",
      notes: " slow on M ",
    });
    expect([...body]).toEqual([
      ["entry.129497468", "K"],
      ["entry.129497468", "T"],
      ["entry.973102069", "Worked"],
      ["entry.1391201748", "Didn't try"],
      ["entry.198617729", "About right"],
      ["entry.186512009", "Some"],
      ["entry.253944935", "slow on M"],
    ]);
  });

  it("leaves out unanswered questions", () => {
    expect([...toFormBody({ ...emptyAnswers, letters: [NONE] })]).toEqual([["entry.129497468", "None"]]);
  });
});
