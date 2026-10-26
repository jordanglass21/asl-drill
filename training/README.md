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

## Normalization

`asl_drill/normalize.py` must match `src/lib/landmarks/normalize.ts` exactly.
Both are tested against `fixtures/normalization/cases.json`; to add a case,
edit `scripts/make_normalization_fixtures.py` and run
`uv run python scripts/make_normalization_fixtures.py`, then run both test
suites.
