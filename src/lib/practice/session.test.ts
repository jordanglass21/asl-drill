import type { MotionEvent } from "@/lib/motion/detector";
import {
  DEFAULT_PRACTICE_CONFIG,
  initialPracticeState,
  practiceReducer,
  targetLetter,
  wordsSoFar,
  type PracticeEvent,
  type PracticeState,
} from "./session";

const config = DEFAULT_PRACTICE_CONFIG;
const ISO = "2026-10-26T18:00:00.000Z";

/** Drives a session at 30 fps, with a tick alongside each reading like the app. */
class Sim {
  state: PracticeState = initialPracticeState;
  now = 0;

  send(event: PracticeEvent) {
    this.state = practiceReducer(this.state, event, config);
    return this;
  }
  start(words: string[]) {
    return this.send({ type: "start", now: this.now, id: "s1", startedAt: ISO, words });
  }
  /** Shows `letter` (null = hand in view but no confident letter, undefined = no hand) for `ms`. */
  show(letter: string | null | undefined, ms: number, hidden = false) {
    const end = this.now + ms;
    while (this.now < end) {
      this.now += 33;
      if (letter !== undefined) this.send({ type: "reading", now: this.now, letter, hand: true });
      this.send({ type: "tick", now: this.now, hidden, isoNow: ISO });
    }
    return this;
  }
  spell(word: string, holdMs = 400) {
    for (const letter of word) this.show(letter, holdMs).show(null, 100);
    return this;
  }
  motion(motion: MotionEvent) {
    return this.send({ type: "motion", now: this.now, motion });
  }
  /** Waits out the pause between words. */
  pause() {
    return this.show(null, config.wordPauseMs + 100);
  }
  get playing() {
    if (this.state.phase !== "playing") throw new Error(`not playing (${this.state.phase})`);
    return this.state;
  }
}

describe("practiceReducer", () => {
  it("passes letters held for the hold time and moves through the word", () => {
    const sim = new Sim().start(["CAT", "DOG"]);
    expect(targetLetter(sim.playing)).toBe("C");
    sim.show("C", 400);
    expect(sim.playing.current.map((l) => [l.letter, l.result])).toEqual([["C", "pass"]]);
    expect(targetLetter(sim.playing)).toBe("A");
  });

  it("pauses between words, then shows the next one", () => {
    const sim = new Sim().start(["CAT", "DOG"]).spell("CAT");
    expect(sim.playing.wordDoneAt).not.toBeNull();
    expect(targetLetter(sim.playing)).toBeNull();
    sim.pause();
    expect(sim.playing.wordIndex).toBe(1);
    expect(sim.playing.done[0]?.letters.every((l) => l.result === "pass")).toBe(true);
    expect(targetLetter(sim.playing)).toBe("D");
  });

  it("never fails a letter for a wrong handshape, and records what it was read as", () => {
    const sim = new Sim().start(["MAP"]).show("S", 3000);
    expect(sim.playing.current).toEqual([]);
    sim.show("M", 400);
    expect(sim.playing.current[0]).toMatchObject({ letter: "M", result: "pass", readAs: "S" });
  });

  it("misses a letter after 8 s of active time", () => {
    const sim = new Sim().start(["MAP"]).show("S", 8100);
    expect(sim.playing.current[0]).toMatchObject({ letter: "M", result: "miss", readAs: "S" });
    expect(targetLetter(sim.playing)).toBe("A");
  });

  it("doesn't count time without a hand or while the tab is hidden", () => {
    const sim = new Sim().start(["MAP"]);
    sim.show(undefined, 20_000); // hand out of view
    sim.show("S", 20_000, true); // tab hidden
    expect(sim.playing.current).toEqual([]);
    expect(sim.playing.activeMs).toBeLessThan(config.idleAfterMs + 100);
  });

  it("skips a letter as a miss", () => {
    const sim = new Sim().start(["MAP"]).show("S", 500);
    sim.send({ type: "skipLetter", now: sim.now });
    expect(sim.playing.current[0]).toMatchObject({ letter: "M", result: "miss", skipped: true });
  });

  it("replaces the current word without counting it", () => {
    const sim = new Sim().start(["MAP", "CAT"]).show("M", 400);
    sim.send({ type: "replaceWord", now: sim.now, word: "dog" });
    expect(sim.playing.words).toEqual(["DOG", "CAT"]);
    expect(sim.playing.current).toEqual([]);
    expect(targetLetter(sim.playing)).toBe("D");
  });

  it("finishes with a record of every word", () => {
    const sim = new Sim().start(["CAT", "DOG"]).spell("CAT").pause().show("D", 400).show("Q", 8200).spell("G").pause();
    expect(sim.state.phase).toBe("done");
    if (sim.state.phase !== "done") return;
    const { record } = sim.state;
    expect(record).toMatchObject({ id: "s1", startedAt: ISO, endedAt: ISO });
    expect(record.words.map((w) => w.word)).toEqual(["CAT", "DOG"]);
    expect(record.words[1]?.letters.map((l) => l.result)).toEqual(["pass", "miss", "pass"]);
    expect(record.words[1]?.letters[1]?.readAs).toBe("Q");
  });

  it("ignores events before starting and after finishing", () => {
    expect(practiceReducer(initialPracticeState, { type: "skipLetter", now: 0 })).toBe(initialPracticeState);
    const done = new Sim().start(["A"]).spell("A").pause().state;
    expect(practiceReducer(done, { type: "reading", now: 99_999, letter: "A", hand: true })).toBe(done);
  });

  it("caps a single clock step so a stalled tab can't add minutes", () => {
    const sim = new Sim().start(["MAP"]).show("S", 100);
    sim.send({ type: "reading", now: sim.now + 60_000, letter: "S", hand: true });
    expect(sim.playing.activeMs).toBeLessThan(500);
  });

  it("reports words so far for live stats", () => {
    const sim = new Sim().start(["CAT", "DOG"]).spell("CAT").pause().show("D", 400);
    expect(wordsSoFar(sim.playing).map((w) => [w.word, w.letters.length])).toEqual([
      ["CAT", 3],
      ["DOG", 1],
    ]);
  });
});

describe("motion letters and doubles", () => {
  const J: MotionEvent = { kind: "J" };
  const Z: MotionEvent = { kind: "Z" };
  const slide: MotionEvent = { kind: "double", style: "slide" };
  const results = (sim: Sim) => sim.playing.current.map((l) => `${l.letter}:${l.result}`);

  it("passes J and Z on their motion, not on a hold", () => {
    const sim = new Sim().start(["JAZ"]).show("I", 1000);
    expect(sim.playing.current).toEqual([]); // holding I never counts as J
    sim.motion(J).show("A", 400).show(null, 100).motion(Z);
    expect(results(sim)).toEqual(["J:pass", "A:pass", "Z:pass"]);
  });

  it("ignores the wrong motion for the target", () => {
    const sim = new Sim().start(["JAZ"]).motion(Z).motion(slide);
    expect(sim.playing.current).toEqual([]);
  });

  it("doesn't confirm the second of a double just by holding on", () => {
    const sim = new Sim().start(["BOOK"]).spell("B").show("O", 2000);
    expect(results(sim)).toEqual(["B:pass", "O:pass"]);
  });

  it("confirms the second of a double on a slide or bounce", () => {
    const sim = new Sim().start(["BOOK"]).spell("B").show("O", 600).motion(slide);
    expect(results(sim)).toEqual(["B:pass", "O:pass", "O:pass"]);
  });

  it("confirms the second of a double after releasing and re-forming it", () => {
    const sim = new Sim().start(["BOOK"]).spell("B").show("O", 600).show(null, 300).show("O", 400);
    expect(results(sim)).toEqual(["B:pass", "O:pass", "O:pass"]);
  });

  it("ignores a double motion when the target isn't a repeat", () => {
    const sim = new Sim().start(["BOOK"]).show("A", 200).motion(slide);
    expect(sim.playing.current).toEqual([]);
  });

  it.each([
    ["JAZZ", (s: Sim) => s.show("I", 300).motion(J).show("A", 400).show(null, 100).motion(Z).show(null, 900).motion(Z)],
    ["BOOK", (s: Sim) => s.spell("B").show("O", 600).motion(slide).show(null, 100).spell("K")],
    ["JELLY", (s: Sim) => s.motion(J).spell("E").show("L", 600).motion(slide).show(null, 100).spell("Y")],
  ])("completes %s", (word, play) => {
    const sim = play(new Sim().start([word]));
    expect(results(sim)).toEqual([...word].map((l) => `${l}:pass`));
  });
});
