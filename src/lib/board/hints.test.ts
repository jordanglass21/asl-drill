import { visibleHints } from "./hints";

describe("visibleHints", () => {
  const hints = [{ keys: "enter", text: "start" }, { text: "Trace J and Z" }, { keys: "esc", text: "skip letter" }];

  it("shows every hint with a keyboard", () => {
    expect(visibleHints(hints, false)).toEqual(hints);
  });

  it("drops key hints on a touch screen", () => {
    expect(visibleHints(hints, true)).toEqual([{ text: "Trace J and Z" }]);
  });
});
