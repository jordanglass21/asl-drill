"""Reads recording files exported by the app's /record page
(src/lib/recording/format.ts) and turns them into training samples."""

from __future__ import annotations

import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np

from asl_drill.normalize import FEATURE_COUNT, normalize_landmarks

RECORDING_FORMAT = "asl-drill-recording"
SUPPORTED_VERSIONS = {1}


class RecordingError(ValueError):
    """The file isn't a recording this code can read."""


def load_recording(path: str | Path) -> dict[str, Any]:
    data = json.loads(Path(path).read_text())
    if not isinstance(data, dict) or data.get("format") != RECORDING_FORMAT:
        raise RecordingError(f"{path}: not an ASL Drill recording")
    if data.get("version") not in SUPPORTED_VERSIONS:
        raise RecordingError(f"{path}: unsupported recording version {data.get('version')!r}")
    return data


def to_samples(
    recordings: Iterable[dict[str, Any]],
    letters: Iterable[str] | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Flattens recordings into one normalized sample per frame.

    Returns (X, y, take_ids): X has shape (n, 63), y holds each frame's letter,
    and take_ids lets callers split train/test by take so near-identical
    frames from one take never land on both sides.
    Frames that can't be normalized are skipped. Each export contains every
    take recorded so far in that session, so a take that appears in several
    files (e.g. a mid-session backup and the final export) is counted once.
    """
    wanted = {letter.upper() for letter in letters} if letters is not None else None
    features: list[np.ndarray] = []
    labels: list[str] = []
    take_ids: list[str] = []
    seen: set[str] = set()
    for recording in recordings:
        for take in recording["takes"]:
            if take["id"] in seen or (wanted is not None and take["letter"] not in wanted):
                continue
            seen.add(take["id"])
            aspect = take["camera"]["width"] / take["camera"]["height"]
            for frame in take["frames"]:
                vector = normalize_landmarks(frame["landmarks"], frame["side"], aspect)
                if vector is None:
                    continue
                features.append(vector)
                labels.append(take["letter"])
                take_ids.append(take["id"])
    X = np.stack(features) if features else np.empty((0, FEATURE_COUNT))
    return X, np.array(labels, dtype=str), np.array(take_ids, dtype=str)
