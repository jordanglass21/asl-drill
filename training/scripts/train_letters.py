"""Trains the static letter classifier and writes the report.

Run from training/: uv run python scripts/train_letters.py

1. Orients the asl-now samples with the chirality model (label-free) and
   picks the asl-now aspect ratio that best matches our recordings.
2. Cross-validates by take on our recordings, comparing a model trained on
   ours only against ours + asl-now. Both are scored only on our held-out takes.
3. Ships the combined model only if it doesn't lower held-out accuracy.
4. Writes public/models/letters-v4.json and training/reports/letters-v4*.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from asl_drill import chirality
from asl_drill.augment import augment
from asl_drill.datasets import (
    STATIC_LETTERS,
    Sample,
    featurize,
    load_asl_now,
    load_excluded_takes,
    load_ours,
    min_takes_per_letter,
    take_folds,
    with_aspect,
)
from asl_drill.evaluate import Evaluation, evaluate, pick_threshold
from asl_drill.model import export_model, predict_exported, train_mlp, write_model
from asl_drill.render import render_orientation_page
from make_classifier_fixtures import write_parity_fixture

TRAINING = Path(__file__).resolve().parents[1]
ROOT = TRAINING.parent
MODEL_PATH = ROOT / "public" / "models" / "letters-v4.json"
REPORT_PATH = TRAINING / "reports" / "letters-v4.md"
ORIENTATION_PATH = TRAINING / "reports" / "letters-v4-orientation.html"

SEEDS = (0, 1, 2)
AUGMENT_COPIES = 2
FRAME_STRIDE = 2  # consecutive frames are near-identical; keep every other one
ASPECT_CANDIDATES = {"4:3": 4 / 3, "16:9": 16 / 9, "1:1": 1.0}
LABELS = list(STATIC_LETTERS)


def fit_predict(train: list[Sample], test: list[Sample], seed: int) -> tuple[np.ndarray, np.ndarray]:
    X_train, y_train, _, _ = featurize(train)
    X_train, y_train = augment(X_train, y_train, AUGMENT_COPIES, seed=seed)
    X_test, y_test, _, _ = featurize(test)
    model = train_mlp(X_train, y_train, seed=seed)
    proba = np.zeros((len(X_test), len(LABELS)))
    proba[:, [LABELS.index(c) for c in model.classes_]] = model.predict_proba(X_test)
    return y_test, proba


def cross_validate(ours: list[Sample], extra: list[Sample], seed: int) -> tuple[np.ndarray, np.ndarray]:
    folds = take_folds(ours, n_folds=min(3, min_takes_per_letter(ours)))
    y_all, p_all = [], []
    for fold in sorted(set(folds.values())):
        train = [s for s in ours if folds[s.group] != fold] + extra
        test = [s for s in ours if folds[s.group] == fold]
        y, p = fit_predict(train, test, seed)
        y_all.append(y)
        p_all.append(p)
    return np.concatenate(y_all), np.concatenate(p_all)


def mean_eval(runs: list[tuple[np.ndarray, np.ndarray]]) -> tuple[Evaluation, list[float]]:
    """Evaluation of seed-averaged probabilities, plus each seed's accuracy."""
    y = runs[0][0]
    accs = [float((np.array(LABELS)[p.argmax(1)] == y).mean()) for _, p in runs]
    return evaluate(y, np.mean([p for _, p in runs], axis=0), LABELS), accs


def main() -> None:
    excluded = load_excluded_takes(TRAINING / "excluded_takes.json")
    ours_all = load_ours(TRAINING / "data" / "recordings", excluded=excluded)
    ours = ours_all[::FRAME_STRIDE]
    print(f"ours: {len(ours_all)} frames from {len({s.group for s in ours_all})} takes (using every {FRAME_STRIDE}nd), "
          f"{len(excluded)} takes excluded")

    chir = chirality.train(ours)
    asl_now_raw = load_asl_now(TRAINING / "data" / "asl-now", aspect_ratio=4 / 3)
    asl_now_oriented, p_right = chirality.orient(chir, asl_now_raw)
    orientation = {
        "samples": len(asl_now_oriented),
        "right_as_given": float(np.mean(p_right >= 0.5)),
        "confident": float(np.mean(np.maximum(p_right, 1 - p_right) > 0.9)),
    }
    print(f"asl-now: {len(asl_now_oriented)} samples, {orientation['right_as_given']:.0%} right as given")

    # Aspect ratio: train on ours, score on asl-now at each candidate.
    aspect_scores = {}
    for name, aspect in ASPECT_CANDIDATES.items():
        y, p = fit_predict(ours, with_aspect(asl_now_oriented, aspect), seed=0)
        aspect_scores[name] = float((np.array(LABELS)[p.argmax(1)] == y).mean())
    aspect_name = max(aspect_scores, key=aspect_scores.get)
    asl_now = with_aspect(asl_now_oriented, ASPECT_CANDIDATES[aspect_name])
    print("aspect scores:", aspect_scores, "->", aspect_name)

    print("cross-validating (ours only vs ours + asl-now)…")
    ours_only, ours_only_accs = mean_eval([cross_validate(ours, [], seed) for seed in SEEDS])
    combined, combined_accs = mean_eval([cross_validate(ours, asl_now, seed) for seed in SEEDS])
    print(f"held-out ours: ours-only {ours_only.accuracy:.3f} {np.round(ours_only_accs, 3)}, "
          f"combined {combined.accuracy:.3f} {np.round(combined_accs, 3)}")

    other_signers = evaluate(*fit_predict(ours, asl_now, seed=0), LABELS)
    hf_to_ours = evaluate(*fit_predict(asl_now, ours, seed=0), LABELS)

    # Decide on the mean single-model accuracy, not the seed ensemble, which flatters both.
    use_combined = float(np.mean(combined_accs)) >= float(np.mean(ours_only_accs))
    chosen = combined if use_combined else ours_only
    threshold = pick_threshold(chosen)
    final_train = ours + (asl_now if use_combined else [])
    X, y, _, _ = featurize(final_train)
    X, y = augment(X, y, AUGMENT_COPIES, seed=0)
    final = train_mlp(X, y, seed=0)

    counts = {
        "oursFrames": len(ours_all),
        "oursTakes": len({s.group for s in ours_all}),
        "excludedTakes": len(excluded),
        "aslNowSamples": len(asl_now) if use_combined else 0,
    }
    exported = export_model(
        final,
        threshold,
        {
            "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "data": "ours + asl-now" if use_combined else "ours",
            "counts": counts,
            "heldOutAccuracy": round(float(np.mean(combined_accs if use_combined else ours_only_accs)), 4),
            "aslNowAspect": aspect_name,
        },
    )
    X_check, _, _, _ = featurize(ours[:200])
    drift = np.abs(predict_exported(exported, X_check) - final.predict_proba(X_check)).max()
    assert drift < 1e-4, f"exported model disagrees with scikit-learn by {drift}"
    write_model(exported, MODEL_PATH)
    write_parity_fixture(exported, ours, asl_now)

    ORIENTATION_PATH.write_text(render_orientation_page(ours_all, asl_now, p_right_by_group(asl_now_raw, p_right)))
    REPORT_PATH.write_text(
        report(
            counts, orientation, aspect_scores, aspect_name, ours_only, ours_only_accs, combined, combined_accs,
            other_signers, hf_to_ours, use_combined, threshold, drift,
        )
    )
    print(f"wrote {MODEL_PATH.relative_to(ROOT)} ({MODEL_PATH.stat().st_size // 1024} KB), "
          f"{REPORT_PATH.relative_to(ROOT)}, {ORIENTATION_PATH.relative_to(ROOT)}")


def p_right_by_group(samples: list[Sample], p_right: np.ndarray) -> dict[str, float]:
    return {s.group: float(p) for s, p in zip(samples, p_right)}


def pct(x: float) -> str:
    return "–" if x != x else f"{x:.1%}"


def report(counts, orientation, aspect_scores, aspect_name, ours_only, ours_only_accs, combined, combined_accs,
           other_signers, hf_to_ours, use_combined, threshold, drift) -> str:
    lines = [
        "# Letter model v4: training report",
        "",
        "Generated by `scripts/train_letters.py`. 24 static letters (J and Z need motion, M6).",
        "",
        "## Data",
        "",
        f"- Our recordings: {counts['oursTakes']} takes, {counts['oursFrames']} frames (every {FRAME_STRIDE}nd frame used). "
        f"{counts['excludedTakes']} takes left out by `excluded_takes.json`.",
        f"- asl-now (`sid220/asl-now-fingerspelling`, MIT): {orientation['samples']} samples.",
        f"  - Orientation, inferred per sample by the label-free chirality model: "
        f"{pct(orientation['right_as_given'])} were right hands as given, the rest were flipped. "
        f"{pct(orientation['confident'])} of decisions had confidence above 0.9. "
        "See `letters-v4-orientation.html`.",
        f"  - Aspect ratio (not recorded by the dataset): {aspect_name}, the best of "
        + ", ".join(f"{k} {pct(v)}" for k, v in aspect_scores.items())
        + " (accuracy of an ours-trained model on asl-now).",
        "",
        "## Does asl-now help on your held-out takes?",
        "",
        "Cross-validated by take: every take is held out once, and models never see frames from a held-out take. "
        f"Probabilities are averaged over seeds {', '.join(map(str, SEEDS))}.",
        "",
        "| Training data | Mean accuracy (single model) | Per seed | Seed ensemble |",
        "|---|---|---|---|",
        f"| Ours only | {pct(float(np.mean(ours_only_accs)))} | {', '.join(pct(a) for a in ours_only_accs)} | {pct(ours_only.accuracy)} |",
        f"| Ours + asl-now | {pct(float(np.mean(combined_accs)))} | {', '.join(pct(a) for a in combined_accs)} | {pct(combined.accuracy)} |",
        "",
        f"**Shipped: {'ours + asl-now' if use_combined else 'ours only'}** "
        f"({'combined did not lower' if use_combined else 'combined lowered'} mean held-out accuracy). "
        "Per-letter results below use the seed ensemble for stability.",
        "",
        "## Other signers",
        "",
        f"- Trained on ours, tested on asl-now: {pct(other_signers.accuracy)}",
        f"- Trained on asl-now, tested on ours: {pct(hf_to_ours.accuracy)}",
        "",
        "These are the best guide to how the model does on someone else's hands.",
        "",
        f"## Shipped model: held-out results ({'ours + asl-now' if use_combined else 'ours only'})",
        "",
    ]
    chosen = combined if use_combined else ours_only
    lines += per_letter_table(chosen, other_signers)
    lines += ["", "### Most-confused pairs (held-out takes)", "", "| True | Predicted as | Frames | Share of true |", "|---|---|---|---|"]
    lines += [f"| {t} | {p} | {n} | {pct(s)} |" for t, p, n, s in chosen.confusions]
    lines += ["", "### Most-confused pairs (other signers: ours → asl-now)", "", "| True | Predicted as | Samples | Share of true |", "|---|---|---|---|"]
    lines += [f"| {t} | {p} | {n} | {pct(s)} |" for t, p, n, s in other_signers.confusions]
    lines += [
        "",
        "### Confidence threshold",
        "",
        "Frames below the threshold count as \"no letter\". Coverage is the share of frames that get a letter.",
        "",
        "| Threshold | Coverage | Accuracy on covered |",
        "|---|---|---|",
    ]
    lines += [f"| {t:.2f} | {pct(c)} | {pct(a)} |" for t, c, a in chosen.thresholds]
    lines += [
        "",
        f"Shipped threshold: **{threshold:.2f}** (lowest at or above 0.60 with ≥95% accuracy on covered frames, else 0.80).",
        "",
        f"Export check: the exported float32 model matches scikit-learn within {drift:.1e}.",
        "",
    ]
    return "\n".join(lines)


def per_letter_table(chosen: Evaluation, other: Evaluation) -> list[str]:
    rows = ["| Letter | Held-out (ours) | Frames | Other signers |", "|---|---|---|---|"]
    for label in chosen.labels:
        rows.append(f"| {label} | {pct(chosen.per_letter[label])} | {chosen.support[label]} | {pct(other.per_letter[label])} |")
    return rows


if __name__ == "__main__":
    main()
