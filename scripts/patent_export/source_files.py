"""Enumerate the source record files to scan (KIPRIS and derived folders are never listed)."""
import config


def list_source_files():
    """[(folder, path, size)] for every Lens-format file in config.SOURCE_FOLDERS, largest first."""
    files = []
    for folder in config.SOURCE_FOLDERS:
        assert folder not in config.EXCLUDED_FOLDERS, folder
        for p in sorted((config.SOURCE_ROOT / folder).glob(config.SOURCE_GLOB)):
            files.append((folder, p, p.stat().st_size))
    files.sort(key=lambda x: -x[2])
    return files


def match_paths(folder, path):
    """(matches.jsonl.gz, stats.json) output paths for one source file."""
    stem = path.name.replace(".jsonl.gz", "")
    d = config.MATCH_DIR / folder
    return d / f"{stem}.matches.jsonl.gz", d / f"{stem}.stats.json"
