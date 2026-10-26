// Self-hosted MediaPipe assets, served from public/mediapipe/ with immutable
// cache headers. Both paths must change whenever their contents do.

/** Must match the installed @mediapipe/tasks-vision version (enforced by a test). */
export const MEDIAPIPE_VERSION = "1.1.1";

/** Directory holding the Wasm runtime, copied there by scripts/copy-mediapipe-wasm.mjs. */
export const MEDIAPIPE_WASM_PATH = `/mediapipe/tasks-vision-${MEDIAPIPE_VERSION}`;

/** Committed model file. Rename it (e.g. -v2) when replacing the model. */
export const HAND_LANDMARKER_MODEL_PATH = "/mediapipe/models/hand_landmarker-float16-v1.task";
