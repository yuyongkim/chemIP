"""DB 병합 스크립트."""

import argparse
import hashlib
import json
from pathlib import Path

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    def tqdm(x, **_):  # type: ignore
        return x


def read_manifest(manifest_path: Path) -> list[dict]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return data["parts"], data["source"]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def merge_files(parts: list[dict], source_prefix: str, output_path: Path) -> None:
    with output_path.open("wb") as out:
        for part in parts:
            chunk_path = part["path"]
            with open(chunk_path, "rb") as f:
                with tqdm(unit="B", unit_scale=True, desc=Path(chunk_path).name, total=part["size"]) as bar:
                    while True:
                        b = f.read(1024 * 1024)
                        if not b:
                            break
                        out.write(b)
                        bar.update(len(b))


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge split DB chunks")
    parser.add_argument("--manifest", required=True, help=".manifest.json 경로")
    parser.add_argument("--output", required=True, help="병합 결과 파일 경로")
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    output_path = Path(args.output).resolve()
    if not manifest_path.exists():
        print(f"[ERROR] manifest 파일이 없습니다: {manifest_path}")
        return 1

    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    base_dir = manifest_path.parent
    parts = []
    for item in raw["parts"]:
        part_path = base_dir / item["filename"]
        if not part_path.exists():
            print(f"[ERROR] 분할 파일이 없습니다: {part_path}")
            return 2
        if item.get("sha256"):
            if sha256_file(part_path) != item["sha256"]:
                print(f"[ERROR] 체크섬 불일치: {part_path}")
                return 3
        parts.append({
            "path": str(part_path),
            "size": part_path.stat().st_size,
        })

    merge_files(parts, raw.get("source", ""), output_path)
    print(f"병합 완료: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
