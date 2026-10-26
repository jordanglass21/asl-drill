import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import rightHandFixture from "@/lib/hands/__fixtures__/right-hand.json";
import { buildRecordingFile, recordingFileName, RECORDING_FORMAT, RECORDING_VERSION } from "./format";
import {
  countByLetter,
  initialRecorderState,
  recorderReducer,
  type FrameSample,
  type RecorderConfig,
  type RecorderEvent,
  type RecorderState,
} from "./recorder";

const config: RecorderConfig = { countdownMs: 3000, captureMs: 2000, minFrames: 3 };
const run = (events: RecorderEvent[], state: RecorderState = initialRecorderState) =>
  events.reduce((s, e) => recorderReducer(s, e, config), state);

const landmarks = rightHandFixture.landmarks[0] ?? [];
const sample: FrameSample = {
  side: "right",
  label: "Right",
  score: 0.97,
  landmarks,
  worldLandmarks: landmarks.map(({ x, y, z }) => ({ x: (x - 0.35) / 10, y: (y - 0.7) / 10, z: z / 10 })),
  camera: { width: 1280, height: 720 },
};
const start = (now: number, id = "take-1"): RecorderEvent => ({
  type: "start",
  now,
  id,
  startedAt: "2026-10-26T18:00:00.000Z",
  handednessSetting: "auto",
});
const frames = (from: number, count: number, step = 100): RecorderEvent[] =>
  Array.from({ length: count }, (_, i) => ({ type: "frame", now: from + i * step, sample }));

/** Letter B, countdown from t=0, capture 3000–5000 with four frames, then finished by a tick. */
const recordB = (id = "take-1", t0 = 0): RecorderEvent[] => [
  { type: "selectLetter", letter: "b" },
  start(t0, id),
  { type: "tick", now: t0 + 3000 },
  ...frames(t0 + 3000, 4, 500),
  { type: "tick", now: t0 + 5000 },
];

describe("recorderReducer", () => {
  it("selects letters case-insensitively and ignores non-letters", () => {
    expect(run([{ type: "selectLetter", letter: "k" }]).letter).toBe("K");
    expect(run([{ type: "selectLetter", letter: "1" }]).letter).toBeNull();
  });

  it("can't start without a letter", () => {
    expect(run([start(0)]).phase.kind).toBe("idle");
  });

  it("counts down, captures, then saves the take", () => {
    const countingDown = run([{ type: "selectLetter", letter: "B" }, start(0)]);
    expect(countingDown.phase.kind).toBe("countdown");
    expect(run([{ type: "tick", now: 2999 }], countingDown).phase.kind).toBe("countdown");

    const done = run(recordB());
    expect(done.phase.kind).toBe("idle");
    expect(done.takes).toHaveLength(1);
    expect(done.unsaved).toBe(true);
    const take = done.takes[0];
    expect(take).toMatchObject({ id: "take-1", letter: "B", camera: { width: 1280, height: 720 } });
    expect(take?.frames.map((f) => f.t)).toEqual([0, 500, 1000, 1500]);
    expect(take?.frames[0]).toMatchObject({ side: "right", handednessLabel: "Right", handednessScore: 0.97 });
  });

  it("ignores frames outside the capture window", () => {
    const state = run([
      { type: "selectLetter", letter: "B" },
      start(0),
      ...frames(1000, 3),
      { type: "tick", now: 3000 },
      ...frames(3000, 3),
      { type: "tick", now: 5000 },
      ...frames(5100, 3),
    ]);
    expect(state.takes[0]?.frames).toHaveLength(3);
  });

  it("finishes the take when a frame arrives after the window ends", () => {
    const state = run([{ type: "selectLetter", letter: "B" }, start(0), { type: "tick", now: 3000 }, ...frames(3000, 3), ...frames(5000, 1)]);
    expect(state.phase.kind).toBe("idle");
    expect(state.takes[0]?.frames).toHaveLength(3);
  });

  it("discards a take with too few hand frames", () => {
    const state = run([{ type: "selectLetter", letter: "B" }, start(0), { type: "tick", now: 3000 }, ...frames(3000, 2), { type: "tick", now: 5000 }]);
    expect(state.takes).toHaveLength(0);
    expect(state.notice).toMatch(/discarded/);
  });

  it("locks the letter while recording", () => {
    const state = run([{ type: "selectLetter", letter: "B" }, start(0), { type: "selectLetter", letter: "C" }]);
    expect(state.letter).toBe("B");
  });

  it("cancels a countdown or capture", () => {
    const state = run([{ type: "selectLetter", letter: "B" }, start(0), { type: "tick", now: 3000 }, ...frames(3000, 3), { type: "cancel" }]);
    expect(state.phase.kind).toBe("idle");
    expect(state.takes).toHaveLength(0);
  });

  it("deletes the last take and marks the session unsaved", () => {
    const saved = run([...recordB("a"), ...recordB("b", 10_000), { type: "exported" }]);
    expect(saved.unsaved).toBe(false);
    const state = run([{ type: "deleteLastTake" }], saved);
    expect(state.takes.map((t) => t.id)).toEqual(["a"]);
    expect(state.unsaved).toBe(true);
  });

  it("counts takes and frames per letter", () => {
    const state = run([...recordB("a"), ...recordB("b", 10_000)]);
    expect(countByLetter(state.takes)).toEqual({ B: { takes: 2, frames: 8 } });
  });
});

describe("recording file", () => {
  it("names exports by local date and time", () => {
    expect(recordingFileName(new Date(2026, 9, 26, 9, 5, 7))).toBe("asl-drill-recording-2026-10-26-090507.json");
  });

  it("rounds coordinates to 6 decimals", () => {
    const take = run(recordB()).takes;
    const file = buildRecordingFile(take, "2026-10-26T18:00:05.000Z");
    expect(file).toMatchObject({ format: RECORDING_FORMAT, version: RECORDING_VERSION });
    const x = file.takes[0]?.frames[0]?.worldLandmarks[5]?.x ?? 0;
    expect(Math.abs(x * 1e6 - Math.round(x * 1e6))).toBeLessThan(1e-6);
  });

  // fixtures/recording/sample-v1.json is the cross-language contract: the
  // Python reader is tested against it. Regenerate with UPDATE_FIXTURES=1.
  it("matches the shared sample recording", () => {
    const state = run([...recordB("sample-b"), { type: "selectLetter", letter: "k" }, ...recordB("sample-k", 10_000).slice(1)]);
    const file = buildRecordingFile(state.takes, "2026-10-26T18:00:15.000Z");
    const path = join(__dirname, "..", "..", "..", "fixtures", "recording", "sample-v1.json");
    if (process.env.UPDATE_FIXTURES || !existsSync(path)) writeFileSync(path, JSON.stringify(file, null, 2) + "\n");
    expect(file).toEqual(JSON.parse(readFileSync(path, "utf8")));
  });
});
