import json
from pathlib import Path

import numpy as np
import pytest

from asl_drill.normalize import FEATURE_COUNT, normalize_landmarks

FIXTURES = json.loads((Path(__file__).resolve().parents[2] / "fixtures" / "normalization" / "cases.json").read_text())
CASES = {case["name"]: case for case in FIXTURES["cases"]}


@pytest.mark.parametrize("case", FIXTURES["cases"], ids=lambda case: case["name"])
def test_matches_shared_fixture(case):
    inp = case["input"]
    result = normalize_landmarks(inp["landmarks"], inp["side"], inp["aspectRatio"])
    if case["expected"] is None:
        assert result is None
    else:
        assert result is not None
        assert result.shape == (FEATURE_COUNT,)
        np.testing.assert_allclose(result, case["expected"], rtol=0, atol=FIXTURES["tolerance"])


def test_wrist_is_origin_and_knuckle_at_unit_distance():
    inp = CASES["real-B-right"]["input"]
    points = normalize_landmarks(inp["landmarks"], "right", inp["aspectRatio"]).reshape(21, 3)
    np.testing.assert_allclose(points[0], 0, atol=1e-12)
    assert np.linalg.norm(points[9]) == pytest.approx(1.0)


def test_left_hand_is_right_hand_with_x_negated():
    inp = CASES["real-B-right"]["input"]
    right = normalize_landmarks(inp["landmarks"], "right", inp["aspectRatio"]).reshape(21, 3)
    left = normalize_landmarks(inp["landmarks"], "left", inp["aspectRatio"]).reshape(21, 3)
    np.testing.assert_allclose(left[:, 0], -right[:, 0])
    np.testing.assert_allclose(left[:, 1:], right[:, 1:])


def test_rotation_is_preserved():
    landmarks = CASES["simple-right"]["input"]["landmarks"]
    rotated = [{"x": 0.5 + (lm["y"] - 0.5), "y": 0.5 - (lm["x"] - 0.5), "z": lm["z"]} for lm in landmarks]
    a = normalize_landmarks(landmarks, "right", 1.0)
    b = normalize_landmarks(rotated, "right", 1.0)
    assert not np.allclose(a, b)


@pytest.mark.parametrize("aspect", [0, -1, float("nan"), float("inf")])
def test_rejects_bad_aspect_ratio(aspect):
    assert normalize_landmarks(CASES["simple-right"]["input"]["landmarks"], "right", aspect) is None


def test_rejects_non_finite_landmarks():
    landmarks = [dict(lm) for lm in CASES["simple-right"]["input"]["landmarks"]]
    landmarks[4]["x"] = float("nan")
    assert normalize_landmarks(landmarks, "right", 1.0) is None


def test_accepts_numpy_input():
    landmarks = CASES["simple-right"]["input"]["landmarks"]
    array = np.array([[lm["x"], lm["y"], lm["z"]] for lm in landmarks])
    np.testing.assert_allclose(normalize_landmarks(array, "right", 1.0), CASES["simple-right"]["expected"], atol=1e-9)
