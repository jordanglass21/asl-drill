// Copies the MediaPipe Wasm runtime into public/ so the app serves it itself
// (no third-party requests). The directory name carries the package version so
// the files can be cached as immutable: an upgrade changes the URL.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@mediapipe", "tasks-vision");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));

const publicDir = join(root, "public", "mediapipe");
mkdirSync(publicDir, { recursive: true });

// Drop runtimes left over from previous versions.
for (const entry of readdirSync(publicDir)) {
  if (entry.startsWith("tasks-vision-")) {
    rmSync(join(publicDir, entry), { recursive: true, force: true });
  }
}

const dest = join(publicDir, `tasks-vision-${version}`);
cpSync(join(pkgDir, "wasm"), dest, { recursive: true });
console.log(`Copied MediaPipe Wasm runtime to public/mediapipe/tasks-vision-${version}`);
