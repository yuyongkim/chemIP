"""원천 규칙 + 대조 결과 + 물질 색인 → kr_rules.json 구조를 조립한다.

여기서는 네트워크·파일 입출력을 하지 않는다. 진입점(build_kr_rules.py)이 재료를 모아 넘긴다.
인용 대조에 실패한 규칙은 rules 에서 빼고 unverified 로 옮긴다(이유 포함).
"""
from __future__ import annotations

from pathlib import Path

from . import citation_check, rule_matcher
from .customs_annex import AnnexTable
from .ncis_index import SubstanceIndex, category_summary

CUSTOMS_LAW = "화학물질관리법"
ODS_LAW = "오존층 보호 등을 위한 특정물질의 관리에 관한 법률"


def _verify_rule(rule: dict, laws: dict, annexes: dict[str, AnnexTable], cache_dir: Path, refresh: bool):
    results = [citation_check.check_citation(c, laws, cache_dir, refresh) for c in rule["citations"]]
    failures = [r.reason for r in results if not r.ok]
    annex_ok, annex_msg = citation_check.check_annex(rule.get("customs", {}), annexes)
    if not annex_ok:
        failures.append("세관장확인 대조 실패: " + annex_msg)
    return results, failures, annex_msg


def _customs_cas_for(customs: dict, annexes: dict[str, AnnexTable]) -> set[str]:
    """annex_check 가 가리키는 별표·법령의 CAS 집합(행에 CAS 가 없으면 빈 집합)."""
    spec = customs.get("annex_check")
    table = annexes.get(spec["annex"]) if spec else None
    return table.cas_by_law.get(spec["law"], set()) if table else set()


def _rule_output(rule: dict, results, annex_msg: str, idx: SubstanceIndex, customs_cas: set[str]) -> dict:
    primary, *rest = rule["citations"]
    matched = rule_matcher.match(rule["when"], idx)
    missing = [c for c in rule_matcher.referenced_categories(rule["when"]) if c not in idx.by_category]
    customs = rule.get("customs", {})
    out = {
        "rule_id": rule["rule_id"],
        "when": rule["when"],
        "direction": rule["direction"],
        "obligation": rule["obligation"],
        "who": rule["who"],
        "when_required": rule["when_required"],
        "agency": rule["agency"],
        "threshold": rule["threshold"],
        "legal_basis": rule["legal_basis"],
        "source_url": results[0].source_url,
        "verified_text": primary["verified_text"],
        "supporting_citations": [
            {"article": f"{c['law']} {c['article']}", "source_url": r.source_url, "verified_text": c["verified_text"]}
            for c, r in zip(rest, results[1:])
        ],
        "customs_confirmation": bool(customs.get("confirmation")),
        "customs_basis": customs.get("basis", ""),
        "customs_annex_check": annex_msg,
        "note": rule.get("note", ""),
        "matched_substances": len(matched),
        "active": not missing,
    }
    if missing:
        out["missing_categories"] = missing
    if out["customs_confirmation"] and customs_cas:  # 별표 행에 CAS 가 있는 법령만 물질 단위로 센다
        out["matched_in_customs_hsk_list"] = len(matched & customs_cas)
    return out


def build(source: dict, idx: SubstanceIndex, annexes: dict[str, AnnexTable], cache_dir: Path, refresh: bool) -> dict:
    laws = source["laws"]
    rules, unverified = [], list(source.get("unverified", []))
    import_table = annexes.get("import_hsk")
    for rule in source["rules"]:
        results, failures, annex_msg = _verify_rule(rule, laws, annexes, cache_dir, refresh)
        if failures:
            unverified.append({"topic": rule["rule_id"], "missing": "; ".join(failures), "legal_basis": rule["legal_basis"]})
            continue
        customs_cas = _customs_cas_for(rule.get("customs", {}), annexes)
        rules.append(_rule_output(rule, results, annex_msg, idx, customs_cas))
    framework = source.get("customs_framework", {})
    framework_checks = [citation_check.check_citation(c, laws, cache_dir, refresh) for c in framework.get("citations", [])]
    return {
        "jurisdiction": source["jurisdiction"],
        "retrieved": source["retrieved"],
        "laws": {k: {"name": v["name"], "version": v["version"], "url": v["public_url"]} for k, v in laws.items()},
        "ncis_categories": category_summary(idx),
        "customs_framework": {
            "summary": framework.get("summary", ""),
            "annex_2_chemical_entries": framework.get("annex_2_chemical_entries", ""),
            "citations": [
                {"article": f"{c['law']} {c['article']}", "source_url": r.source_url, "verified_text": c["verified_text"], "verified": r.ok}
                for c, r in zip(framework.get("citations", []), framework_checks)
            ],
            "import_hsk_annex": source.get("customs_annexes", {}).get("import_hsk", {}),
            "import_cas_by_law": {
                law: sorted(cas) for law, cas in (import_table.cas_by_law.items() if import_table else []) if law in (CUSTOMS_LAW, ODS_LAW) and cas
            },
        },
        "rules": rules,
        "unverified": unverified,
    }
