"""Regenerates fixtures/normalization/cases.json, the shared normalization cases
that both the TypeScript and Python implementations are tested against.

Run from training/: uv run python scripts/make_normalization_fixtures.py

Most cases are built so the expected output is easy to reason about (and the
tests check invariants between them); two use real MediaPipe samples.
"""

from __future__ import annotations

import json
from pathlib import Path

from asl_drill.normalize import normalize_landmarks

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "fixtures" / "normalization" / "cases.json"
SOURCE = ROOT / "fixtures" / "normalization" / "source"


def simple_hand(cx: float = 0.5, cy: float = 0.5, size: float = 1.0, x_squash: float = 1.0) -> list[dict]:
    """A hand-like set of points with the wrist at (cx, cy) and the middle knuckle
    0.1 * size straight above it, so with aspect ratio 1 the scale is exactly
    0.1 * size and the knuckle normalizes to (0, -1, 0)."""
    points = []
    for i in range(21):
        dx = 0.01 * ((i % 5) - 2) * size * x_squash
        dy = -0.01 * i * size
        dz = 0.002 * i * size * x_squash
        points.append({"x": cx + dx, "y": cy + dy, "z": dz})
    points[0] = {"x": cx, "y": cy, "z": 0.0}
    points[9] = {"x": cx, "y": cy - 0.1 * size, "z": 0.0}
    return points


def load(name: str) -> list[dict]:
    return json.loads((SOURCE / name).read_text())


def case(name: str, description: str, landmarks: list[dict], side: str, aspect: float) -> dict:
    expected = normalize_landmarks(landmarks, side, aspect)  # type: ignore[arg-type]
    return {
        "name": name,
        "description": description,
        "input": {"landmarks": landmarks, "side": side, "aspectRatio": aspect},
        "expected": None if expected is None else [round(float(v), 12) for v in expected],
    }


def main() -> None:
    cases = [
        case("simple-right", "Baseline right hand, square frame.", simple_hand(), "right", 1.0),
        case("translated", "simple-right moved within the frame; output must not change.",
             simple_hand(cx=0.2, cy=0.8), "right", 1.0),
        case("scaled", "simple-right at twice the size; output must not change.",
             simple_hand(size=2.0), "right", 1.0),
        case("mirrored-left", "simple-right labelled as a left hand; x must be negated.",
             simple_hand(), "left", 1.0),
        case("aspect-16-9", "simple-right captured in a 16:9 frame, so normalized x and z shrink "
             "by 9/16; after aspect correction the output must match simple-right.",
             simple_hand(x_squash=9 / 16), "right", 16 / 9),
        case("degenerate", "All points identical; no features.", [{"x": 0.5, "y": 0.5, "z": 0.0}] * 21,
             "right", 1.0),
        case("wrong-count", "Only 20 landmarks; no features.", simple_hand()[:20], "right", 1.0),
        case("real-B-right", "Real MediaPipe sample (letter B) as a right hand in a 4:3 frame.",
             load("asl-now-B-1d20c568.json"), "right", 4 / 3),
        case("real-K-left", "Real MediaPipe sample (letter K) as a left hand in a 16:9 frame.",
             load("asl-now-K-sample.json"), "left", 16 / 9),
    ]
    OUT.write_text(json.dumps({"tolerance": 1e-6, "cases": cases}, indent=2) + "\n")
    print(f"Wrote {len(cases)} cases to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
