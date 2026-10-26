import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HAND_LANDMARKER_MODEL_PATH, MEDIAPIPE_VERSION, MEDIAPIPE_WASM_PATH } from "./assets";

const root = join(__dirname, "..", "..", "..");
const publicPath = (urlPath: string) => join(root, "public", ...urlPath.split("/"));

describe("MediaPipe assets", () => {
  it("pins the version of the installed package, so cached URLs change on upgrade", () => {
    const pkgJson = join(root, "node_modules", "@mediapipe", "tasks-vision", "package.json");
    const { version } = JSON.parse(readFileSync(pkgJson, "utf8")) as { version: string };
    expect(MEDIAPIPE_VERSION).toBe(version);
  });

  it("has the Wasm runtime copied into public/", () => {
    expect(existsSync(join(publicPath(MEDIAPIPE_WASM_PATH), "vision_wasm_internal.wasm"))).toBe(true);
  });

  it("has the hand model committed in public/", () => {
    expect(existsSync(publicPath(HAND_LANDMARKER_MODEL_PATH))).toBe(true);
  });
});
