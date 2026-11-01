"""PRTR answers from the local SQLite cache (data/prtr/prtr_facilities.sqlite): summary, facilities, aggregates."""
from __future__ import annotations

import logging
import sqlite3
from typing import Any

from backend.api.handling_sites.text import _normalize_cas

logger = logging.getLogger("backend.api.handlers_adapter")  # same logger name as before the split


class PrtrCacheMixin:
    """Expects ``self.prtr_db_path``."""

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
        data = PrtrCacheMixin._aggregate_row(row)
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
