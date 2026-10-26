"""Training-time augmentation on normalized features."""

from __future__ import annotations

import numpy as np

# Kept small on purpose: K/P, G/Q, and H/U differ mainly in orientation.
MAX_ROTATION_DEG = 8.0
JITTER_STD = 0.01


def augment(X: np.ndarray, y: np.ndarray, copies: int, seed: int = 0) -> tuple[np.ndarray, np.ndarray]:
    """Returns the originals plus `copies` perturbed versions of each row: a
    small in-plane rotation about the wrist and per-coordinate jitter."""
    if copies <= 0:
        return X, y
    rng = np.random.default_rng(seed)
    points = X.reshape(len(X), 21, 3)
    out_X, out_y = [X], [y]
    for _ in range(copies):
        angles = np.deg2rad(rng.uniform(-MAX_ROTATION_DEG, MAX_ROTATION_DEG, size=len(X)))
        cos, sin = np.cos(angles)[:, None], np.sin(angles)[:, None]
        rotated = points.copy()
        rotated[:, :, 0] = cos * points[:, :, 0] - sin * points[:, :, 1]
        rotated[:, :, 1] = sin * points[:, :, 0] + cos * points[:, :, 1]
        rotated += rng.normal(0, JITTER_STD, size=rotated.shape)
        rotated[:, 0, :] = 0.0  # the wrist stays at the origin
        out_X.append(rotated.reshape(len(X), -1))
        out_y.append(y)
    return np.concatenate(out_X), np.concatenate(out_y)
