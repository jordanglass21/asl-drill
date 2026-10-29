"""Draws the landing page's alphabet reference from our recordings.

Run from training/: uv run --group render python scripts/render_alphabet.py

For each letter it picks the most typical confident frame (J and Z: a
typical take's start frame plus the fingertip's path), fleshes the 21
landmarks out into a pencil-style hand, and writes one image per letter to
public/reference/alphabet-v3/. Rerun after retraining; bump the folder name
if the images change, since public files are cached as immutable.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.colors as mcolors
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np

from asl_drill.datasets import load_excluded_takes
from asl_drill.model import predict_exported
from asl_drill.normalize import normalize_landmarks
from asl_drill.recordings import load_recording

TRAINING = Path(__file__).resolve().parents[1]
ROOT = TRAINING.parent
MODEL_PATH = ROOT / "public" / "models" / "letters-v4.json"
OUT_DIR = ROOT / "public" / "reference" / "alphabet-v3"
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# Board palette (src/app/globals.css).
AMBER, AMBER_DIM, CREAM_DIM = "#f4a51c", "#7a5512", "#6e675c"
FILL_FAR, FILL_NEAR = "#171614", "#2c2925"

# Turned and tilted so curled fingers read; letters that point down at the
# camera flatten from there, so they get side views instead.
DEFAULT_VIEW = (35, 25)
VIEWS = {"P": (90, -20), "Q": (-60, -20)}
# Motion letters: (handshape the take starts in, landmark whose path is drawn).
MOTION = {"J": ("I", 20), "Z": ("D", 8)}

# Fists whose curled fingers sit in front of the palm, with the thumb across
# them. MediaPipe's depth puts S's ring and pinky behind its palm and its
# fingertips nearer than its thumb, so ordering by depth alone hides the
# pinky and tucks the thumb underneath. These letters draw the palm first and
# the thumb last.
THUMB_IN_FRONT = {"S"}
THUMB = {(1, 2), (2, 3), (3, 4)}

PALM = [0, 1, 5, 9, 13, 17]
# (joint a, joint b, radius at a, radius at b), radii in wrist-to-middle-knuckle lengths.
SEGMENTS = [
    (1, 2, 0.15, 0.13), (2, 3, 0.13, 0.115), (3, 4, 0.115, 0.10),
    (5, 6, 0.12, 0.105), (6, 7, 0.105, 0.095), (7, 8, 0.095, 0.085),
    (9, 10, 0.125, 0.11), (10, 11, 0.11, 0.10), (11, 12, 0.10, 0.09),
    (13, 14, 0.115, 0.10), (14, 15, 0.10, 0.09), (15, 16, 0.09, 0.08),
    (17, 18, 0.10, 0.085), (18, 19, 0.085, 0.075), (19, 20, 0.075, 0.07),
]


def load_takes() -> dict[str, dict]:
    excluded = load_excluded_takes(TRAINING / "excluded_takes.json")
    takes: dict[str, dict] = {}
    for path in sorted((TRAINING / "data" / "recordings").glob("*.json")):
        for take in load_recording(path)["takes"]:
            if take.get("kind", "letter") == "letter" and take["id"] not in excluded:
                takes[take["id"]] = take
    return takes


def rotation(view: tuple[float, float]) -> np.ndarray:
    """Yaw about the vertical axis, then pitch toward the viewer."""
    yaw, pitch = np.radians(view)
    c, s = np.cos(yaw), np.sin(yaw)
    turn = np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])
    c, s = np.cos(pitch), np.sin(pitch)
    tilt = np.array([[1, 0, 0], [0, c, s], [0, -s, c]])
    return tilt @ turn


def points(frame: dict, aspect: float, view: tuple[float, float] | None) -> np.ndarray:
    """Landmarks in y-units, mirrored like the camera preview, optionally rotated."""
    p = np.array([[l["x"] * aspect, l["y"], l["z"] * aspect] for l in frame["landmarks"]])
    p[:, 0] = -p[:, 0]
    return p if view is None else p @ rotation(view).T


def aspect_of(take: dict) -> float:
    return take["camera"]["width"] / take["camera"]["height"]


def confidences(model: dict, frames: list[dict], aspect: float, letter: str) -> tuple[list[dict], np.ndarray, np.ndarray]:
    kept, rows = [], []
    for frame in frames:
        x = normalize_landmarks(frame["landmarks"], frame["side"], aspect)
        if x is not None:
            kept.append(frame)
            rows.append(x)
    X = np.array(rows)
    return kept, X, predict_exported(model, X)[:, model["labels"].index(letter)]


def static_pose(model: dict, takes: dict[str, dict], letter: str) -> np.ndarray:
    """The most typical confident frame: conf >= 0.99, nearest the letter's mean features."""
    frames, X, p = [], [], []
    for take in takes.values():
        if take["letter"] == letter:
            kept, x, conf = confidences(model, take["frames"], aspect_of(take), letter)
            frames += [(f, aspect_of(take)) for f in kept]
            X.append(x)
            p.append(conf)
    X, p = np.concatenate(X), np.concatenate(p)
    mean = X[p >= 0.9].mean(0)
    candidates = np.flatnonzero(p >= 0.99) if (p >= 0.99).any() else [int(p.argmax())]
    best = min(candidates, key=lambda i: np.linalg.norm(X[i] - mean))
    frame, aspect = frames[best]
    return points(frame, aspect, VIEWS.get(letter, DEFAULT_VIEW))


def motion_pose(model: dict, takes: dict[str, dict], letter: str) -> tuple[np.ndarray, np.ndarray]:
    """A median-length take's most start-shape-like early frame, plus the tip's path, head-on."""
    start_letter, tip = MOTION[letter]
    candidates = []
    for take in takes.values():
        if take["letter"] != letter or len(take["frames"]) < 10:
            continue
        pts = [points(f, aspect_of(take), None) for f in take["frames"]]
        path = np.array([p[tip, :2] for p in pts])
        candidates.append((np.linalg.norm(np.diff(path, axis=0), axis=1).sum(), take, path))
    candidates.sort(key=lambda c: c[0])
    _, take, path = candidates[len(candidates) // 2]
    early = take["frames"][: len(take["frames"]) // 2]
    kept, _, conf = confidences(model, early, aspect_of(take), start_letter)
    return points(kept[int(np.argmax(conf))], aspect_of(take), None), path


def capsule(p: np.ndarray, q: np.ndarray, r1: float, r2: float, n: int = 14) -> np.ndarray:
    """Outline of a tapered rounded segment from p (radius r1) to q (radius r2)."""
    d = q - p
    length = np.linalg.norm(d)
    u = d / length if length > 1e-9 else np.array([0.0, -1.0])
    nrm = np.array([-u[1], u[0]])
    t = np.linspace(0, np.pi, n)[:, None]
    return np.vstack([q + r2 * (np.cos(t) * nrm + np.sin(t) * u), p + r1 * (np.cos(t) * -nrm + np.sin(t) * -u)])


def pencil(ax, poly: np.ndarray, fill, z: float, outline: bool = True, filled: bool = True) -> None:
    """A sketchy amber edge, then the fill over its inner half, so only the outer line shows."""
    if outline:
        for color, lw, alpha, randomness in ((AMBER, 2.4, 0.95, 1.2), (AMBER_DIM, 1.3, 0.8, 3.0)):
            edge = mpatches.Polygon(poly, closed=True, facecolor="none", edgecolor=color, lw=lw, alpha=alpha,
                                    joinstyle="round", zorder=z)
            edge.set_sketch_params(scale=0.8, length=18, randomness=randomness)
            ax.add_patch(edge)
    if filled:
        ax.add_patch(mpatches.Polygon(poly, closed=True, facecolor=fill, edgecolor="none", zorder=z + 0.001))


def tone(nearness: float):
    """Fill shade: nearer parts are a touch lighter."""
    far, near = np.array(mcolors.to_rgb(FILL_FAR)), np.array(mcolors.to_rgb(FILL_NEAR))
    return tuple(far + (near - far) * nearness)


def draw_hand(ax, hand: np.ndarray, path: np.ndarray | None, thumb_in_front: bool = False) -> None:
    s = np.linalg.norm(hand[9] - hand[0])
    xy, z = hand[:, :2], hand[:, 2]
    near = (z.max() - z) / max(z.max() - z.min(), 1e-6)

    away = (xy[0] - xy[9]) / max(np.linalg.norm(xy[0] - xy[9]), 1e-9)
    pencil(ax, capsule(xy[0], xy[0] + away * 0.9 * s, 0.34 * s, 0.38 * s), tone(0), 1)  # forearm, furthest back

    parts: list[tuple[object, float]] = [("palm", float(z[PALM].mean()))]
    parts += [(seg, float(z[seg[0]] + z[seg[1]]) / 2) for seg in SEGMENTS]
    def layer(part) -> int:
        if not thumb_in_front:
            return 0
        if part == "palm":
            return -1
        return 1 if tuple(part[:2]) in THUMB else 0

    for i, (part, _) in enumerate(sorted(parts, key=lambda p: (layer(p[0]), -p[1]))):  # far parts first
        zo = 2 + i
        if part == "palm":
            pieces = [xy[PALM]] + [capsule(xy[a], xy[b], 0.16 * s, 0.16 * s) for a, b in zip(PALM, PALM[1:] + PALM[:1])]
            shade = tone(float(near[PALM].mean()))
            for poly in pieces:  # every edge, then every fill: only the palm's silhouette shows
                pencil(ax, poly, shade, zo, filled=False)
            for poly in pieces:
                pencil(ax, poly, shade, zo + 0.5, outline=False)
            continue
        a, b, ra, rb = part
        pencil(ax, capsule(xy[a], xy[b], ra * s, rb * s), tone(float(near[a] + near[b]) / 2), zo)
        ax.plot(*xy[[a, b]].T, color=CREAM_DIM, lw=0.8, alpha=0.5, zorder=zo + 0.6)  # the recorded bone

    if path is not None:
        ax.plot(path[:, 0], path[:, 1], color=AMBER, lw=1.3, ls=(0, (3, 2.5)), alpha=0.85, zorder=100)
        ax.annotate("", xy=path[-1], xytext=path[-4], zorder=100,
                    arrowprops=dict(arrowstyle="-|>", color=AMBER, lw=1.3, alpha=0.9))

    extent = np.vstack([xy, xy[0] + away * 0.6 * s] + ([path] if path is not None else []))
    lo, hi = extent.min(0), extent.max(0)
    center, size = (lo + hi) / 2, (hi - lo).max() + 0.6 * s
    ax.set_xlim(center[0] - size / 2, center[0] + size / 2)
    ax.set_ylim(center[1] + size / 2, center[1] - size / 2)  # image y points down
    ax.set_axis_off()


def main() -> None:
    model = json.loads(MODEL_PATH.read_text())
    takes = load_takes()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for letter in LETTERS:
        hand, path = motion_pose(model, takes, letter) if letter in MOTION else (static_pose(model, takes, letter), None)
        fig = plt.figure(figsize=(2.2, 2.2))
        ax = fig.add_axes((0, 0, 1, 1))
        draw_hand(ax, hand, path, thumb_in_front=letter in THUMB_IN_FRONT)
        out = OUT_DIR / f"{letter}.webp"
        fig.savefig(out, dpi=150, transparent=True)
        plt.close(fig)
        total += out.stat().st_size
    print(f"wrote {len(LETTERS)} images to {OUT_DIR.relative_to(ROOT)} ({total // 1024} KB)")


if __name__ == "__main__":
    main()
