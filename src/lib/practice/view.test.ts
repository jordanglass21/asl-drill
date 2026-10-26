import { initialPracticeState, practiceReducer, type PracticeEvent, type PracticeState } from "./session";
import { boardView } from "./view";

const ISO = "2026-10-26T18:00:00.000Z";
function play(events: PracticeEvent[]): PracticeState {
  return events.reduce<PracticeState>((state, event) => practiceReducer(state, event), initialPracticeState);
}
const reading = (now: number, letter: string | null): PracticeEvent => ({ type: "reading", now, letter, hand: true });
const holdC = Array.from({ length: 12 }, (_, i) => reading(33 * (i + 1), "C"));

describe("boardView", () => {
  it("is null outside a session", () => {
    expect(boardView(initialPracticeState, 0)).toBeNull();
  });

  it("marks confirmed, current, and pending tiles", () => {
    const state = play([{ type: "start", now: 0, id: "s", startedAt: ISO, words: ["CAT", "DOG"] }, ...holdC]);
    const view = boardView(state, 400);
    expect(view?.tiles.map((t) => t.state)).toEqual(["confirmed", "current", "pending"]);
    expect(view).toMatchObject({ word: "CAT", wordNumber: 1, wordCount: 2, target: "A", upcoming: ["T"] });
    expect(view?.summary.passed).toBe(1);
  });

  it("shows a missed tile after a skip", () => {
    const state = play([{ type: "start", now: 0, id: "s", startedAt: ISO, words: ["CAT"] }, { type: "skipLetter", now: 10 }]);
    expect(boardView(state, 10)?.tiles[0]?.state).toBe("missed");
  });

  it("flags a confident wrong reading and fills the hold meter for the right one", () => {
    const start: PracticeEvent = { type: "start", now: 0, id: "s", startedAt: ISO, words: ["CAT"] };
    expect(boardView(play([start, reading(33, "S")]), 33)?.wrongReading).toBe("S");
    const holding = play([start, reading(33, "C"), reading(66, "C"), reading(99, "C"), reading(132, "C"), reading(165, "C")]);
    const view = boardView(holding, 183);
    expect(view?.wrongReading).toBeNull();
    expect(view?.hold).toBeCloseTo(0.5, 1);
  });
});
