"""Writes fixtures/classifier/parity.json: feature vectors and the class
probabilities the exported model gives them, computed by the Python forward
pass. The TypeScript classifier must reproduce them (src/lib/classifier/).

Called by train_letters.py after export. To regenerate for the current
model without retraining: uv run python scripts/make_classifier_fixtures.py
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np

from asl_drill.datasets import STATIC_LETTERS, Sample, featurize, load_asl_now, load_ours
from asl_drill.model import predict_exported

TRAINING = Path(__file__).resolve().parents[1]
ROOT = TRAINING.parent
MODEL_PATH = ROOT / "public" / "models" / "letters-v2.json"
FIXTURE_PATH = ROOT / "fixtures" / "classifier" / "parity.json"
NORMALIZATION_CASES = ROOT / "fixtures" / "normalization" / "cases.json"


def write_parity_fixture(exported: dict[str, Any], ours: Sequence[Sample], asl_now: Sequence[Sample]) -> None:
    inputs: list[list[float]] = []
    names: list[str] = []
    # Every non-null normalization case, so the two fixture sets chain together.
    for case in json.loads(NORMALIZATION_CASES.read_text())["cases"]:
        if case["expected"] is not None:
            inputs.append(case["expected"])
            names.append(f"normalization:{case['name']}")
    # One real frame per letter from each source.
    for source, samples in (("ours", ours), ("asl-now", asl_now)):
        for letter in STATIC_LETTERS:
            match = next((s for s in samples if s.letter == letter), None)
            if match is None:
                continue
            X, _, _, _ = featurize([match])
            if len(X):
                inputs.append([float(v) for v in X[0]])
                names.append(f"{source}:{letter}")
    inputs.append([0.0] * 63)
    names.append("zeros")
    expected = predict_exported(exported, np.array(inputs))
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(
        json.dumps(
            {
                "model": "public/models/letters-v2.json",
                "tolerance": 1e-6,
                "cases": [
                    {"name": n, "input": x, "expected": [float(p) for p in row]}
                    for n, x, row in zip(names, inputs, expected)
                ],
            },
            indent=1,
        )
        + "\n"
    )
    print(f"wrote {FIXTURE_PATH.relative_to(ROOT)} ({len(inputs)} cases)")


def main() -> None:
    exported = json.loads(MODEL_PATH.read_text())
    ours = load_ours(TRAINING / "data" / "recordings")
    aspect = {"4:3": 4 / 3, "16:9": 16 / 9, "1:1": 1.0}[exported["metadata"]["aslNowAspect"]]
    write_parity_fixture(exported, ours, load_asl_now(TRAINING / "data" / "asl-now", aspect))


if __name__ == "__main__":
    main()
