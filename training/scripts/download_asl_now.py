"""Downloads the sid220/asl-now-fingerspelling dataset (MIT) into
training/data/asl-now/ (gitignored).

Run from training/: uv run python scripts/download_asl_now.py
"""

from __future__ import annotations

from pathlib import Path

from huggingface_hub import snapshot_download

REPO_ID = "sid220/asl-now-fingerspelling"
# Pinned so every training run sees the same data; bump deliberately.
REVISION = "9b3c96ae0adb7744a2c9fc72692842e6b3e25e33"
DEST = Path(__file__).resolve().parents[1] / "data" / "asl-now"


def main() -> None:
    path = snapshot_download(repo_id=REPO_ID, repo_type="dataset", revision=REVISION, local_dir=DEST)
    count = sum(1 for _ in Path(path).glob("*/*.json"))
    print(f"Downloaded {count} samples to {DEST}")


if __name__ == "__main__":
    main()
