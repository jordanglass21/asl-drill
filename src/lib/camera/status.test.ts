import { cameraReducer, classifyCameraError, initialCameraState, type CameraState } from "./status";

const requesting: CameraState = { status: "requesting" };
const ready: CameraState = { status: "ready" };

describe("cameraReducer", () => {
  it("goes idle → requesting → ready", () => {
    const s1 = cameraReducer(initialCameraState, { type: "request" });
    expect(s1).toEqual(requesting);
    expect(cameraReducer(s1, { type: "granted" })).toEqual(ready);
  });

  it("records the failure reason", () => {
    expect(cameraReducer(requesting, { type: "failed", reason: "denied" })).toEqual({
      status: "error",
      reason: "denied",
    });
  });

  it("allows retrying from an error", () => {
    const error: CameraState = { status: "error", reason: "in-use" };
    expect(cameraReducer(error, { type: "request" })).toEqual(requesting);
  });

  it("treats a lost stream while ready as a failure", () => {
    expect(cameraReducer(ready, { type: "failed", reason: "in-use" })).toEqual({ status: "error", reason: "in-use" });
  });

  it("ignores a grant that arrives after stopping", () => {
    const stopped = cameraReducer(requesting, { type: "stopped" });
    expect(cameraReducer(stopped, { type: "granted" })).toEqual(initialCameraState);
  });

  it("ignores duplicate requests", () => {
    expect(cameraReducer(requesting, { type: "request" })).toBe(requesting);
    expect(cameraReducer(ready, { type: "request" })).toBe(ready);
  });

  it("keeps an error visible when stopped", () => {
    const error: CameraState = { status: "error", reason: "denied" };
    expect(cameraReducer(error, { type: "stopped" })).toBe(error);
  });
});

describe("classifyCameraError", () => {
  const named = (name: string) => Object.assign(new Error(name), { name });

  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "no-camera"],
    ["OverconstrainedError", "no-camera"],
    ["NotReadableError", "in-use"],
    ["AbortError", "in-use"],
    ["SomethingElse", "unknown"],
  ])("maps %s to %s", (name, reason) => {
    expect(classifyCameraError(named(name))).toBe(reason);
  });

  it("handles non-error values", () => {
    expect(classifyCameraError(undefined)).toBe("unknown");
    expect(classifyCameraError("nope")).toBe("unknown");
  });
});
