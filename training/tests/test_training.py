import json
from pathlib import Path

import numpy as np
import pytest
from sklearn.neural_network import MLPClassifier

from asl_drill import chirality
from asl_drill.augment import augment
from asl_drill.datasets import Sample, featurize, take_folds
from asl_drill.evaluate import evaluate, pick_threshold
from asl_drill.model import export_model, predict_exported

ROOT = Path(__file__).resolve().parents[2]
CASES = {c["name"]: c for c in json.loads((ROOT / "fixtures" / "normalization" / "cases.json").read_text())["cases"]}


def points(name: str) -> np.ndarray:
    return np.array([[p["x"], p["y"], p["z"]] for p in CASES[name]["input"]["landmarks"]])


def sample(letter="B", group="t1", side="right", name="real-B-right") -> Sample:
    return Sample(points(name), side, 4 / 3, letter, group, "ours")


def test_featurize_drops_unusable_samples():
    broken = Sample(np.zeros((21, 3)), "right", 1.0, "A", "t0", "ours")
    X, y, groups, kept = featurize([sample(), broken])
    assert X.shape == (1, 63)
    assert list(y) == ["B"] and list(groups) == ["t1"] and len(kept) == 1


def test_take_folds_spread_each_letters_takes():
    samples = [sample("A", f"a{i}") for i in range(3)] + [sample("B", f"b{i}") for i in range(3)]
    folds = take_folds(samples + samples, n_folds=3)  # repeated frames share a take
    assert sorted(folds[f"a{i}"] for i in range(3)) == [0, 1, 2]
    assert sorted(folds[f"b{i}"] for i in range(3)) == [0, 1, 2]


def test_augment_keeps_originals_and_wrist():
    X, y, _, _ = featurize([sample()])
    X_aug, y_aug = augment(X, y, copies=3, seed=1)
    assert X_aug.shape == (4, 63) and list(y_aug) == ["B"] * 4
    np.testing.assert_array_equal(X_aug[0], X[0])
    np.testing.assert_allclose(X_aug[:, :3], 0.0)
    assert not np.allclose(X_aug[1], X[0])


def test_chirality_set_pairs_each_hand_with_its_mirror():
    X, y, groups = chirality.training_set([sample()])
    assert list(y) == [1, 0] and list(groups) == ["t1", "t1"]
    np.testing.assert_allclose(X[1].reshape(21, 3)[:, 0], -X[0].reshape(21, 3)[:, 0])


def test_chirality_treats_left_samples_as_their_right_equivalent():
    left = sample(side="left")
    flipped = points("real-B-right").copy()
    flipped[:, 0] = 1 - flipped[:, 0]
    as_right = Sample(flipped, "right", 4 / 3, "B", "t1", "ours")
    np.testing.assert_allclose(chirality.training_set([left])[0], chirality.training_set([as_right])[0])


def test_evaluate_reports_accuracy_confusions_and_coverage():
    labels = ["A", "B"]
    y = np.array(["A", "A", "B", "B"])
    proba = np.array([[0.9, 0.1], [0.4, 0.6], [0.2, 0.8], [0.45, 0.55]])
    ev = evaluate(y, proba, labels)
    assert ev.accuracy == 0.75
    assert ev.per_letter == {"A": 0.5, "B": 1.0}
    assert ev.confusions == [("A", "B", 1, 0.5)]
    by_threshold = {t: (c, a) for t, c, a in ev.thresholds}
    assert by_threshold[0.8] == (0.5, 1.0)
    assert pick_threshold(ev, target_accuracy=1.0) == 0.7


def test_export_round_trip_matches_scikit_learn():
    rng = np.random.default_rng(0)
    X = rng.normal(size=(60, 63))
    y = np.array(["A", "B", "C"])[rng.integers(0, 3, size=60)]
    model = MLPClassifier(hidden_layer_sizes=(8,), max_iter=50, random_state=0).fit(X, y)
    exported = export_model(model, 0.7, {})
    assert exported["labels"] == ["A", "B", "C"] and exported["threshold"] == 0.7
    np.testing.assert_allclose(predict_exported(exported, X), model.predict_proba(X), atol=1e-5)


def test_predict_exported_rejects_wrong_inputs():
    rng = np.random.default_rng(0)
    model = MLPClassifier(hidden_layer_sizes=(4,), max_iter=5, random_state=0).fit(rng.normal(size=(10, 63)), ["A", "B"] * 5)
    exported = export_model(model, 0.5, {})
    with pytest.raises(ValueError):
        predict_exported(exported, np.zeros((1, 62)))
    with pytest.raises(ValueError):
        predict_exported({**exported, "version": 99}, np.zeros((1, 63)))
