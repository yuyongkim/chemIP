"""EU coverage (2026-11-01): REACH registration status (ECHA CHEM, bounded set), Drinking Water Directive Annex I Part B,
and the g/intl_add shards that bring lists newer than the p/ export to the product page.

Pure functions plus checks on the committed list files; no network.
"""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for sub in ("scripts/trade_controls", "scripts/trade_controls/intl", "scripts/static_export"):
    p = os.path.join(ROOT, *sub.split("/"))
    if p not in sys.path:
        sys.path.append(p)

import parse_echa_reach as R  # noqa: E402
import parse_eu_dwd as D  # noqa: E402

INTL = os.path.join(ROOT, "backend", "data", "trade_controls", "intl_lists")


def _load(name):
    with open(os.path.join(INTL, name), encoding="utf-8") as fh:
        return json.load(fh)


# ---- REACH registration (parse_echa_reach.py) ----

def test_pick_substance_prefers_reference_cas():
    items = [{"substanceIndex": {"rmlId": "100.000.742", "rmlCas": "74-85-1", "casNumber": ["74-85-1", "9002-88-4"]}},
             {"substanceIndex": {"rmlId": "100.236.871", "rmlCas": "274-85-1", "casNumber": ["274-85-1"]}}]
    sub, how = R.pick_substance("74-85-1", items)
    assert sub["rmlId"] == "100.000.742" and how == "ECHA CHEM rmlCas"
    sub, how = R.pick_substance("9002-88-4", items)
    assert sub["rmlId"] == "100.000.742" and how == "ECHA CHEM casNumber"
    sub, how = R.pick_substance("50-00-0", items)
    assert sub is None
    twins = [{"substanceIndex": {"rmlId": "100.205.812", "rmlCas": "77-92-9", "listParticipation": None}},
             {"substanceIndex": {"rmlId": "100.000.973", "rmlCas": "77-92-9", "listParticipation": ["REACH REGISTERED"]}}]
    sub, how = R.pick_substance("77-92-9", twins)
    assert sub["rmlId"] == "100.000.973" and "registered one of 2" in how


def test_summarize_dossiers_counts_types_and_dates():
    def d(sub, role, reg, upd, nons="F"):
        return {"registrationDate": reg, "lastUpdatedDate": upd,
                "reachDossierInfo": {"dossierSubtype": sub, "registrationRole": role, "nonsAssetFlag": nons}}
    s = R.summarize_dossiers([
        d("Article 10 - full", "Lead (joint submission)", "2010-08-09", "2025-10-06"),
        d("Article 10 - full", "Member (joint submission)", "2019-03-15", "2026-10-14"),
        d("Article 17 - intermediate", "Member (joint submission)", "2012-01-01", "2020-01-01", "T"),
    ])
    assert s["active"] == 3 and s["nons"] == 1 and s["joint_submission"]
    assert s["types"] == {"full registration (Art. 10)": 2, "on-site isolated intermediate (Art. 17)": 1}
    assert s["first_registered"] == "2010-08-09" and s["last_updated"] == "2026-10-14"


def test_detail_text_keeps_echa_values_as_printed():
    sub = {"rmlId": "100.000.742", "rmlEc": "200-815-3", "tonnageBand": "10,000,000 - 100,000,000 tonnes"}
    summary = {"types": {"full registration (Art. 10)": 511}, "nons": 0, "first_registered": "2010-08-09",
               "last_updated": "2026-10-14"}
    text = R.detail_text(sub, summary, 511)
    assert text.startswith("EC 200-815-3; REACH registered — active registrations 511 (full registration (Art. 10) 511)")
    assert "total tonnage band 10,000,000 - 100,000,000 tonnes per annum" in text
    assert text.endswith("ECHA CHEM https://chem.echa.europa.eu/100.000.742")


def test_cas_set_is_bounded_and_unique(tmp_path):
    (tmp_path / "seed.ts").write_text('{ cas: "71-43-2" }, { cas: "71-43-2" }, { cas: "50-00-0" }, { cas: "50-00-1" }',
                                      encoding="utf-8")
    spec = {"max_substances": 2, "cas_sets": [{"cas": ["74-85-1"]}, {"file": "seed.ts"}]}
    assert R.cas_set(spec, tmp_path) == ["74-85-1", "71-43-2"]  # 50-00-1 fails the check digit; cap 2


def test_reach_list_file_shape_and_four_substances():
    d = _load("EU_REACH_REGISTERED.json")
    assert d["list_id"] == "EU_REACH_REGISTERED" and d["jurisdiction"] == "EU"
    assert "absence_note" not in d  # not looked up ≠ not registered
    assert "Source: European Chemicals Agency, https://echa.europa.eu/" in d["license"]
    by = {e["cas"]: e for e in d["entries"]}
    for cas in ("74-85-1", "71-43-2", "50-00-0", "117-81-7"):
        e = by[cas]
        assert e["ec"] and e["active_registrations"] > 0 and e["url"].startswith("https://chem.echa.europa.eu/")
        assert "REACH registered" in e["detail"]
    assert len(d["entries"]) <= 300


# ---- Drinking Water Directive (parse_eu_dwd.py) ----

PART_B_HTML = """<p>Part B</p><p>Chemical parameters</p><table>
<tr><td><p>Parameter</p></td><td><p>Parametric value</p></td><td><p>Unit</p></td><td><p>Notes</p></td></tr>
<tr><td><p>Benzene</p></td><td><p>1,0</p></td><td><p>&#956;g/l</p></td><td><p></p></td></tr>
<tr><td><p>Lead</p></td><td><p>5</p></td><td><p>&#956;g/l</p></td><td><p>By 2036.</p></td></tr>
<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p>After that date, at the tap.</p></td></tr>
<tr><td><p>Bromate</p></td><td><p>10</p></td><td><p>&#956;g/l</p></td><td><p></p></td></tr>
</table><p>Part C</p><p>Indicator parameters</p>"""


def test_part_b_rows_join_continuation_notes():
    rows = D.part_b_rows(PART_B_HTML)
    assert [r["parameter"] for r in rows] == ["Benzene", "Lead", "Bromate"]
    assert rows[0]["value"] == "1,0" and rows[0]["unit"] == "μg/l"
    assert rows[1]["note"] == "By 2036. After that date, at the tap."


def test_build_rows_uses_cas_only_when_an_official_name_confirms_it():
    rows = D.part_b_rows(PART_B_HTML)
    mapping = {"Benzene": {"members": [{"cas": "71-43-2", "check": "^benzene$"}]},
               "Lead": {"members": [{"cas": "7439-92-1", "check": "^lead\\b"}]},
               "Bromate": {"members": [{"cas": "15541-45-4", "check": "bromate"}]}}
    ref = {"71-43-2": ["Benzene"], "7439-92-1": ["Lead ††"]}
    out, notes, problems = D.build_rows(rows, mapping, ref)
    assert [(r["cas"], r["name"]) for r in out] == [("71-43-2", "Benzene"), ("7439-92-1", "Lead"), ("", "Bromate")]
    assert out[0]["detail"] == "Annex I Part B parametric value 1,0 μg/l"
    assert problems == [] and any("Bromate" in n for n in notes)
    _, _, problems = D.build_rows(rows, {"Benzene": {}}, ref)
    assert problems == ["no mapping for parameter 'Lead'", "no mapping for parameter 'Bromate'"]


def test_dwd_list_file_has_benzene_value():
    d = _load("EU_DWD_ANNEX_I_PART_B.json")
    by = {e["cas"]: e for e in d["entries"]}
    assert by["71-43-2"]["detail"] == "Annex I Part B parametric value 1,0 μg/l"
    assert d["validation_problems"] == []


# ---- g/intl_add shards (static_export/intl_add.py) ----

def test_fnv1a32_matches_the_browser_hash():
    import intl_add
    # same algorithm as ssiFnv1a32 (static_search_index.jsx): FNV-1a 32-bit over UTF-8 bytes
    assert intl_add.fnv1a32("") == 0x811C9DC5
    assert intl_add.fnv1a32("a") == 0xE40C292C
    assert intl_add.bucket_of("71-43-2", 32) == intl_add.fnv1a32("71-43-2") % 32


def test_shard_map_groups_entries_by_cas():
    import intl_add
    docs = [{"list_id": "A", "entries": [{"cas": "71-43-2", "name": "x"}, {"cas": "71-43-2", "name": "y"}, {"cas": ""}]},
            {"list_id": "B", "entries": [{"cas": "71-43-2", "name": "z"}]}]
    shards = intl_add.shard_map(docs, 4)
    assert len(shards) == 4
    got = shards[intl_add.bucket_of("71-43-2", 4)]["71-43-2"]
    assert [m["list_id"] for m in got] == ["A", "B"] and len(got[0]["entries"]) == 2
    assert sum(len(v) for v in shards.values()) == 1
