"""Handling-site and facility signals for chemical detail pages.

The official PRTR OpenAPI currently redirects to the new MCEE host and returns
404 for the documented paths, so this adapter combines the live sources that do
work with any locally cached PRTR summary exports.
"""

from __future__ import annotations

import logging
import math
import re
import sqlite3
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import requests

from backend.api.http_client import safe_get
from backend.config.settings import PROJECT_ROOT, settings

logger = logging.getLogger(__name__)

PRTR_BASE_URL = "https://icis.mcee.go.kr"
GYEONGGI_RISK_MANAGE_URL = "https://openapi.gg.go.kr/RiskManageTargetBizplc"
CHEMICAL_ACCIDENT_URL = "http://apis.data.go.kr/1480802/iciscsc/csclist"


def _compact(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def _normalize_cas(value: str) -> str:
    digits = _digits(value)
    if len(digits) < 3:
        return ""
    return digits.lstrip("0")


def _normalize_term(value: str) -> str:
    return re.sub(r"[\s\-_(),./+]+", "", (value or "").casefold())


def _to_number(value: Any) -> float:
    text = _compact(value).replace(",", "")
    if not text:
        return 0.0
    try:
        number = float(text)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(number):
        return 0.0
    return number


def _reported_total_kg(row: dict[str, Any]) -> float:
    return _to_number(row.get("total_release_kg")) + _to_number(row.get("total_transfer_kg")) + _to_number(row.get("self_landfill_kg"))


def _pick(raw: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = raw.get(key)
        if value not in (None, ""):
            return _compact(value)
    return ""


def _tokenize_materials(value: str) -> list[str]:
    parts = re.split(r"[,;/|+\n\r]+", value or "")
    return [_compact(part) for part in parts if _compact(part)]


class HandlingSiteAdapter:
    def __init__(self) -> None:
        self.gyeonggi_key = settings.HAZMAT_FACILITY_API_KEY
        self.data_dir = Path(PROJECT_ROOT) / "data" / "prtr"
        self.prtr_db_path = self.data_dir / "prtr_facilities.sqlite"

    def build_profile(
        self,
        *,
        cas_no: str = "",
        name: str = "",
        name_en: str = "",
        aliases: list[str] | None = None,
        year: int = 2024,
        accident_years: int = 5,
        facility_limit: int = 10,
    ) -> dict[str, Any]:
        terms = self._build_terms(name=name, name_en=name_en, aliases=aliases or [])
        return {
            "query": {
                "cas_no": cas_no,
                "name": name,
                "name_en": name_en,
                "terms": terms,
                "year": year,
                "facility_limit": facility_limit,
            },
            "sources": {
                "prtr_summary": self.get_prtr_summary(cas_no=cas_no, terms=terms, year=year),
                "prtr_facilities": self.get_prtr_facilities(cas_no=cas_no, terms=terms, year=year, limit=facility_limit),
                "prtr_aggregates": self.get_prtr_aggregates(cas_no=cas_no, terms=terms, year=year),
                "gyeonggi_facilities": self.get_gyeonggi_facilities(terms=terms),
                "chemical_accidents": self.get_chemical_accidents(terms=terms, years=accident_years),
            },
        }

    @staticmethod
    def _build_terms(*, name: str, name_en: str, aliases: list[str]) -> list[str]:
        candidates: list[str] = []
        for raw in [name, name_en, *aliases]:
            text = _compact(raw)
            if not text:
                continue
            candidates.append(text)
            for part in re.split(r"[()/,;]", text):
                part = _compact(part)
                if len(part) >= 2:
                    candidates.append(part)

        seen: set[str] = set()
        terms: list[str] = []
        for term in candidates:
            key = _normalize_term(term)
            if not key or key in seen:
                continue
            seen.add(key)
            terms.append(term)
        return terms[:24]

    @staticmethod
    def _matches_text(value: str, terms: list[str]) -> bool:
        normalized = _normalize_term(value)
        if not normalized:
            return False
        for term in terms:
            needle = _normalize_term(term)
            if len(needle) >= 2 and needle in normalized:
                return True
        return False

    def get_prtr_summary(self, *, cas_no: str, terms: list[str], year: int) -> dict[str, Any]:
        cached = self._get_prtr_summary_from_cache(cas_no=cas_no, terms=terms, year=year)
        if cached:
            return cached

        path = self.data_dir / f"prtr_summary_{year}.xlsx"
        payload = {
            "available": path.exists(),
            "source": "PRTR local cache",
            "year": year,
            "data": None,
            "message": "",
        }
        if not path.exists():
            payload["message"] = f"Local PRTR summary file not found: {path}"
            return payload

        try:
            import pandas as pd

            df = pd.read_excel(path)
            cas_key = _normalize_cas(cas_no)
            rows = []
            for _, row in df.iterrows():
                row_cas = _compact(row.get("CAS No.", ""))
                row_name = _compact(row.get("화학물질명", ""))
                if cas_key and _normalize_cas(row_cas) == cas_key:
                    rows.append(row)
                    continue
                if row_name and self._matches_text(row_name, terms):
                    rows.append(row)

            if not rows:
                payload["available"] = True
                payload["message"] = "No PRTR summary match in local cache"
                return payload

            row = rows[0]
            payload["data"] = {
                "cas_no": _compact(row.get("CAS No.", "")),
                "chemical_name": _compact(row.get("화학물질명", "")),
                "company_count": int(_to_number(row.get("배출업체수", 0))),
                "air_release_kg": _to_number(row.get("대기배출량(kg/년)", 0)),
                "water_release_kg": _to_number(row.get("수계배출량(kg/년)", 0)),
                "soil_release_kg": _to_number(row.get("토양배출량(kg/년)", 0)),
                "total_release_kg": _to_number(row.get("배출량(kg/년)", 0)),
                "wastewater_transfer_kg": _to_number(row.get("폐수이동량(kg/년)", 0)),
                "waste_transfer_kg": _to_number(row.get("폐기물이동량(kg/년)", 0)),
                "total_transfer_kg": _to_number(row.get("이동량(kg/년)", 0)),
            }
            return payload
        except Exception as exc:
            logger.exception("Failed to read PRTR summary cache")
            payload["available"] = False
            payload["message"] = f"Failed to read PRTR cache: {exc}"
            return payload

    def get_prtr_facilities(self, *, cas_no: str, terms: list[str], year: int, limit: int = 10) -> dict[str, Any]:
        """Fetch substance-filtered PRTR company rows via the live portal.

        The public OpenAPI path is broken after the host migration, but the
        portal's own Excel endpoint still supports the material-popup id
        (`mttr`) and returns one row per matching company.
        """
        cached = self._get_prtr_facilities_from_cache(cas_no=cas_no, terms=terms, year=year, limit=limit)
        if cached:
            return cached

        try:
            session = requests.Session()
            session.headers.update({"User-Agent": "Mozilla/5.0 ChemIP PRTR probe"})
            session.get(f"{PRTR_BASE_URL}/prtr/prtrInfo/unitySearch.do", timeout=15)

            material = self._find_prtr_material(session=session, cas_no=cas_no, terms=terms, year=year)
            if not material:
                return {
                    "available": True,
                    "source": "PRTR portal unitySearchDown",
                    "year": year,
                    "total": 0,
                    "data": [],
                    "message": "No PRTR material id found for this CAS/name",
                }

            payload = {
                "searchYear": str(year),
                "searchMttr": "mttr",
                "searchMttrNm": material["label"],
                "mttr": material["id"],
                "baechoolColumn": "Y",
                "airColumn": "Y",
                "waterColumn": "Y",
                "soilColumn": "Y",
                "idongColumn": "Y",
                "pyesooColumn": "Y",
                "pyegiColumn": "Y",
                "jagaColumn": "Y",
            }
            response = session.post(
                f"{PRTR_BASE_URL}/prtr/prtrInfo/unitySearchDown.do",
                data=payload,
                timeout=60,
            )
            response.raise_for_status()
            rows = self._parse_prtr_facility_excel(response.content)
            rows = sorted(rows, key=lambda row: (-_reported_total_kg(row), row.get("company_name", "")))
            return {
                "available": True,
                "source": "PRTR portal unitySearchDown",
                "year": year,
                "material": material,
                "total": len(rows),
                "ranking_basis": "total_release_kg + total_transfer_kg + self_landfill_kg",
                "limit": limit,
                "data": rows[:limit],
            }
        except Exception as exc:
            logger.exception("PRTR facility lookup failed")
            return {
                "available": False,
                "source": "PRTR portal unitySearchDown",
                "year": year,
                "total": 0,
                "data": [],
                "message": str(exc),
            }

    def _get_prtr_summary_from_cache(self, *, cas_no: str, terms: list[str], year: int) -> dict[str, Any] | None:
        if not self.prtr_db_path.exists():
            return None
        cas_key = _normalize_cas(cas_no)
        try:
            with sqlite3.connect(self.prtr_db_path) as conn:
                conn.row_factory = sqlite3.Row
                row = None
                if cas_key:
                    row = conn.execute(
                        "SELECT * FROM materials WHERE year = ? AND cas_key = ? LIMIT 1",
                        (year, cas_key),
                    ).fetchone()
                if row is None:
                    for term in terms:
                        needle = f"%{term}%"
                        row = conn.execute(
                            "SELECT * FROM materials WHERE year = ? AND (name_ko LIKE ? OR name_en LIKE ?) LIMIT 1",
                            (year, needle, needle),
                        ).fetchone()
                        if row is not None:
                            break
                if row is None:
                    return None
                return {
                    "available": True,
                    "source": "PRTR SQLite cache",
                    "year": year,
                    "data": {
                        "cas_no": row["cas_no"],
                        "chemical_name": row["name_ko"],
                        "company_count": int(row["company_count"] or 0),
                        "air_release_kg": float(row["air_release_kg"] or 0),
                        "water_release_kg": float(row["water_release_kg"] or 0),
                        "soil_release_kg": float(row["soil_release_kg"] or 0),
                        "total_release_kg": float(row["total_release_kg"] or 0),
                        "self_landfill_kg": float(row["self_landfill_kg"] or 0),
                        "wastewater_transfer_kg": float(row["wastewater_transfer_kg"] or 0),
                        "waste_transfer_kg": float(row["waste_transfer_kg"] or 0),
                        "total_transfer_kg": float(row["total_transfer_kg"] or 0),
                    },
                    "message": "",
                }
        except Exception:
            logger.exception("Failed to read PRTR summary cache")
            return None

    def _get_prtr_facilities_from_cache(self, *, cas_no: str, terms: list[str], year: int, limit: int = 10) -> dict[str, Any] | None:
        if not self.prtr_db_path.exists():
            return None
        cas_key = _normalize_cas(cas_no)
        try:
            with sqlite3.connect(self.prtr_db_path) as conn:
                conn.row_factory = sqlite3.Row
                material = None
                if cas_key:
                    material = conn.execute(
                        "SELECT * FROM materials WHERE year = ? AND cas_key = ? LIMIT 1",
                        (year, cas_key),
                    ).fetchone()
                if material is None:
                    for term in terms:
                        needle = f"%{term}%"
                        material = conn.execute(
                            "SELECT * FROM materials WHERE year = ? AND (name_ko LIKE ? OR name_en LIKE ?) LIMIT 1",
                            (year, needle, needle),
                        ).fetchone()
                        if material is not None:
                            break
                if material is None:
                    return None
                total_count = conn.execute(
                    "SELECT COUNT(*) FROM facility_releases WHERE year = ? AND material_id = ?",
                    (year, material["material_id"]),
                ).fetchone()[0]
                rows = conn.execute(
                    """
                    SELECT *,
                           (total_release_kg + total_transfer_kg + self_landfill_kg) AS reported_total_kg
                    FROM facility_releases
                    WHERE year = ? AND material_id = ?
                    ORDER BY reported_total_kg DESC, total_release_kg DESC, total_transfer_kg DESC, company_name
                    LIMIT ?
                    """,
                    (year, material["material_id"], max(1, min(limit, 100))),
                ).fetchall()
                if not rows:
                    return None
                data = [
                    {
                        "company_name": row["company_name"],
                        "address": row["address"],
                        "air_release_kg": float(row["air_release_kg"] or 0),
                        "water_release_kg": float(row["water_release_kg"] or 0),
                        "soil_release_kg": float(row["soil_release_kg"] or 0),
                        "total_release_kg": float(row["total_release_kg"] or 0),
                        "self_landfill_kg": float(row["self_landfill_kg"] or 0),
                        "wastewater_transfer_kg": float(row["wastewater_transfer_kg"] or 0),
                        "waste_transfer_kg": float(row["waste_transfer_kg"] or 0),
                        "total_transfer_kg": float(row["total_transfer_kg"] or 0),
                        "reported_total_kg": float(row["reported_total_kg"] or 0),
                    }
                    for row in rows
                ]
                return {
                    "available": True,
                    "source": "PRTR SQLite cache",
                    "year": year,
                    "material": {
                        "id": material["material_id"],
                        "cas_no": material["cas_no"],
                        "name_ko": material["name_ko"],
                        "name_en": material["name_en"],
                        "label": f"{material['name_ko']} ({material['cas_no']}, {material['name_en']})",
                    },
                    "total": total_count,
                    "ranking_basis": "total_release_kg + total_transfer_kg + self_landfill_kg",
                    "limit": limit,
                    "data": data,
                }
        except Exception:
            logger.exception("Failed to read PRTR facility cache")
            return None

    def get_prtr_aggregates(self, *, cas_no: str, terms: list[str], year: int) -> dict[str, Any]:
        if not self.prtr_db_path.exists():
            return {
                "available": False,
                "source": "PRTR aggregate workbook",
                "year": year,
                "data": None,
                "message": "PRTR aggregate cache is not loaded",
            }
        cas_key = _normalize_cas(cas_no)
        try:
            with sqlite3.connect(self.prtr_db_path) as conn:
                conn.row_factory = sqlite3.Row
                material = self._find_aggregate_material(conn, cas_key=cas_key, terms=terms, year=year)
                if material is None:
                    return {
                        "available": True,
                        "source": "PRTR aggregate workbook",
                        "year": year,
                        "data": None,
                        "message": "No aggregate workbook row found for this CAS/name",
                    }
                resolved_cas_key = material["cas_key"]
                return {
                    "available": True,
                    "source": "PRTR aggregate workbook",
                    "year": year,
                    "ranking_basis": "reported_total_kg = release_total_kg + transfer_total_kg + self_landfill_kg",
                    "material": {
                        "cas_no": material["cas_no"],
                        "name": material["chemical_name"],
                    },
                    "data": {
                        "material_totals": self._aggregate_row(material),
                        "top_regions": self._aggregate_breakdown_rows(conn, year=year, cas_key=resolved_cas_key, dimension_type="region"),
                        "top_industrial_complexes": self._aggregate_breakdown_rows(conn, year=year, cas_key=resolved_cas_key, dimension_type="industrial_complex"),
                        "top_industries": self._aggregate_breakdown_rows(conn, year=year, cas_key=resolved_cas_key, dimension_type="industry"),
                        "carcinogenic_classes": self._aggregate_carcinogenic_rows(conn, year=year, cas_key=resolved_cas_key),
                    },
                }
        except Exception as exc:
            logger.exception("Failed to read PRTR aggregate cache")
            return {
                "available": False,
                "source": "PRTR aggregate workbook",
                "year": year,
                "data": None,
                "message": str(exc),
            }

    def _find_aggregate_material(
        self,
        conn: sqlite3.Connection,
        *,
        cas_key: str,
        terms: list[str],
        year: int,
    ) -> sqlite3.Row | None:
        if cas_key:
            row = conn.execute(
                "SELECT * FROM prtr_aggregate_materials WHERE year = ? AND cas_key = ? LIMIT 1",
                (year, cas_key),
            ).fetchone()
            if row is not None:
                return row
        for term in terms:
            needle = f"%{term}%"
            row = conn.execute(
                "SELECT * FROM prtr_aggregate_materials WHERE year = ? AND chemical_name LIKE ? LIMIT 1",
                (year, needle),
            ).fetchone()
            if row is not None:
                return row
        return None

    @staticmethod
    def _aggregate_row(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "cas_no": row["cas_no"],
            "chemical_name": row["chemical_name"],
            "release_total_kg": float(row["release_total_kg"] or 0),
            "air_release_kg": float(row["air_release_kg"] or 0),
            "water_release_kg": float(row["water_release_kg"] or 0),
            "soil_release_kg": float(row["soil_release_kg"] or 0),
            "self_landfill_kg": float(row["self_landfill_kg"] or 0),
            "transfer_total_kg": float(row["transfer_total_kg"] or 0),
            "wastewater_transfer_kg": float(row["wastewater_transfer_kg"] or 0),
            "waste_transfer_kg": float(row["waste_transfer_kg"] or 0),
            "reported_total_kg": float(row["reported_total_kg"] or 0),
        }

    def _aggregate_breakdown_rows(
        self,
        conn: sqlite3.Connection,
        *,
        year: int,
        cas_key: str,
        dimension_type: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        rows = conn.execute(
            """
            SELECT * FROM prtr_aggregate_breakdowns
            WHERE year = ? AND cas_key = ? AND dimension_type = ?
            ORDER BY reported_total_kg DESC, release_total_kg DESC, transfer_total_kg DESC, dimension_name
            LIMIT ?
            """,
            (year, cas_key, dimension_type, limit),
        ).fetchall()
        return [self._aggregate_row_with_dimension(row) for row in rows]

    @staticmethod
    def _aggregate_row_with_dimension(row: sqlite3.Row) -> dict[str, Any]:
        data = HandlingSiteAdapter._aggregate_row(row)
        data["dimension_name"] = row["dimension_name"]
        data["dimension_type"] = row["dimension_type"]
        return data

    def _aggregate_carcinogenic_rows(
        self,
        conn: sqlite3.Connection,
        *,
        year: int,
        cas_key: str,
    ) -> list[dict[str, Any]]:
        rows = conn.execute(
            """
            SELECT * FROM prtr_carcinogenic_classes
            WHERE year = ? AND cas_key = ?
            ORDER BY reported_total_kg DESC, iarc_group
            """,
            (year, cas_key),
        ).fetchall()
        data = []
        for row in rows:
            item = self._aggregate_row(row)
            item["iarc_group"] = row["iarc_group"]
            data.append(item)
        return data

    def _find_prtr_material(self, *, session: requests.Session, cas_no: str, terms: list[str], year: int) -> dict[str, str] | None:
        response = session.post(
            f"{PRTR_BASE_URL}/prtr/selectMttrListPopup.do",
            data={"searchYear": str(year), "reportYear": str(year), "pageIndex": 1},
            timeout=30,
        )
        response.raise_for_status()
        html = response.text
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.IGNORECASE | re.DOTALL)
        cas_key = _normalize_cas(cas_no)
        candidates: list[dict[str, str]] = []
        for row_html in rows:
            value_match = re.search(r'name=["\']chk["\'][^>]*value=["\']?([^"\'>\s]+)', row_html, flags=re.IGNORECASE)
            cells = [
                re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cell)).strip()
                for cell in re.findall(r"<td[^>]*>(.*?)</td>", row_html, flags=re.IGNORECASE | re.DOTALL)
            ]
            cells = [cell for cell in cells if cell]
            if not value_match or len(cells) < 3:
                continue
            row_cas = cells[0]
            name_ko = cells[1]
            name_en = cells[2] if len(cells) > 2 else ""
            candidate = {
                "id": value_match.group(1),
                "cas_no": row_cas,
                "name_ko": name_ko,
                "name_en": name_en,
                "label": f"{name_ko} ({row_cas}, {name_en})",
            }
            candidates.append(candidate)
            if cas_key and _normalize_cas(row_cas) == cas_key:
                return candidate
        if cas_key:
            return None
        for candidate in candidates:
            if self._matches_text(f"{candidate['name_ko']} {candidate['name_en']}", terms):
                return candidate
        return None

    @staticmethod
    def _parse_prtr_facility_excel(content: bytes) -> list[dict[str, Any]]:
        import xlrd

        book = xlrd.open_workbook(file_contents=content)
        sheet = book.sheet_by_index(0)
        if sheet.nrows < 2:
            return []
        headers = [_compact(sheet.cell_value(0, col)) for col in range(sheet.ncols)]
        rows: list[dict[str, Any]] = []
        for row_idx in range(1, sheet.nrows):
            raw = {headers[col]: sheet.cell_value(row_idx, col) for col in range(sheet.ncols)}
            company_name = _compact(raw.get("업체명", ""))
            if not company_name:
                continue
            row = {
                "company_name": company_name,
                "air_release_kg": _to_number(raw.get("대기배출량(kg/년)", 0)),
                "water_release_kg": _to_number(raw.get("수계배출량(kg/년)", 0)),
                "soil_release_kg": _to_number(raw.get("토양배출량(kg/년)", 0)),
                "total_release_kg": _to_number(raw.get("배출량(kg/년)", 0)),
                "self_landfill_kg": _to_number(raw.get("자가매립량(kg/년)", 0)),
                "wastewater_transfer_kg": _to_number(raw.get("폐수이동량(kg/년)", 0)),
                "waste_transfer_kg": _to_number(raw.get("폐기물이동량(kg/년)", 0)),
                "total_transfer_kg": _to_number(raw.get("이동량(kg/년)", 0)),
            }
            row["reported_total_kg"] = _reported_total_kg(row)
            rows.append(row)
        return rows

    def get_gyeonggi_facilities(self, *, terms: list[str]) -> dict[str, Any]:
        params: dict[str, Any] = {"Type": "json", "pIndex": 1, "pSize": 1000}
        if self.gyeonggi_key:
            params["KEY"] = self.gyeonggi_key

        try:
            response = safe_get(GYEONGGI_RISK_MANAGE_URL, params=params, timeout=15, cache_ttl=3600)
            response.raise_for_status()
            document = response.json()
            blocks = document.get("RiskManageTargetBizplc", [])
            rows = next((block.get("row", []) for block in blocks if isinstance(block, dict) and "row" in block), [])
            matches = []
            for row in rows:
                materials = _pick(row, "TRTMNT_ACDNT_PROVS_MTTR_DTLS")
                if terms and not self._matches_text(materials, terms):
                    continue
                matches.append(
                    {
                        "company_name": _pick(row, "BIZPLC_NM"),
                        "materials": _tokenize_materials(materials),
                        "materials_text": materials,
                        "sido": "경기도",
                        "sigun": _pick(row, "SIGUN_NM"),
                        "road_address": _pick(row, "REFINE_ROADNM_ADDR"),
                        "lot_address": _pick(row, "REFINE_LOTNO_ADDR"),
                        "latitude": _pick(row, "REFINE_WGS84_LAT"),
                        "longitude": _pick(row, "REFINE_WGS84_LOGT"),
                        "evacuation_facility": _pick(row, "RESEVC_FACLT_NM"),
                        "evacuation_distance_m": _to_number(row.get("RESEVC_FACLT_DSTN", 0)),
                    }
                )

            return {
                "available": True,
                "source": "Gyeonggi RiskManageTargetBizplc",
                "total": len(matches),
                "data": matches,
            }
        except Exception as exc:
            logger.exception("Gyeonggi facility lookup failed")
            return {
                "available": False,
                "source": "Gyeonggi RiskManageTargetBizplc",
                "total": 0,
                "data": [],
                "message": str(exc),
            }

    def get_chemical_accidents(self, *, terms: list[str], years: int = 5) -> dict[str, Any]:
        if not settings.KOSHA_SERVICE_KEY_DECODED:
            return {
                "available": False,
                "source": "Chemical Accident API",
                "total": 0,
                "data": [],
                "message": "KOSHA/data.go.kr service key is not configured",
            }

        from datetime import datetime

        current_year = datetime.now().year
        rows: list[dict[str, str]] = []
        try:
            for year in range(current_year, current_year - max(1, years), -1):
                params = {
                    "ServiceKey": settings.KOSHA_SERVICE_KEY_DECODED,
                    "pageNo": 1,
                    "numOfRows": 200,
                    "yyyy": year,
                }
                response = safe_get(CHEMICAL_ACCIDENT_URL, params=params, timeout=15, cache_ttl=3600)
                response.raise_for_status()
                rows.extend(self._parse_accident_xml(response.text))

            matches = [
                row
                for row in rows
                if self._matches_text(row.get("chem", ""), terms) or self._matches_text(row.get("summary", ""), terms)
            ]
            return {
                "available": True,
                "source": "Chemical Accident API",
                "total": len(matches),
                "data": matches[:20],
            }
        except Exception as exc:
            logger.exception("Chemical accident lookup failed")
            return {
                "available": False,
                "source": "Chemical Accident API",
                "total": 0,
                "data": [],
                "message": str(exc),
            }

    @staticmethod
    def _parse_accident_xml(xml_text: str) -> list[dict[str, str]]:
        root = ET.fromstring(xml_text)
        items: list[dict[str, str]] = []
        for item in root.findall(".//item"):
            record = {}
            for key in ["dataNo", "cscDe", "cscTy", "area", "addr", "cause", "chem", "place", "summary"]:
                node = item.find(key)
                if node is not None and node.text:
                    record[key] = node.text.strip()
            if record:
                items.append(
                    {
                        "data_no": record.get("dataNo", ""),
                        "date": record.get("cscDe", ""),
                        "type": record.get("cscTy", ""),
                        "area": record.get("area", ""),
                        "address": record.get("addr", ""),
                        "cause": record.get("cause", ""),
                        "chemical": record.get("chem", ""),
                        "place": record.get("place", ""),
                        "summary": record.get("summary", ""),
                    }
                )
        return items
