"""Metrics for the training report."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np


@dataclass
class Evaluation:
    labels: list[str]
    accuracy: float
    per_letter: dict[str, float]
    support: dict[str, int]
    confusions: list[tuple[str, str, int, float]]  # (true, predicted, count, share of true)
    thresholds: list[tuple[float, float, float]]  # (threshold, coverage, accuracy on covered)


def evaluate(y_true: np.ndarray, proba: np.ndarray, labels: Sequence[str], top_confusions: int = 10) -> Evaluation:
    labels = list(labels)
    pred = np.array(labels)[proba.argmax(axis=1)]
    confidence = proba.max(axis=1)
    per_letter, support = {}, {}
    for label in labels:
        mask = y_true == label
        support[label] = int(mask.sum())
        per_letter[label] = float((pred[mask] == label).mean()) if mask.any() else float("nan")
    pairs: dict[tuple[str, str], int] = {}
    for t, p in zip(y_true, pred):
        if t != p:
            pairs[(t, p)] = pairs.get((t, p), 0) + 1
    confusions = sorted(
        ((t, p, n, n / support[t]) for (t, p), n in pairs.items()), key=lambda c: (-c[2], c[0], c[1])
    )[:top_confusions]
    thresholds = []
    for threshold in (0.0, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95):
        covered = confidence >= threshold
        acc = float((pred[covered] == y_true[covered]).mean()) if covered.any() else float("nan")
        thresholds.append((threshold, float(covered.mean()), acc))
    return Evaluation(labels, float((pred == y_true).mean()), per_letter, support, confusions, thresholds)


def pick_threshold(evaluation: Evaluation, target_accuracy: float = 0.95, fallback: float = 0.8) -> float:
    """The lowest listed threshold whose accepted predictions reach the target accuracy."""
    for threshold, coverage, accuracy in evaluation.thresholds:
        if threshold > 0 and coverage > 0 and accuracy >= target_accuracy:
            return threshold
    return fallback
