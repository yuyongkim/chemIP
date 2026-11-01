"""PRTR answers from the live portal (icis.mcee.go.kr) and the local summary workbook, cache first."""
from __future__ import annotations

import logging
import re
from typing import Any

import requests

from backend.api.handling_sites.text import _compact, _normalize_cas, _reported_total_kg, _to_number

logger = logging.getLogger("backend.api.handlers_adapter")  # same logger name as before the split

PRTR_BASE_URL = "https://icis.mcee.go.kr"


class PrtrLiveMixin:
    """Expects ``self.data_dir``, the PrtrCacheMixin readers and ``self._matches_text``."""

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
