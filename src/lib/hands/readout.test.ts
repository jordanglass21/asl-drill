import { trackingReadout } from "./readout";

describe("trackingReadout", () => {
  it("reports loading and hides when idle or failed", () => {
    expect(trackingReadout({ status: "loading", signingSide: null }, "auto")).toBe("loading tracking");
    expect(trackingReadout({ status: "idle", signingSide: null }, "auto")).toBe("");
    expect(trackingReadout({ status: "error", signingSide: null }, "auto")).toBe("");
  });

  it("names the tracked hand", () => {
    expect(trackingReadout({ status: "ready", signingSide: "left" }, "auto")).toBe("left hand");
  });

  it("prompts for the configured hand", () => {
    expect(trackingReadout({ status: "ready", signingSide: null }, "auto")).toBe("show a hand");
    expect(trackingReadout({ status: "ready", signingSide: null }, "right")).toBe("show right hand");
  });
});
