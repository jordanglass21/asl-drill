"""The Python half of the classifier parity check; the TypeScript half is
src/lib/classifier/model.test.ts. Both read the same fixture."""

import json
from pathlib import Path

import numpy as np

from asl_drill.model import predict_exported
from asl_drill.normalize import NORMALIZATION_VERSION

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = json.loads((ROOT / "fixtures" / "classifier" / "parity.json").read_text())
MODEL = json.loads((ROOT / FIXTURE["model"]).read_text())


def test_shipped_model_matches_the_parity_fixture():
    X = np.array([case["input"] for case in FIXTURE["cases"]])
    expected = np.array([case["expected"] for case in FIXTURE["cases"]])
    np.testing.assert_allclose(predict_exported(MODEL, X), expected, rtol=0, atol=FIXTURE["tolerance"])


def test_shipped_model_is_well_formed():
    assert MODEL["normalizationVersion"] == NORMALIZATION_VERSION
    assert MODEL["labels"] == list("ABCDEFGHIKLMNOPQRSTUVWXY")
    assert 0 < MODEL["threshold"] < 1
    assert MODEL["layers"][0]["inputs"] == 63 and MODEL["layers"][-1]["outputs"] == 24
    for prev, layer in zip(MODEL["layers"], MODEL["layers"][1:]):
        assert prev["outputs"] == layer["inputs"]
