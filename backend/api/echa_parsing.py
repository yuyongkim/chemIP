"""ECHA CHEM response parsing (pure): substance search payload → flat ChemIP rows with REACH status labels."""
from __future__ import annotations

from typing import Any

# REACH 핵심 규제 리스트 코드 → 사람이 읽는 라벨
REACH_LIST_LABELS = {
    "SVHC_CANDIDATE_LIST": "SVHC 후보목록 (Candidate List)",
    "ANX_14_AUTHORISATION_LIST": "인가대상 (REACH Annex XIV)",
    "RESTRICTIONS_ANX_17": "제한물질 (REACH Annex XVII)",
    "REG_REGISTERED": "REACH 등록",
}


def first_value(value: Any) -> str:
    """Return the first meaningful string from a list or scalar."""
    if isinstance(value, list):
        for v in value:
            s = str(v).strip()
            if s and s != "-":
                return s
        return ""
    return str(value).strip() if value else ""


def reach_status(codes: list[str]) -> list[dict[str, str]]:
    """regulatoryProcesses 코드 목록에서 REACH 4대 상태만 뽑아 라벨링."""
    code_set = set(codes)
    return [
        {"code": c, "label": lbl}
        for c, lbl in REACH_LIST_LABELS.items()
        if c in code_set
    ]


def _substance_row(item: dict[str, Any]) -> dict[str, Any]:
    first = first_value
    idx = item.get("substanceIndex", {})

    # Regulatory processes — substanceIndex 안에 문자열 코드 배열로 들어있다
    # (이전엔 item 최상위에서 dict 로 찾아 항상 비어 있었음, 2026-09-28 수정).
    processes = idx.get("regulatoryProcesses", []) or []
    if not isinstance(processes, list):
        processes = []
    process_codes = [str(p) for p in processes]

    return {
        "rml_id": idx.get("rmlId", ""),
        "name": idx.get("rmlName", "") or first(idx.get("ecName", [])),
        "iupac_name": idx.get("rmlIupac", "") or first(idx.get("iupacName", [])),
        "cas_number": idx.get("rmlCas", "") or first(idx.get("casNumber", [])),
        "ec_number": idx.get("rmlEc", "") or first(idx.get("ecNumber", [])),
        "molecular_formula": idx.get("rmlMolFormula", "") or first(idx.get("molFormula", [])),
        "index_number": first(idx.get("indexNumber", [])),
        "smiles": idx.get("rmlSmiles", "") or first(idx.get("smiles", [])),
        "tonnage_band": idx.get("tonnageBand", "") or item.get("tonnageBand", ""),
        "regulatory_processes": process_codes,
        "reach_status": reach_status(process_codes),
        "source": "ECHA",
    }


def normalize_search_results(payload: Any) -> list[dict[str, Any]]:
    """Extract a flat list from ECHA's substance search response."""
    raw = []
    if isinstance(payload, dict):
        raw = payload.get("items", payload.get("results", []))
    elif isinstance(payload, list):
        raw = payload

    if isinstance(raw, dict):
        raw = [raw]

    return [_substance_row(item) for item in raw if isinstance(item, dict)]
