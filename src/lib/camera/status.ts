// Camera permission flow as a pure reducer, so every state can be tested
// without a real camera.

export type CameraErrorReason = "denied" | "no-camera" | "in-use" | "unsupported" | "unknown";

export type CameraState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ready" }
  | { status: "error"; reason: CameraErrorReason };

export type CameraEvent =
  | { type: "request" }
  | { type: "granted" }
  | { type: "failed"; reason: CameraErrorReason }
  | { type: "stopped" };

export const initialCameraState: CameraState = { status: "idle" };

export function cameraReducer(state: CameraState, event: CameraEvent): CameraState {
  switch (event.type) {
    case "request":
      return state.status === "requesting" || state.status === "ready" ? state : { status: "requesting" };
    case "granted":
      // Ignore a late grant after the request was abandoned (e.g. stopped).
      return state.status === "requesting" ? { status: "ready" } : state;
    case "failed":
      return state.status === "requesting" || state.status === "ready"
        ? { status: "error", reason: event.reason }
        : state;
    case "stopped":
      return state.status === "error" ? state : initialCameraState;
  }
}

/** Maps a getUserMedia rejection to a reason we can explain to the user. */
export function classifyCameraError(error: unknown): CameraErrorReason {
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
    case "PermissionDeniedError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "no-camera";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "in-use";
    default:
      return "unknown";
  }
}

export const CAMERA_ERROR_MESSAGES: Record<CameraErrorReason, { title: string; detail: string }> = {
  denied: {
    title: "Camera access is blocked",
    detail:
      "Allow camera access for this site in your browser's address bar or site settings, then try again. Video never leaves your device.",
  },
  "no-camera": {
    title: "No camera found",
    detail: "Connect a webcam (or enable your built-in one), then try again.",
  },
  "in-use": {
    title: "Your camera is busy",
    detail: "Another app or browser tab may be using it. Close it, then try again.",
  },
  unsupported: {
    title: "This browser can't use the camera",
    detail: "Open ASL Drill in a recent version of Chrome, Edge, Firefox, or Safari over HTTPS.",
  },
  unknown: {
    title: "Couldn't start the camera",
    detail: "Something went wrong while starting the camera. Try again, or reload the page.",
  },
};
