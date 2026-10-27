import json
from pathlib import Path

import numpy as np
import pytest

from asl_drill.normalize import FEATURE_COUNT, normalize_landmarks
from asl_drill.datasets import load_excluded_takes, load_ours
from asl_drill.recordings import RecordingError, load_recording, to_samples

SAMPLE = Path(__file__).resolve().parents[2] / "fixtures" / "recording" / "sample-v1.json"


def test_loads_the_app_export():
    recording = load_recording(SAMPLE)
    assert [take["letter"] for take in recording["takes"]] == ["B", "K"]


def test_builds_one_normalized_sample_per_frame():
    X, y, take_ids = to_samples([load_recording(SAMPLE)])
    assert X.shape == (8, FEATURE_COUNT)
    assert list(y) == ["B"] * 4 + ["K"] * 4
    assert list(take_ids) == ["sample-b"] * 4 + ["sample-k"] * 4
    np.testing.assert_allclose(X[:, :3], 0, atol=1e-12)  # wrist at the origin


def test_uses_each_take_aspect_ratio():
    recording = load_recording(SAMPLE)
    take = recording["takes"][0]
    frame = take["frames"][0]
    expected = normalize_landmarks(frame["landmarks"], frame["side"], 1280 / 720)
    X, _, _ = to_samples([recording])
    np.testing.assert_allclose(X[0], expected)


def test_counts_a_take_once_across_overlapping_exports():
    backup = load_recording(SAMPLE)
    backup["takes"] = backup["takes"][:1]  # an earlier export with only the B take
    X, y, _ = to_samples([backup, load_recording(SAMPLE)])
    assert X.shape == (8, FEATURE_COUNT)
    assert list(y) == ["B"] * 4 + ["K"] * 4


def test_filters_by_letter():
    X, y, _ = to_samples([load_recording(SAMPLE)], letters=["k"])
    assert X.shape == (4, FEATURE_COUNT)
    assert set(y) == {"K"}


def test_skips_frames_that_cannot_be_normalized():
    recording = load_recording(SAMPLE)
    recording["takes"][0]["frames"][0]["landmarks"] = recording["takes"][0]["frames"][0]["landmarks"][:20]
    X, _, _ = to_samples([recording])
    assert X.shape == (7, FEATURE_COUNT)


def test_handles_no_frames():
    X, y, _ = to_samples([])
    assert X.shape == (0, FEATURE_COUNT)
    assert y.shape == (0,)


@pytest.mark.parametrize(
    "content",
    [{"format": "something-else", "version": 1, "takes": []}, {"format": "asl-drill-recording", "version": 99, "takes": []}],
)
def test_rejects_unknown_files(tmp_path, content):
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(content))
    with pytest.raises(RecordingError):
        load_recording(path)


def test_load_ours_skips_excluded_takes():
    samples = load_ours(SAMPLE.parent, excluded={"sample-k"})
    assert {s.group for s in samples} == {"sample-b"}


def test_every_excluded_take_names_a_letter_and_reason():
    path = Path(__file__).resolve().parents[1] / "excluded_takes.json"
    entries = json.loads(path.read_text())["takes"]
    assert load_excluded_takes(path) == {e["id"] for e in entries}
    assert all(e["letter"] and e["reason"] for e in entries)
