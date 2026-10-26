"""Renders hand skeletons as inline SVG so dataset orientation can be checked by eye."""

from __future__ import annotations

import html
from collections.abc import Sequence

import numpy as np

from asl_drill.datasets import STATIC_LETTERS, Sample
from asl_drill.normalize import normalize_landmarks

CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (9, 10), (10, 11), (11, 12),
    (13, 14), (14, 15), (15, 16), (0, 17), (17, 18), (18, 19), (19, 20), (5, 9), (9, 13), (13, 17),
]
THUMB = {1, 2, 3, 4}


def skeleton_svg(sample: Sample, caption: str, size: int = 150) -> str:
    """The hand as the classifier sees it (always a right hand), drawn in mirror
    view like the app's preview, with the thumb highlighted."""
    features = normalize_landmarks(sample.landmarks, sample.side, sample.aspect_ratio)
    if features is None:
        return ""
    points = features.reshape(21, 3)[:, :2].copy()
    points[:, 0] = -points[:, 0]  # mirror view
    lo, hi = points.min(axis=0), points.max(axis=0)
    span = float((hi - lo).max()) or 1.0
    pad = 12
    scaled = (points - (lo + hi) / 2) / span * (size - 2 * pad) + size / 2
    lines = []
    for a, b in CONNECTIONS:
        color = "#e2b714" if a in THUMB and b in THUMB or (a, b) == (0, 1) else "#d1d0c5"
        (x1, y1), (x2, y2) = scaled[a], scaled[b]
        lines.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>')
    dots = "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3.2 if i == 0 else 2.2}" fill="{"#e2b714" if i in THUMB else "#d1d0c5"}"/>'
        for i, (x, y) in enumerate(scaled)
    )
    return (
        f'<figure><svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" '
        f'aria-label="{html.escape(caption)}">{"".join(lines)}{dots}</svg>'
        f"<figcaption>{html.escape(caption)}</figcaption></figure>"
    )


def render_orientation_page(
    ours: Sequence[Sample],
    asl_now: Sequence[Sample],
    p_right: dict[str, float],
    per_kind: int = 3,
    seed: int = 0,
) -> str:
    """For each letter: one of our frames, then asl-now samples that were kept
    as-is and ones that were flipped. All should look like the same hand."""
    rng = np.random.default_rng(seed)
    rows = []
    for letter in STATIC_LETTERS:
        mine = [s for s in ours if s.letter == letter]
        theirs = [s for s in asl_now if s.letter == letter]
        cells = []
        if mine:
            cells.append(skeleton_svg(mine[len(mine) // 2], "yours"))
        for flipped in (False, True):
            group = [s for s in theirs if (p_right[s.group] < 0.5) == flipped]
            for i in rng.permutation(len(group))[:per_kind]:
                s = group[int(i)]
                cells.append(skeleton_svg(s, f"{'flipped' if flipped else 'as-is'} · p(right)={p_right[s.group]:.2f}"))
        rows.append(f'<section><h2>{letter}</h2><div class="row">{"".join(cells)}</div></section>')
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>asl-now orientation check</title>
<style>
body{{background:#1e1f22;color:#d1d0c5;font:14px ui-monospace,monospace;margin:24px}}
h1{{font-size:18px;color:#e2b714}} h2{{font-size:16px;margin:16px 0 4px}}
.row{{display:flex;flex-wrap:wrap;gap:8px}} figure{{margin:0;background:#2b2d31;border-radius:6px;padding:4px}}
figcaption{{font-size:11px;color:#9a9b9e;text-align:center;padding-bottom:4px}} p{{max-width:70ch;color:#9a9b9e}}
</style></head><body>
<h1>asl-now orientation check</h1>
<p>Every hand is drawn as the classifier sees it: as a right hand, in mirror view like the app preview, thumb in
yellow. Within a letter, "yours", "as-is", and "flipped" should all show the thumb on the same side. A flipped sample
whose thumb is on the other side means the chirality model got it wrong.</p>
{"".join(rows)}
</body></html>
"""
