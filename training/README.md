# Training

Python code for preparing data and training the ASL Drill letter classifier.
Uses [uv](https://docs.astral.sh/uv/) with Python 3.12.

```bash
cd training
uv sync
uv run pytest
```

## Data

Raw data lives in `training/data/` and is never committed.

- **Your recordings:** export from the app's `/record` page and save the JSON
  files to `training/data/recordings/`. Read them with
  `asl_drill.recordings.load_recording` and `to_samples`. Export as often as
  you like: each file holds every take so far, and takes that appear in several
  files are only counted once.

- **asl-now** (`sid220/asl-now-fingerspelling`, MIT): `uv run python scripts/download_asl_now.py`
  downloads a pinned revision to `training/data/asl-now/`.

## Training the letter model

```bash
uv run python scripts/train_letters.py
```

This orients the asl-now samples (a chirality model trained on your recordings
decides per sample whether a hand is mirrored), cross-validates by take, and
compares ours-only against ours + asl-now on your held-out takes. The combined
data ships only if it doesn't lower held-out accuracy. It writes:

- `public/models/letters-v2.json`: the model the app loads
- `training/reports/letters-v2.md`: per-letter accuracy, confused pairs, thresholds
- `training/reports/letters-v2-orientation.html`: skeletons to eyeball orientation
- `fixtures/classifier/parity.json`: inputs and expected probabilities that the
  TypeScript classifier must reproduce

Every retrain that ships needs a new name (next: `letters-v3`): bump it in
`scripts/train_letters.py`, `scripts/make_classifier_fixtures.py`, and
`LETTER_MODEL_PATH`, since model files are cached as immutable for a year.

## Normalization

`asl_drill/normalize.py` must match `src/lib/landmarks/normalize.ts` exactly.
Both are tested against `fixtures/normalization/cases.json`; to add a case,
edit `scripts/make_normalization_fixtures.py` and run
`uv run python scripts/make_normalization_fixtures.py`, then run both test
suites.
