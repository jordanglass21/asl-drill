"""Landmark normalization. Must match src/lib/landmarks/normalize.ts exactly;
both are tested against the shared cases in fixtures/normalization/."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Literal

import numpy as np

# Bump (in both languages) whenever the output changes; models record it.
NORMALIZATION_VERSION = 1
LANDMARK_COUNT = 21
FEATURE_COUNT = LANDMARK_COUNT * 3
WRIST = 0
MIDDLE_MCP = 9
# Below this wrist-to-knuckle distance the hand is degenerate (collapsed or
# far too small to read), so no features are produced.
MIN_HAND_SCALE = 1e-3

Side = Literal["left", "right"]


def normalize_landmarks(
    landmarks: Sequence[Mapping[str, float]] | np.ndarray,
    side: Side,
    aspect_ratio: float,
) -> np.ndarray | None:
    """Turns 21 MediaPipe landmarks into 63 classifier features.

    1. Scale x and z by the frame's aspect ratio (width / height) so all axes
       share y's units. MediaPipe normalizes x by width, y by height, and z
       roughly like x.
    2. Translate so the wrist is the origin.
    3. Mirror x for a left hand, so the classifier always sees a right hand.
    4. Divide by the 3D wrist-to-middle-knuckle distance.

    Rotation is deliberately kept: some letters (K/P, G/Q, H/U) differ mainly
    in orientation. Returns None for unusable input.
    """
    points = _as_array(landmarks)
    if points is None or not np.isfinite(aspect_ratio) or aspect_ratio <= 0:
        return None
    if side not in ("left", "right"):
        return None

    points = points * np.array([aspect_ratio, 1.0, aspect_ratio])
    points = points - points[WRIST]
    scale = float(np.linalg.norm(points[MIDDLE_MCP]))
    if not scale >= MIN_HAND_SCALE:
        return None
    if side == "left":
        points[:, 0] = -points[:, 0]
    return (points / scale).reshape(FEATURE_COUNT)


def _as_array(landmarks: Sequence[Mapping[str, float]] | np.ndarray) -> np.ndarray | None:
    if isinstance(landmarks, np.ndarray):
        points = landmarks.astype(np.float64)
    else:
        try:
            points = np.array([[lm["x"], lm["y"], lm["z"]] for lm in landmarks], dtype=np.float64)
        except (KeyError, TypeError, ValueError):
            return None
    if points.shape != (LANDMARK_COUNT, 3) or not np.all(np.isfinite(points)):
        return None
    return points
