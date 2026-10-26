import { HANDEDNESS_STORAGE_KEY, loadHandedness, parseHandedness, saveHandedness, stepOption } from "./settings";

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
};

const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("parseHandedness", () => {
  it.each(["auto", "left", "right"] as const)("accepts %s", (value) => {
    expect(parseHandedness(value)).toBe(value);
  });

  it.each([null, undefined, "", "LEFT", "both"])("falls back to auto for %p", (value) => {
    expect(parseHandedness(value)).toBe("auto");
  });
});

describe("loadHandedness / saveHandedness", () => {
  it("round-trips a saved value", () => {
    const storage = memoryStorage();
    expect(saveHandedness(storage, "left")).toBe(true);
    expect(loadHandedness(storage)).toBe("left");
  });

  it("defaults to auto when nothing is stored", () => {
    expect(loadHandedness(memoryStorage())).toBe("auto");
  });

  it("ignores a corrupted stored value", () => {
    expect(loadHandedness(memoryStorage({ [HANDEDNESS_STORAGE_KEY]: "{oops" }))).toBe("auto");
  });

  it("survives unavailable or blocked storage", () => {
    expect(loadHandedness(undefined)).toBe("auto");
    expect(loadHandedness(throwing)).toBe("auto");
    expect(saveHandedness(undefined, "right")).toBe(false);
    expect(saveHandedness(throwing, "right")).toBe(false);
  });
});

describe("stepOption", () => {
  const options = ["auto", "left", "right"] as const;

  it("moves forward and back", () => {
    expect(stepOption(options, "auto", 1)).toBe("left");
    expect(stepOption(options, "left", -1)).toBe("auto");
  });

  it("wraps at both ends", () => {
    expect(stepOption(options, "right", 1)).toBe("auto");
    expect(stepOption(options, "auto", -1)).toBe("right");
  });
});
