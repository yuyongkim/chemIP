"""Snapshot cases: (name, method, path, params, json_body). Add a case by adding a row; order is the call order.

Usage-counter note: /api/usage/summary runs first, before any counted request, so its body is stable.
"""
from __future__ import annotations

KOSHA_IDS = ["001008", "001032", "000001"]          # benzene, toluene, guanidinium chloride (MSDS cached)
CAS_LIST = ["71-43-2", "108-88-3", "7647-01-0"]
COUNTRIES = ["", "US", "VN", "EU", "INTL", "CN", "JP"]
GUIDE_NO = "A-190-2023"

Case = tuple[str, str, str, dict | None, dict | None]


def _get(name: str, path: str, params: dict | None = None) -> Case:
    return (name, "GET", path, params, None)


def _post(name: str, path: str, body: dict) -> Case:
    return (name, "POST", path, None, body)


def build_cases() -> list[Case]:
    cases: list[Case] = [
        _get("usage_summary", "/api/usage/summary"),
        _get("usage_summary_7d", "/api/usage/summary", {"days": 7, "top": 3}),
        _get("root", "/"),
        _get("health", "/health"),
        _get("ready", "/ready"),
        _get("openapi", "/openapi.json"),
        _get("swagger", "/docs"),
        _get("not_found_path", "/api/does-not-exist"),
        ("cors_preflight", "OPTIONS", "/api/chemicals", {"q": "x"}, None),
        # chemicals
        _get("search_benzene", "/api/chemicals", {"q": "benzene"}),
        _get("search_kr", "/api/chemicals", {"q": "벤젠"}),
        _get("search_cas", "/api/chemicals", {"q": "71-43-2"}),
        _get("search_toluene_p2", "/api/chemicals", {"q": "toluene", "page": 2, "limit": 5}),
        _get("search_ethyl_alcohol", "/api/chemicals", {"q": "ethyl alcohol", "limit": 20}),
        _get("search_blank", "/api/chemicals", {"q": " "}),
        _get("search_missing_q", "/api/chemicals"),
        _get("autocomplete_ben", "/api/chemicals/autocomplete", {"q": "ben"}),
        _get("autocomplete_kr", "/api/chemicals/autocomplete", {"q": "톨루", "limit": 10}),
    ]
    for cid in KOSHA_IDS:
        cases.append(_get(f"detail_{cid}", f"/api/chemicals/{cid}"))
    cases += [
        _get("detail_cas_benzene", "/api/chemicals/71-43-2"),
        _get("detail_echa_cas", "/api/chemicals/94346-09-5"),
        _get("detail_unknown_cas", "/api/chemicals/99999-99-9"),
        _get("drugs_001008", "/api/chemicals/001008/drugs"),
        _get("drugs_001032", "/api/chemicals/001032/drugs"),
        # regulations
        _get("intl_catalog", "/api/regulations/trade-controls-catalog"),
    ]
    for cas in CAS_LIST + ["50-00-0"]:
        cases.append(_get(f"international_{cas}", f"/api/regulations/international/{cas}"))
    for cas in CAS_LIST:
        for direction in ("import", "export"):
            for country in COUNTRIES:
                cases.append(_get(f"trade_{cas}_{direction}_{country or 'none'}", f"/api/regulations/trade-controls/{cas}",
                                  {"direction": direction, "country": country}))
    cases += [
        _get("trade_bad_direction", "/api/regulations/trade-controls/71-43-2", {"direction": "transit"}),
        _get("reg_search_benzene", "/api/regulations/search", {"q": "benzene"}),
        _get("reg_intel_001008", "/api/regulations/intelligence/001008"),
        _get("reg_intel_001032", "/api/regulations/intelligence/001032", {"limit": 4}),
        _get("reg_intel_unknown", "/api/regulations/intelligence/99999-99-9"),
        _get("reg_handlers_001008", "/api/regulations/handlers/001008"),
        _get("reg_handlers_unknown", "/api/regulations/handlers/99999-99-9", {"year": 2023}),
        _get("echa_search", "/api/regulations/echa/search", {"q": "benzene", "limit": 5}),
        _get("echa_clp", "/api/regulations/echa/clp/100.000.685"),
        _get("echa_dossiers", "/api/regulations/echa/dossiers/100.000.685"),
        _get("comptox_search", "/api/regulations/comptox/search", {"q": "benzene"}),
        _get("comptox_hazard", "/api/regulations/comptox/hazard/DTXSID3039242"),
        _get("niosh_search", "/api/regulations/niosh/search", {"q": "benzene"}),
        _get("niosh_cas", "/api/regulations/niosh/cas/71-43-2"),
        _get("niosh_exposure", "/api/regulations/niosh/exposure/71-43-2"),
        _get("niosh_carcinogens", "/api/regulations/niosh/carcinogens"),
        _get("kischem_cas", "/api/regulations/kischem/cas/71-43-2"),
        _get("kischem_search", "/api/regulations/kischem/search", {"q": "벤젠", "limit": 3}),
        _get("ncis_cas", "/api/regulations/ncis/cas/71-43-2"),
        _get("ncis_search", "/api/regulations/ncis/search", {"q": "벤젠"}),
        _get("kotra_reach", "/api/regulations/kotra/reach", {"q": "benzene", "limit": 3}),
        # handlers / integrations
        _get("handlers_chem", "/api/handlers", {"chem_id": "001008"}),
        _get("handlers_params", "/api/handlers", {"cas": "67-64-1", "name": "아세톤", "name_en": "Acetone"}),
        _get("incidents_benzene", "/api/integrations/incidents/71-43-2"),
        _get("provisions_benzene", "/api/integrations/provisions/71-43-2", {"country": "KR", "name": "benzene"}),
        _get("enforcement_benzene", "/api/integrations/enforcement/71-43-2"),
        _get("permit_ctx_hcl", "/api/integrations/kr-permit-context/7647-01-0"),
        _get("permit_ctx_benzene", "/api/integrations/kr-permit-context/71-43-2"),
        _get("permit_ctx_bad", "/api/integrations/kr-permit-context/not-a-cas"),
        # patents
        _get("patent_policy", "/api/patents/policy"),
        _get("patent_search", "/api/patents", {"q": "benzene"}),
        _get("patent_search_alias", "/api/patents/search", {"q": "benzene", "page": 2, "limit": 5}),
        _get("patent_missing_q", "/api/patents"),
        _get("patent_kipris_detail", "/api/patents/kipris/1020150140961"),
        _get("patent_uspto", "/api/patents/uspto/001008", {"limit": 5}),
        _get("patent_global", "/api/patents/global/001008", {"limit": 5}),
        # trade
        _get("trade_news", "/api/trade/news", {"q": "benzene", "limit": 3}),
        _get("trade_overseas", "/api/trade/overseas-market-news", {"q": "chemical", "limit": 3}),
        _get("trade_national", "/api/trade/national-info", {"country_code": "US"}),
        _get("trade_import_regs", "/api/trade/import-regulations", {"country_code": "US", "limit": 3}),
        _get("trade_success", "/api/trade/enterprise-success", {"limit": 3}),
        _get("trade_strategy", "/api/trade/strategy", {"limit": 3}),
        _get("trade_prices", "/api/trade/prices", {"limit": 3}),
        _get("trade_fraud", "/api/trade/fraud", {"limit": 3}),
        _get("trade_naver", "/api/trade/naver-news", {"q": "벤젠", "limit": 3}),
        # drugs
        _get("drugs_search", "/api/drugs/search", {"q": "aspirin"}),
        _get("drugs_approval", "/api/drugs/approval", {"q": "aspirin"}),
        _get("drugs_easy", "/api/drugs/easy", {"q": "aspirin"}),
        _get("drugs_openfda", "/api/drugs/openfda", {"q": "aspirin", "limit": 3}),
        _get("drugs_pubmed", "/api/drugs/pubmed", {"q": "benzene"}),
        _get("drugs_unified", "/api/drugs/unified", {"q": "aspirin"}),
        # guides
        _get("guide_status", "/api/guides/status"),
        _get("guide_search", "/api/guides/search", {"q": "벤젠", "limit": 5}),
        _get("guide_detail", f"/api/guides/{GUIDE_NO}", {"include_text": "false"}),
        _get("guide_detail_missing", "/api/guides/A-404"),
        _get("guide_recommend_001008", "/api/guides/recommend/001008", {"limit": 3}),
        _get("guide_recommend_refresh", "/api/guides/recommend/001032", {"limit": 3, "refresh": "true"}),
        # feedback (read-only + rejected posts)
        _get("feedback_meta", "/api/feedback/meta"),
        _get("feedback_list", "/api/feedback"),
        _get("feedback_list_filtered", "/api/feedback", {"category": "기능", "limit": 5}),
        _get("feedback_item", "/api/feedback/1"),
        _get("feedback_missing", "/api/feedback/9999"),
        _get("feedback_admin_list", "/api/feedback/admin/list"),
        _post("feedback_invalid", "/api/feedback", {"title": "", "contact": "x"}),
        _post("feedback_honeypot", "/api/feedback", {"title": "t", "body": "b", "website": "http://spam.example"}),
        # docs
        _get("docs_list", "/api/docs/list"),
        _get("docs_file", "/api/docs/API_ADOPTION_PLAYBOOK.md"),
        _get("docs_bad_name", "/api/docs/..%2F.env"),
        # ai
        _get("llm_status", "/api/ai/llm-status"),
        _post("ai_analyze_001008", "/api/ai/analyze", {"chemId": "001008", "chemicalName": "벤젠 (Benzene)", "use_llm": False}),
        _post("ai_analyze_001032", "/api/ai/analyze", {"chemId": "001032", "chemicalName": "Toluene", "use_llm": False}),
        _post("ai_recommend_blank", "/api/ai/recommend", {"query": " "}),
        _post("ai_recommend", "/api/ai/recommend", {"query": "benzene"}),
        _post("ai_summarize_blank", "/api/ai/summarize", {"chemId": ""}),
        _post("ai_summarize", "/api/ai/summarize", {"chemId": "001032"}),
        _post("ai_drug_analysis", "/api/ai/drug-analysis", {"chemId": "001008"}),
        _post("ai_drug_analysis_none", "/api/ai/drug-analysis", {"chemId": "000002"}),
        _post("ai_ask_blank", "/api/ai/ask", {"question": ""}),
        _post("ai_ask", "/api/ai/ask", {"question": "벤젠 취급 시 보호구는?", "chemId": "001008"}),
        _post("ai_ask_no_chem", "/api/ai/ask", {"question": "MSDS란?"}),
        # counted again at the end (usage counter must reflect the run deterministically)
        _get("usage_summary_end", "/api/usage/summary"),
    ]
    return cases
