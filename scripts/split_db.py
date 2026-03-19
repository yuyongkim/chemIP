"""DB 분할 스크립트 (10GB 단위 기본)."""

import argparse
import hashlib
import json
from pathlib import Path

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    def tqdm(x, **_):  # type: ignore
        return x


CHUNK_DEFAULT_BYTES = 10 * 1024 * 1024 * 1024


def split_file(source: Path, dest_dir: Path, chunk_size_bytes: int) -> dict:
    dest_dir.mkdir(parents=True, exist_ok=True)
    parts = []

    total = source.stat().st_size
    part_count = max(1, (total + chunk_size_bytes - 1) // chunk_size_bytes)

    buffer_size = 1024 * 1024
    with source.open("rb") as src:
        for idx in range(int(part_count)):
            part_name = f"{source.name}.part{idx + 1:03d}"
            target = dest_dir / part_name
            remaining = chunk_size_bytes
            hash_obj = hashlib.sha256()

            with target.open("wb") as dst:
                with tqdm(total=min(chunk_size_bytes, total - idx * chunk_size_bytes), unit="B", unit_scale=True, desc=part_name) as bar:
                    while remaining > 0:
                        chunk = src.read(min(buffer_size, remaining))
                        if not chunk:
                            break
                        dst.write(chunk)
                        hash_obj.update(chunk)
                        remaining -= len(chunk)
                        bar.update(len(chunk))

            parts.append({
                "filename": part_name,
                "sha256": hash_obj.hexdigest(),
                "size": target.stat().st_size,
            })

    manifest = {
        "source": str(source),
        "size": total,
        "chunk_size_bytes": chunk_size_bytes,
        "parts": parts,
    }
    manifest_path = dest_dir / f"{source.name}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    return manifest


def parse_args():
    parser = argparse.ArgumentParser(description="Split large DB file into chunks")
    parser.add_argument("--source", required=True, help="원본 DB 파일 경로")
    parser.add_argument("--dest-dir", required=True, help="분할 파일 저장 경로")
    parser.add_argument("--size-gb", type=int, default=10, help="분할 크기(GB), 기본 10")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = Path(args.source).resolve()
    dest_dir = Path(args.dest_dir).resolve()

    if not source.exists():
        print(f"[ERROR] 원본 파일이 존재하지 않습니다: {source}")
        return 1

    manifest = split_file(source, dest_dir, args.size_gb * 1024 * 1024 * 1024)
    print("분할 완료")
    print(f"출력 폴더: {dest_dir}")
    print(f"part 개수: {len(manifest['parts'])}")
    print(f"manifest: {dest_dir / (Path(source).name + '.manifest.json')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
