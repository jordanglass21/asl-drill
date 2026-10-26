import { shouldFlip, toFlapChars } from "./flap";

describe("shouldFlip", () => {
  it("flips when a letter is confirmed or missed", () => {
    expect(shouldFlip("current", "confirmed")).toBe(true);
    expect(shouldFlip("current", "missed")).toBe(true);
    expect(shouldFlip("pending", "confirmed")).toBe(true);
  });

  it("doesn't flip for other changes or no change", () => {
    expect(shouldFlip("pending", "current")).toBe(false);
    expect(shouldFlip("confirmed", "pending")).toBe(false);
    expect(shouldFlip("confirmed", "confirmed")).toBe(false);
  });
});

describe("toFlapChars", () => {
  it("uppercases and turns spaces into blank tiles", () => {
    expect(toFlapChars("no cam")).toEqual(["N", "O", "", "C", "A", "M"]);
  });
});
