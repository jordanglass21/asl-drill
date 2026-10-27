"""Writes fixtures/motion/takes.json: a small, compact sample of recorded takes
that the motion detector tests run against in CI (the full recordings are
gitignored). Landmarks only, rounded to 3 decimals (about a pixel).

Run from training/: uv run python scripts/make_motion_fixtures.py
"""

from __future__ import annotations

import json
from pathlib import Path

from asl_drill.recordings import load_recording

TRAINING = Path(__file__).resolve().parents[1]
ROOT = TRAINING.parent
OUT = ROOT / "fixtures" / "motion" / "takes.json"

# (kind, label, which occurrence, style note). Doubles were recorded as three
# bounces then three slides per letter.
PICKS = [
    ("letter", "J", 7, None), ("letter", "J", 12, None),
    ("letter", "Z", 7, None), ("letter", "Z", 12, None),
    ("double", "OO", 0, "bounce"), ("double", "OO", 3, "slide"),
    ("double", "SS", 0, "bounce"), ("double", "TT", 4, "slide"),
    ("word", "LID", 0, None), ("word", "FIT", 0, None),
    ("letter", "I", 0, None), ("letter", "Y", 0, None),
]


def compact(take: dict) -> dict:
    return {
        "id": take["id"],
        "label": take["letter"],
        "kind": take.get("kind", "letter"),
        "camera": take["camera"],
        "frames": [
            {"t": f["t"], "side": f["side"], "landmarks": [[round(p[k], 3) for k in "xyz"] for p in f["landmarks"]]}
            for f in take["frames"]
        ],
    }


def main() -> None:
    seen, takes = set(), []
    for path in sorted((TRAINING / "data" / "recordings").glob("*.json")):
        for take in load_recording(path)["takes"]:
            if take["id"] not in seen:
                seen.add(take["id"])
                takes.append(take)
    out = []
    for kind, label, n, style in PICKS:
        matches = [t for t in takes if t.get("kind", "letter") == kind and t["letter"] == label]
        entry = compact(matches[n])
        if style:
            entry["style"] = style
        out.append(entry)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"note": "Sample of Jordan's recordings for motion tests.", "takes": out}, separators=(",", ":")) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(out)} takes, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
