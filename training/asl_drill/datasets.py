"""Raw landmark samples from every data source, kept un-normalized so
orientation and aspect ratio can be decided per source before featurizing."""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np

from asl_drill.normalize import FEATURE_COUNT, Side, normalize_landmarks
from asl_drill.recordings import load_recording

STATIC_LETTERS = tuple("ABCDEFGHIKLMNOPQRSTUVWXY")  # J and Z need motion (M6)


@dataclass(frozen=True)
class Sample:
    landmarks: np.ndarray  # (21, 3) raw MediaPipe image landmarks
    side: Side
    aspect_ratio: float
    letter: str
    group: str  # take id, or file id for single-frame sources
    source: str  # "ours" or "asl-now"


def load_excluded_takes(path: Path) -> set[str]:
    """Take ids listed in excluded_takes.json, which training skips."""
    return {entry["id"] for entry in json.loads(path.read_text())["takes"]}


def load_ours(
    directory: Path, letters: Iterable[str] = STATIC_LETTERS, excluded: Iterable[str] = ()
) -> list[Sample]:
    """Frames from /record exports, each take counted once across files.
    Takes whose id is in `excluded` are skipped."""
    wanted = set(letters)
    seen: set[str] = set(excluded)
    samples: list[Sample] = []
    for path in sorted(directory.glob("*.json")):
        for take in load_recording(path)["takes"]:
            if take["id"] in seen or take["letter"] not in wanted:
                continue
            seen.add(take["id"])
            aspect = take["camera"]["width"] / take["camera"]["height"]
            for frame in take["frames"]:
                points = np.array([[p["x"], p["y"], p["z"]] for p in frame["landmarks"]], dtype=np.float64)
                if points.shape != (21, 3):
                    continue
                samples.append(Sample(points, frame["side"], aspect, take["letter"], take["id"], "ours"))
    return samples


def load_asl_now(directory: Path, aspect_ratio: float, letters: Iterable[str] = STATIC_LETTERS) -> list[Sample]:
    """Single-frame samples from sid220/asl-now-fingerspelling. The dataset
    doesn't record handedness or frame size, so every sample starts as a
    right hand at `aspect_ratio`; fix orientation with chirality.orient()."""
    samples: list[Sample] = []
    for letter in letters:
        for path in sorted((directory / letter).glob("*.json")):
            points = np.array([[p["x"], p["y"], p["z"]] for p in json.loads(path.read_text())], dtype=np.float64)
            if points.shape != (21, 3):
                continue
            samples.append(Sample(points, "right", aspect_ratio, letter, f"asl-now/{letter}/{path.stem}", "asl-now"))
    return samples


def with_aspect(samples: Iterable[Sample], aspect_ratio: float) -> list[Sample]:
    return [replace(s, aspect_ratio=aspect_ratio) for s in samples]


def featurize(samples: Iterable[Sample]) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[Sample]]:
    """Normalizes samples into (X, y, groups); unusable samples are dropped
    and the kept ones are returned alongside."""
    rows, labels, groups, kept = [], [], [], []
    for sample in samples:
        vector = normalize_landmarks(sample.landmarks, sample.side, sample.aspect_ratio)
        if vector is None:
            continue
        rows.append(vector)
        labels.append(sample.letter)
        groups.append(sample.group)
        kept.append(sample)
    X = np.stack(rows) if rows else np.empty((0, FEATURE_COUNT))
    return X, np.array(labels, dtype=str), np.array(groups, dtype=str), kept


def take_folds(samples: Iterable[Sample], n_folds: int) -> dict[str, int]:
    """Assigns each take (group) to a fold, round-robin per letter in recording
    order, so every fold holds out about 1/n of each letter's takes."""
    order: dict[str, list[str]] = {}
    for sample in samples:
        takes = order.setdefault(sample.letter, [])
        if sample.group not in takes:
            takes.append(sample.group)
    return {take: i % n_folds for takes in order.values() for i, take in enumerate(takes)}


def min_takes_per_letter(samples: Iterable[Sample]) -> int:
    takes: dict[str, set[str]] = {}
    for sample in samples:
        takes.setdefault(sample.letter, set()).add(sample.group)
    return min(len(t) for t in takes.values())
