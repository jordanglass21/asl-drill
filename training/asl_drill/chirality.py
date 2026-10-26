"""Decides whether a hand of unknown origin is a right hand or a mirrored one.

The classifier learns hand chirality from our own recordings (known right
hands, un-mirrored frames) versus mirrored copies of the same frames. It
never sees letter labels, so using it on a dataset can't leak labels into
evaluation.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace

import numpy as np
from sklearn.neural_network import MLPClassifier

from asl_drill.datasets import Sample
from asl_drill.normalize import normalize_landmarks


def _as_right(sample: Sample) -> np.ndarray | None:
    """Normalized features without the left-hand mirror, so chirality survives."""
    return normalize_landmarks(sample.landmarks, "right", sample.aspect_ratio)


def _canonical(sample: Sample) -> Sample:
    """The same hand as a right hand in an un-mirrored frame."""
    if sample.side == "right":
        return sample
    flipped = sample.landmarks.copy()
    flipped[:, 0] = 1.0 - flipped[:, 0]
    return replace(sample, landmarks=flipped, side="right")


def training_set(samples: Sequence[Sample]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(X, y, groups) with y=1 for a true right hand and y=0 for its mirror image."""
    rows, labels, groups = [], [], []
    for sample in samples:
        vector = _as_right(_canonical(sample))
        if vector is None:
            continue
        mirrored = vector.reshape(21, 3).copy()
        mirrored[:, 0] = -mirrored[:, 0]
        rows += [vector, mirrored.reshape(-1)]
        labels += [1, 0]
        groups += [sample.group, sample.group]
    return np.stack(rows), np.array(labels), np.array(groups)


def train(samples: Sequence[Sample], seed: int = 0) -> MLPClassifier:
    X, y, _ = training_set(samples)
    model = MLPClassifier(hidden_layer_sizes=(32,), alpha=1e-3, max_iter=500, random_state=seed)
    return model.fit(X, y)


def orient(model: MLPClassifier, samples: Sequence[Sample]) -> tuple[list[Sample], np.ndarray]:
    """Relabels each sample as left or right. Returns the samples and the
    model's probability that each was a right hand as given."""
    oriented, p_right = [], []
    for sample in samples:
        vector = _as_right(sample)
        if vector is None:
            continue
        p = float(model.predict_proba(vector.reshape(1, -1))[0, 1])
        oriented.append(replace(sample, side="right" if p >= 0.5 else "left"))
        p_right.append(p)
    return oriented, np.array(p_right)
