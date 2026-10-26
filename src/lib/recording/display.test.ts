import { phaseOverlay } from "./display";

const take = { id: "t", letter: "A", startedAt: "", handednessSetting: "auto" as const };

describe("phaseOverlay", () => {
  it("shows nothing while idle", () => {
    expect(phaseOverlay({ kind: "idle" }, 0)).toBeNull();
  });

  it("counts down whole seconds, never showing 0", () => {
    const phase = { kind: "countdown" as const, until: 3000, take };
    expect(phaseOverlay(phase, 0)?.label).toBe("3");
    expect(phaseOverlay(phase, 1500)?.label).toBe("2");
    expect(phaseOverlay(phase, 2999)?.label).toBe("1");
    expect(phaseOverlay(phase, 3200)?.label).toBe("1");
  });

  it("shows the frame count while recording", () => {
    const phase = { kind: "capturing" as const, startedAt: 0, until: 2000, take, camera: null, frames: [] };
    expect(phaseOverlay(phase, 100)?.detail).toBe("recording · 0 frames");
  });
});
