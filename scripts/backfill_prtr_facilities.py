"""Backfill PRTR substance-by-company rows from the live portal.

The documented PRTR OpenAPI paths currently return 404 after the MCEE host
migration. The web portal still exposes the same data through Excel download
endpoints. This script uses those endpoints politely and stores normalized rows
in a resumable SQLite cache.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PRTR_BASE_URL = "https://icis.mcee.go.kr"
PRTR_DATA_DIR = PROJECT_ROOT / "data" / "prtr"
DEFAULT_DB_PATH = PRTR_DATA_DIR / "prtr_facilities.sqlite"
PROTECTED_DB_NAMES = {"terminology.db", "global_patent_index.db", "uspto_index.db"}


def compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_cas(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    return digits.lstrip("0") if len(digits) >= 3 else ""


def validate_output_db_path(db_path: Path) -> Path:
    resolved = db_path.expanduser().resolve(strict=False)
    data_dir = PRTR_DATA_DIR.resolve(strict=False)
    if resolved.name.lower() in PROTECTED_DB_NAMES:
        raise SystemExit(f"Refusing to write PRTR cache to protected DB: {resolved}")
    if not resolved.is_relative_to(data_dir):
        raise SystemExit(f"Refusing to write PRTR cache outside {data_dir}: {resolved}")
    if "prtr" not in resolved.stem.lower():
        raise SystemExit(f"Refusing ambiguous PRTR cache filename: {resolved}")
    return resolved


def to_number(value: Any) -> float:
    text = compact(value).replace(",", "")
    if not text:
        return 0.0
    try:
        return float(text)
    except (TypeError, ValueError):
        return 0.0


def key_by_contains(headers: list[str], *needles: str) -> str:
    for header in headers:
        normalized = compact(header)
        if all(needle in normalized for needle in needles):
            return header
    return ""


def key_exact(headers: list[str], label: str) -> str:
    for header in headers:
        if compact(header) == label:
            return header
    return ""


def read_xls_rows(path: Path) -> tuple[list[str], list[dict[str, Any]]]:
    import xlrd

    book = xlrd.open_workbook(str(path))
    sheet = book.sheet_by_index(0)
    headers = [compact(sheet.cell_value(0, col)) for col in range(sheet.ncols)]
    rows: list[dict[str, Any]] = []
    for row_idx in range(1, sheet.nrows):
        row = {headers[col]: sheet.cell_value(row_idx, col) for col in range(sheet.ncols)}
        if any(compact(value) for value in row.values()):
            rows.append(row)
    return headers, rows


def find_download_file(kind: str, year: int) -> Path | None:
    roots = [Path.home() / "Downloads", PROJECT_ROOT / "data" / "prtr"]
    patterns = [f"*{year}*{kind}*.xls", f"*{year}*{kind}*.xlsx"]
    for root in roots:
        if not root.exists():
            continue
        for pattern in patterns:
            matches = sorted(root.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
            if matches:
                return matches[0]
    return None


@dataclass(frozen=True)
class Material:
    material_id: str
    cas_no: str
    name_ko: str
    name_en: str

    @property
    def label(self) -> str:
        return f"{self.name_ko} ({self.cas_no}, {self.name_en})"


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS materials (
            year INTEGER NOT NULL,
            material_id TEXT NOT NULL,
            cas_no TEXT NOT NULL,
            cas_key TEXT NOT NULL,
            name_ko TEXT NOT NULL,
            name_en TEXT NOT NULL DEFAULT '',
            company_count INTEGER NOT NULL DEFAULT 0,
            air_release_kg REAL NOT NULL DEFAULT 0,
            water_release_kg REAL NOT NULL DEFAULT 0,
            soil_release_kg REAL NOT NULL DEFAULT 0,
            total_release_kg REAL NOT NULL DEFAULT 0,
            self_landfill_kg REAL NOT NULL DEFAULT 0,
            wastewater_transfer_kg REAL NOT NULL DEFAULT 0,
            waste_transfer_kg REAL NOT NULL DEFAULT 0,
            total_transfer_kg REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (year, material_id)
        );

        CREATE INDEX IF NOT EXISTS idx_prtr_materials_cas ON materials(year, cas_key);
        CREATE INDEX IF NOT EXISTS idx_prtr_materials_name ON materials(year, name_ko, name_en);

        CREATE TABLE IF NOT EXISTS companies (
            year INTEGER NOT NULL,
            company_name TEXT NOT NULL,
            address TEXT NOT NULL DEFAULT '',
            total_release_kg REAL NOT NULL DEFAULT 0,
            self_landfill_kg REAL NOT NULL DEFAULT 0,
            total_transfer_kg REAL NOT NULL DEFAULT 0,
            PRIMARY KEY (year, company_name)
        );

        CREATE TABLE IF NOT EXISTS facility_releases (
            year INTEGER NOT NULL,
            material_id TEXT NOT NULL,
            row_index INTEGER NOT NULL,
            cas_no TEXT NOT NULL,
            cas_key TEXT NOT NULL,
            chemical_name TEXT NOT NULL,
            company_name TEXT NOT NULL,
            address TEXT NOT NULL DEFAULT '',
            air_release_kg REAL NOT NULL DEFAULT 0,
            water_release_kg REAL NOT NULL DEFAULT 0,
            soil_release_kg REAL NOT NULL DEFAULT 0,
            total_release_kg REAL NOT NULL DEFAULT 0,
            self_landfill_kg REAL NOT NULL DEFAULT 0,
            wastewater_transfer_kg REAL NOT NULL DEFAULT 0,
            waste_transfer_kg REAL NOT NULL DEFAULT 0,
            total_transfer_kg REAL NOT NULL DEFAULT 0,
            fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (year, material_id, row_index)
        );

        CREATE INDEX IF NOT EXISTS idx_prtr_facility_cas ON facility_releases(year, cas_key);
        CREATE INDEX IF NOT EXISTS idx_prtr_facility_company ON facility_releases(year, company_name);

        CREATE TABLE IF NOT EXISTS facility_fetches (
            year INTEGER NOT NULL,
            material_id TEXT NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (year, material_id)
        );

        INSERT OR IGNORE INTO facility_fetches (year, material_id, row_count)
        SELECT year, material_id, COUNT(*)
        FROM facility_releases
        GROUP BY year, material_id;
        """
    )
    conn.commit()


def seed_company_totals(conn: sqlite3.Connection, *, year: int, path: Path) -> int:
    headers, rows = read_xls_rows(path)
    company_col = key_by_contains(headers, "업체")
    address_col = key_by_contains(headers, "주소")
    release_col = key_exact(headers, "배출량(kg/년)") or key_by_contains(headers, "배출량")
    landfill_col = key_exact(headers, "자가매립량(kg/년)") or key_by_contains(headers, "자가매립")
    transfer_col = key_exact(headers, "이동량(kg/년)") or key_by_contains(headers, "이동량")
    count = 0
    for row in rows:
        company_name = compact(row.get(company_col))
        if not company_name:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO companies
            (year, company_name, address, total_release_kg, self_landfill_kg, total_transfer_kg)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                year,
                company_name,
                compact(row.get(address_col)),
                to_number(row.get(release_col)),
                to_number(row.get(landfill_col)),
                to_number(row.get(transfer_col)),
            ),
        )
        count += 1
    conn.commit()
    return count


def seed_material_summaries(conn: sqlite3.Connection, *, year: int, path: Path, materials: dict[str, Material]) -> int:
    headers, rows = read_xls_rows(path)
    cas_col = key_by_contains(headers, "CAS")
    name_col = key_by_contains(headers, "화학물질")
    company_count_col = key_by_contains(headers, "업체")
    air_col = key_by_contains(headers, "대기")
    water_col = key_by_contains(headers, "수계")
    soil_col = key_by_contains(headers, "토양")
    release_col = key_exact(headers, "배출량(kg/년)") or key_by_contains(headers, "배출량")
    landfill_col = key_exact(headers, "자가매립량(kg/년)") or key_by_contains(headers, "자가매립")
    wastewater_col = key_exact(headers, "폐수이동량(kg/년)") or key_by_contains(headers, "폐수")
    waste_col = key_exact(headers, "폐기물이동량(kg/년)") or key_by_contains(headers, "폐기물")
    transfer_col = key_exact(headers, "이동량(kg/년)") or key_by_contains(headers, "이동량")

    count = 0
    for row in rows:
        cas_no = compact(row.get(cas_col))
        cas_key = normalize_cas(cas_no)
        material = materials.get(cas_key)
        if not material:
            material = Material(material_id=cas_key or cas_no, cas_no=cas_no, name_ko=compact(row.get(name_col)), name_en="")
        conn.execute(
            """
            INSERT OR REPLACE INTO materials
            (year, material_id, cas_no, cas_key, name_ko, name_en, company_count,
             air_release_kg, water_release_kg, soil_release_kg, total_release_kg,
             self_landfill_kg, wastewater_transfer_kg, waste_transfer_kg, total_transfer_kg)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                year,
                material.material_id,
                cas_no,
                cas_key,
                compact(row.get(name_col)) or material.name_ko,
                material.name_en,
                int(to_number(row.get(company_count_col))),
                to_number(row.get(air_col)),
                to_number(row.get(water_col)),
                to_number(row.get(soil_col)),
                to_number(row.get(release_col)),
                to_number(row.get(landfill_col)),
                to_number(row.get(wastewater_col)),
                to_number(row.get(waste_col)),
                to_number(row.get(transfer_col)),
            ),
        )
        count += 1
    conn.commit()
    return count


def fetch_materials(session: requests.Session, *, year: int) -> dict[str, Material]:
    response = session.post(
        f"{PRTR_BASE_URL}/prtr/selectMttrListPopup.do",
        data={"searchYear": str(year), "reportYear": str(year), "pageIndex": 1},
        timeout=30,
    )
    response.raise_for_status()
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", response.text, flags=re.IGNORECASE | re.DOTALL)
    materials: dict[str, Material] = {}
    for row_html in rows:
        value_match = re.search(r'name=["\']chk["\'][^>]*value=["\']?([^"\'>\s]+)', row_html, flags=re.IGNORECASE)
        cells = [
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cell)).strip()
            for cell in re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.IGNORECASE | re.DOTALL)
        ]
        cells = [cell for cell in cells if cell]
        if not value_match or len(cells) < 3:
            continue
        cas_no, name_ko, name_en = cells[:3]
        cas_key = normalize_cas(cas_no)
        materials[cas_key] = Material(value_match.group(1), cas_no, name_ko, name_en)
    return materials


def parse_facility_excel(content: bytes, material: Material, *, year: int, company_addresses: dict[str, str]) -> list[tuple[Any, ...]]:
    import xlrd

    book = xlrd.open_workbook(file_contents=content)
    sheet = book.sheet_by_index(0)
    if sheet.nrows < 2:
        return []
    headers = [compact(sheet.cell_value(0, col)) for col in range(sheet.ncols)]
    company_col = key_by_contains(headers, "업체")
    air_col = key_by_contains(headers, "대기")
    water_col = key_by_contains(headers, "수계")
    soil_col = key_by_contains(headers, "토양")
    release_col = key_exact(headers, "배출량(kg/년)") or key_by_contains(headers, "배출량")
    landfill_col = key_exact(headers, "자가매립량(kg/년)") or key_by_contains(headers, "자가매립")
    wastewater_col = key_exact(headers, "폐수이동량(kg/년)") or key_by_contains(headers, "폐수")
    waste_col = key_exact(headers, "폐기물이동량(kg/년)") or key_by_contains(headers, "폐기물")
    transfer_col = key_exact(headers, "이동량(kg/년)") or key_by_contains(headers, "이동량")

    rows = []
    for row_idx in range(1, sheet.nrows):
        row = {headers[col]: sheet.cell_value(row_idx, col) for col in range(sheet.ncols)}
        company_name = compact(row.get(company_col))
        if not company_name:
            continue
        rows.append(
            (
                year,
                material.material_id,
                row_idx,
                material.cas_no,
                normalize_cas(material.cas_no),
                material.name_ko,
                company_name,
                company_addresses.get(company_name, ""),
                to_number(row.get(air_col)),
                to_number(row.get(water_col)),
                to_number(row.get(soil_col)),
                to_number(row.get(release_col)),
                to_number(row.get(landfill_col)),
                to_number(row.get(wastewater_col)),
                to_number(row.get(waste_col)),
                to_number(row.get(transfer_col)),
            )
        )
    return rows


def already_done(conn: sqlite3.Connection, *, year: int, material_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM facility_fetches WHERE year = ? AND material_id = ? LIMIT 1",
        (year, material_id),
    ).fetchone()
    return row is not None


def company_addresses(conn: sqlite3.Connection, *, year: int) -> dict[str, str]:
    rows = conn.execute("SELECT company_name, address FROM companies WHERE year = ?", (year,)).fetchall()
    return {row[0]: row[1] for row in rows}


def backfill(args: argparse.Namespace) -> None:
    args.db = validate_output_db_path(args.db)
    args.db.parent.mkdir(parents=True, exist_ok=True)
    if args.reset and args.db.exists():
        args.db.unlink()
    conn = sqlite3.connect(args.db)
    ensure_schema(conn)

    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 ChemIP PRTR backfill"})
    session.get(f"{PRTR_BASE_URL}/prtr/prtrInfo/unitySearch.do", timeout=20)

    print(f"Fetching PRTR material ids for {args.year}...")
    materials = fetch_materials(session, year=args.year)
    print(f"  material ids: {len(materials)}")

    material_xls = args.material_xls or find_download_file("물질", args.year)
    company_xls = args.company_xls or find_download_file("업체", args.year)
    if material_xls:
        count = seed_material_summaries(conn, year=args.year, path=material_xls, materials=materials)
        print(f"  seeded material summaries: {count} from {material_xls}")
    if company_xls:
        count = seed_company_totals(conn, year=args.year, path=company_xls)
        print(f"  seeded company totals: {count} from {company_xls}")

    addresses = company_addresses(conn, year=args.year)
    ordered = sorted(materials.values(), key=lambda item: int(item.material_id) if item.material_id.isdigit() else 10**9)
    if args.limit:
        ordered = ordered[: args.limit]

    done = 0
    skipped = 0
    failed = 0
    for index, material in enumerate(ordered, start=1):
        if not args.force and already_done(conn, year=args.year, material_id=material.material_id):
            skipped += 1
            continue
        payload = {
            "searchYear": str(args.year),
            "searchMttr": "mttr",
            "searchMttrNm": material.label,
            "mttr": material.material_id,
            "baechoolColumn": "Y",
            "airColumn": "Y",
            "waterColumn": "Y",
            "soilColumn": "Y",
            "idongColumn": "Y",
            "pyesooColumn": "Y",
            "pyegiColumn": "Y",
            "jagaColumn": "Y",
        }
        try:
            response = session.post(
                f"{PRTR_BASE_URL}/prtr/prtrInfo/unitySearchDown.do",
                data=payload,
                timeout=60,
            )
            response.raise_for_status()
            rows = parse_facility_excel(response.content, material, year=args.year, company_addresses=addresses)
            conn.execute("DELETE FROM facility_releases WHERE year = ? AND material_id = ?", (args.year, material.material_id))
            conn.executemany(
                """
                INSERT OR REPLACE INTO facility_releases
                (year, material_id, row_index, cas_no, cas_key, chemical_name, company_name, address,
                 air_release_kg, water_release_kg, soil_release_kg, total_release_kg,
                 self_landfill_kg, wastewater_transfer_kg, waste_transfer_kg, total_transfer_kg)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
            conn.execute(
                """
                INSERT OR REPLACE INTO facility_fetches (year, material_id, row_count, fetched_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """,
                (args.year, material.material_id, len(rows)),
            )
            conn.commit()
            done += 1
            print(f"[{index}/{len(ordered)}] {material.cas_no} {material.name_ko}: {len(rows)} companies")
            time.sleep(args.sleep)
        except Exception as exc:
            failed += 1
            print(f"[{index}/{len(ordered)}] FAILED {material.cas_no} {material.name_ko}: {exc}", file=sys.stderr)
            time.sleep(max(args.sleep, 1.0))

    total_rows = conn.execute("SELECT COUNT(*) FROM facility_releases WHERE year = ?", (args.year,)).fetchone()[0]
    total_materials = conn.execute(
        "SELECT COUNT(DISTINCT material_id) FROM facility_releases WHERE year = ?",
        (args.year,),
    ).fetchone()[0]
    print(f"Done. downloaded={done} skipped={skipped} failed={failed} cached_materials={total_materials} cached_rows={total_rows}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, default=2024)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--material-xls", type=Path, default=None)
    parser.add_argument("--company-xls", type=Path, default=None)
    parser.add_argument("--limit", type=int, default=0, help="Limit materials for smoke testing")
    parser.add_argument("--sleep", type=float, default=0.25, help="Delay between portal downloads")
    parser.add_argument("--force", action="store_true", help="Re-download rows already present in the cache")
    parser.add_argument("--reset", action="store_true", help="Delete and rebuild the SQLite cache before backfilling")
    return parser.parse_args()


if __name__ == "__main__":
    backfill(parse_args())
