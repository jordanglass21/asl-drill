"""The letter classifier: training, export to the app's JSON format, and a
NumPy forward pass over the exported file that mirrors src/lib/classifier/."""

from __future__ import annotations

import base64
import json
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.neural_network import MLPClassifier

from asl_drill.normalize import FEATURE_COUNT, NORMALIZATION_VERSION

MODEL_FORMAT = "asl-drill-letter-model"
MODEL_VERSION = 1
HIDDEN_LAYERS = (128, 64)


def train_mlp(X: np.ndarray, y: np.ndarray, seed: int = 0) -> MLPClassifier:
    model = MLPClassifier(
        hidden_layer_sizes=HIDDEN_LAYERS,
        activation="relu",
        alpha=1e-3,
        batch_size=256,
        learning_rate_init=1e-3,
        max_iter=200,
        early_stopping=True,
        n_iter_no_change=15,
        random_state=seed,
    )
    return model.fit(X, y)


def _encode(array: np.ndarray) -> str:
    return base64.b64encode(np.ascontiguousarray(array, dtype="<f4").tobytes()).decode("ascii")


def _decode(text: str, shape: Sequence[int]) -> np.ndarray:
    return np.frombuffer(base64.b64decode(text), dtype="<f4").astype(np.float64).reshape(shape)


def export_model(model: MLPClassifier, threshold: float, metadata: dict[str, Any]) -> dict[str, Any]:
    """Serializes the network. Weights are float32, little-endian, base64,
    stored row-major as (inputs, outputs)."""
    layers = []
    for i, (weights, bias) in enumerate(zip(model.coefs_, model.intercepts_)):
        last = i == len(model.coefs_) - 1
        layers.append(
            {
                "inputs": int(weights.shape[0]),
                "outputs": int(weights.shape[1]),
                "activation": "softmax" if last else "relu",
                "weights": _encode(weights),
                "bias": _encode(bias),
            }
        )
    return {
        "format": MODEL_FORMAT,
        "version": MODEL_VERSION,
        "normalizationVersion": NORMALIZATION_VERSION,
        "labels": [str(label) for label in model.classes_],
        "threshold": threshold,
        "layers": layers,
        "metadata": metadata,
    }


def predict_exported(exported: dict[str, Any], X: np.ndarray) -> np.ndarray:
    """Class probabilities from an exported model (rows of X are 63 features)."""
    if exported["format"] != MODEL_FORMAT or exported["version"] != MODEL_VERSION:
        raise ValueError("not a supported letter model")
    activations = np.atleast_2d(np.asarray(X, dtype=np.float64))
    if activations.shape[1] != FEATURE_COUNT:
        raise ValueError(f"expected {FEATURE_COUNT} features")
    for layer in exported["layers"]:
        weights = _decode(layer["weights"], (layer["inputs"], layer["outputs"]))
        bias = _decode(layer["bias"], (layer["outputs"],))
        activations = activations @ weights + bias
        if layer["activation"] == "relu":
            activations = np.maximum(activations, 0.0)
        else:
            activations = activations - activations.max(axis=1, keepdims=True)
            activations = np.exp(activations)
            activations /= activations.sum(axis=1, keepdims=True)
    return activations


def write_model(exported: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(exported, separators=(",", ":")) + "\n")
