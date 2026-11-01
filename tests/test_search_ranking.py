"""Substance search ranking: base substance (registry name / synonym / exact name) beats derivatives and complexes."""
from __future__ import annotations

from backend.core.chemical_aliases import normalize_alias
from backend.core.terminology.ranking import ranking, score
from backend.core.terminology.synonyms import synonym_index
from backend.core.terminology_db import TerminologyDB


def _cas_order(result: dict) -> list[str]:
    return [item["cas_no"] for item in result["items"]]


def test_registry_name_beats_complex_with_same_english_name(tmp_path) -> None:
    with TerminologyDB(str(tmp_path / "t.db")) as db:
        db.add_chemical_term("ethylene (ethene)", "87701-65-3")
        db.add_chemical_term("Chlorobis(ethylene)iridium(I) Dimer", "39722-81-1")
        db.add_chemical_term("에틸렌 ( 관용명 : ACETENE )", "74-85-1", chem_id="000045")
        assert _cas_order(db.search_chemicals("ethylene", limit=5))[0] == "74-85-1"
        assert _cas_order(db.search_chemicals("에틸렌", limit=5))[0] == "74-85-1"
        assert _cas_order(db.search_chemicals("74-85-1", limit=5))[0] == "74-85-1"


def test_cited_synonym_beats_polymer(tmp_path) -> None:
    with TerminologyDB(str(tmp_path / "t.db")) as db:
        db.add_chemical_term("1,3-부타디엔 신디오태틱 단일중합체", "31567-90-5")
        db.add_chemical_term("1,3-부타디엔 (1,3-Butadiene)", "106-99-0", chem_id="001167")
        assert _cas_order(db.search_chemicals("부타디엔", limit=5))[0] == "106-99-0"
        assert _cas_order(db.search_chemicals("butadiene", limit=5))[0] == "106-99-0"


def test_synonym_data_is_loaded_with_tiers() -> None:
    idx = synonym_index()
    assert idx.tier("propylene", "115-07-1") == "registry"
    assert idx.tier("ethene", "74-85-1") == "synonym"
    assert idx.tier("propylene", "71-43-2") is None


def test_score_rules() -> None:
    w = ranking()
    base = {"id": 1, "cas_no": "1-1-1", "source": "ECHA"}
    plain = score({**base, "name": "1,3-Butadiene"}, base=500, query="butadiene", syn_tier=None, heuristics=True)
    assert plain == 500 + w["base_name"]
    polymer = score({**base, "name": "Butadiene polymer"}, base=500, query="butadiene", syn_tier=None, heuristics=True)
    assert polymer == 500 - w["derivative_penalty"]
    asked = score({**base, "name": "Butadiene polymer"}, base=500, query="butadiene polymer", syn_tier=None, heuristics=True)
    assert asked == 500 + w["exact_name"]
    lean = score({**base, "name": "Butadiene polymer"}, base=500, query="butadiene", syn_tier=None, heuristics=False)
    assert lean == 500
    registry = score({**base, "name": "Propene"}, base=900, query="propylene", syn_tier="registry", heuristics=True)
    assert registry == 900 + w["synonym_tier_bonus"]["registry"]


def test_element_law_and_blocklist_synonyms() -> None:
    idx = synonym_index()

    def tier(name: str, cas: str):
        return idx.tier(normalize_alias(name), cas)

    # element names (backend/data/search/element_names.json)
    assert tier("니켈", "7440-02-0") == "registry"
    assert tier("크롬", "7440-47-3") == "registry"
    assert tier("크로뮴", "7440-47-3") == "registry"
    # law.go.kr list names (kr_lists, CAS printed in the law)
    assert tier("o-톨리딘", "119-93-7") == "registry"
    assert tier("perchloroethylene", "127-18-4") == "registry"
    # a name one list prints with several CAS is a group name: one tier lower
    assert tier("크롬산 아연", "11103-86-9") == "synonym"
    # KISCHEM data_no 4219 (cyclohexane's name on cyclohexene) is blocklisted
    assert tier("사이클로헥산", "110-83-8") is None
    assert tier("사이클로헥산", "110-82-7") == "registry"
