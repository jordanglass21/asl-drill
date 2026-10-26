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

export interface BoardMessage {
  /** A short word shown in flaps, departures-board style (max 9 characters). */
  code: string;
  title: string;
  detail: string;
}

export const CAMERA_ERROR_MESSAGES: Record<CameraErrorReason, BoardMessage> = {
  denied: {
    code: "BLOCKED",
    title: "Camera access is blocked",
    detail:
      "Allow camera access for this site in your browser's address bar or site settings, then try again. Video never leaves your device.",
  },
  "no-camera": {
    code: "NO CAMERA",
    title: "No camera found",
    detail: "Connect a webcam (or enable your built-in one), then try again.",
  },
  "in-use": {
    code: "BUSY",
    title: "Your camera is busy",
    detail: "Another app or browser tab may be using it. Close it, then try again.",
  },
  unsupported: {
    code: "BROWSER",
    title: "This browser can't use the camera",
    detail: "Open ASL Drill in a recent version of Chrome, Edge, Firefox, or Safari over HTTPS.",
  },
  unknown: {
    code: "ERROR",
    title: "Couldn't start the camera",
    detail: "Something went wrong while starting the camera. Try again, or reload the page.",
  },
};

export const CAMERA_STATUS_MESSAGES = {
  idle: {
    code: "START",
    title: "Turn on your camera to start",
    detail: "Hand tracking runs entirely in your browser. Video never leaves your device.",
  },
  requesting: { code: "WAIT", title: "Waiting for camera permission", detail: "Allow camera access in your browser's prompt." },
  trackingFailed: { code: "OFFLINE", title: "Couldn't load hand tracking", detail: "Check your connection, then try again." },
} satisfies Record<string, BoardMessage>;
