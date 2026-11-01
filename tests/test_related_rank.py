"""Related substances (scripts/static_export/related_rank.py, related.py): scoring, reasons, data files."""
import json
import os
import re
import sys

STATIC_EXPORT = os.path.join(os.path.dirname(__file__), "..", "scripts", "static_export")
sys.path.insert(0, STATIC_EXPORT)

import related_rank as rr  # noqa: E402

W = {"sim": 10.0, "fam": 3.0, "law": 1.0, "ghs": 0.7}
CAS_RE = re.compile(r"^\d{2,7}-\d{2}-\d$")


def _features():
    return {
        "71-43-2": {("law", "SOIL"), ("law", "AIR_HAP"), ("ghs", "carc_1"), ("fam", "btex")},
        "108-88-3": {("law", "SOIL"), ("ghs", "repr_2"), ("fam", "btex")},
        "50-00-0": {("law", "AIR_HAP"), ("ghs", "carc_1")},
        "7732-18-5": {("law", "COMMON")},
        "64-17-5": {("law", "COMMON"), ("ghs", "flam_liq_2")},
    }


def _rank(features, targets, **kw):
    args = dict(weights=W, prior={}, k=8, min_score=0.5, max_df=0.9, titles={"SOIL": "토양오염물질"}, shown=2)
    args.update(kw)
    return rr.rank_all(features, set(features), targets, **args)


def test_idf_drops_common_features_and_keeps_families():
    feats = _features()
    usable = rr.idf_table(feats, set(feats), max_df=0.3)
    assert ("law", "COMMON") not in usable  # 2 of 5 targets > 30 %
    assert ("fam", "btex") in usable and usable[("fam", "btex")] == 1.0
    assert usable[("ghs", "repr_2")] > 0  # 1 of 5 targets


def test_family_reason_comes_first_and_self_is_excluded():
    out = _rank(_features(), set(_features()))
    toluene = next(it for it in out["71-43-2"] if it["cas"] == "108-88-3")
    assert toluene["why"][0] == {"t": "fam", "k": "btex"}
    assert all(it["cas"] != "71-43-2" for it in out["71-43-2"])


def test_family_adds_a_flat_bonus():
    feats = {"src": {("law", "A"), ("fam", "f")}, "with-fam": {("law", "A"), ("fam", "f")}, "no-fam": {("law", "A")}}
    out = _rank(feats, {"with-fam", "no-fam"}, max_df=1.0)
    scores = {it["cas"]: it["s"] for it in out["src"]}
    assert round(scores["with-fam"] - scores["no-fam"], 2) == W["fam"]


def test_reasons_carry_titles_and_counts():
    out = _rank(_features(), set(_features()))
    item = next(it for it in out["71-43-2"] if it["cas"] == "108-88-3")
    law = [w for w in item["why"] if w["t"] == "law"]
    assert law == [{"t": "law", "k": "SOIL", "ko": "토양오염물질"}]
    assert item["nl"] == 1 and item["ng"] == 0


def test_min_score_and_top_k():
    feats = _features()
    assert "7732-18-5" not in _rank(feats, set(feats), min_score=100.0)
    out = _rank(feats, set(feats), k=1)
    assert all(len(v) == 1 for v in out.values())


def test_cosine_keeps_hub_substances_from_dominating():
    # a hub shares one list with the source but carries many others; a close match shares both of the source's lists
    feats = {
        "src": {("law", "A"), ("law", "B")},
        "close": {("law", "A"), ("law", "B")},
        "hub": {("law", "A"), ("law", "B")} | {("law", f"X{i}") for i in range(30)},
    }
    out = _rank(feats, {"close", "hub"}, max_df=1.0)
    assert [it["cas"] for it in out["src"]][0] == "close"


def test_prior_breaks_ties_toward_well_known():
    feats = {"src": {("law", "A")}, "b-1": {("law", "A")}, "a-1": {("law", "A")}}
    plain = _rank(feats, {"a-1", "b-1"}, max_df=1.0)
    assert [it["cas"] for it in plain["src"]] == ["a-1", "b-1"]  # tie -> CAS order
    boosted = _rank(feats, {"a-1", "b-1"}, max_df=1.0, prior={"b-1": 0.3})
    assert [it["cas"] for it in boosted["src"]] == ["b-1", "a-1"]


def test_deterministic():
    feats = _features()
    assert _rank(feats, set(feats)) == _rank(feats, set(feats))


def test_family_and_hazard_data_files_are_well_formed():
    with open(os.path.join(STATIC_EXPORT, "related_families.json"), encoding="utf-8") as fh:
        fams = json.load(fh)["families"]
    assert len(fams) >= 20
    for key, members in fams.items():
        assert re.match(r"^[a-z0-9_]+$", key)
        assert len(members) >= 3 and len(set(members)) == len(members)
        assert all(CAS_RE.match(c) for c in members), key
    with open(os.path.join(STATIC_EXPORT, "related_hazards.json"), encoding="utf-8") as fh:
        codes = json.load(fh)["codes"]
    assert codes["H350"] == "carc_1" and codes["H225"] == "flam_liq_2"
    assert all(re.match(r"^H\d{3}[A-Za-z]{0,2}$", c) for c in codes)


def test_frontend_labels_cover_every_family_and_hazard_key():
    labels_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "chemip")
    with open(os.path.join(STATIC_EXPORT, "related_families.json"), encoding="utf-8") as fh:
        fams = set(json.load(fh)["families"])
    with open(os.path.join(STATIC_EXPORT, "related_hazards.json"), encoding="utf-8") as fh:
        classes = set(json.load(fh)["codes"].values())
    for name in ("product_related_labels.jsx", "product_related_labels_en.jsx"):
        with open(os.path.join(labels_dir, name), encoding="utf-8") as fh:
            text = fh.read()
        for key in fams | classes:
            assert re.search(rf"\b{key}:", text), f"{name} lacks {key}"


def test_clean_name_and_dedupe():
    import related
    import related_sources as rs

    assert rs.clean_name("포름알데히드 ( 관용명 : 폼알데하이드 ) (포르말린)") == "포름알데히드"
    assert rs.clean_name("디(2-에틸헥실)프탈레이트") == "디(2-에틸헥실)프탈레이트"
    assert rs.clean_name("다이아이소노닐 프탈산(DIISONONYL PHTHALATE)") == "다이아이소노닐 프탈산"
    assert rs.clean_name("METHANE") == "Methane"
    assert rs.display_name("1-1-1", {"name": "Methyl alcohol", "name_en": "Methanol"}, ("메틸알코올", "Methanol"), None) \
        == ("메틸알코올", "Methanol")
    assert rs.display_name("1-1-1", None, None, "벤젠") == ("벤젠", "")
    items = [{"ko": "A"}, {"ko": "B"}, {"ko": "A"}, {"ko": "SELF"}]
    assert related.dedupe_names(items, "SELF") == [{"ko": "A"}, {"ko": "B"}]
