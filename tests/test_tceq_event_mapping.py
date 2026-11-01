"""TCEQ 배출사건 오염물질 이름 매핑: 정규화 규칙 · 검토 이름표(물질군·ambiguous·alias) · 이름 색인 순서."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import tceq_event_mapping as m  # noqa: E402


@pytest.mark.parametrize("name, cas", [
    ("Butane, N-", "106-97-8"),            # 쉼표 뒤 접두 되돌리기 → n-butane
    ("Butadiene, 1-3", "106-99-0"),        # 위치번호 되돌리기 → 1,3-butadiene
    ("Ethylene (gaseous)", "74-85-1"),     # 단서 괄호 제거
    ("Ethylene, gaseous", "74-85-1"),      # 쉼표 꼬리 단서 제거
    ("Anhydrous ammonia", "7664-41-7"),    # 머리 단서 제거
    ("VCM", "75-01-4"),                    # synonyms.jsonl 약어
    ("Hexane, 2-methyl-", "591-76-4"),     # 치환기 되돌리기
    ("butene-1", "106-98-9"),              # 이중결합 위치 꼬리
    ("n-Decane", "124-18-5"),              # 직쇄 알케인 n- 접두
    ("Cis-2-butene", "590-18-1"),          # 검토 alias (PubChem CID 5287573)
    ("Methyl ethyl ketone (MEK)", "78-93-3"),  # 'X (Y)' 일치
    ("Methane", "74-82-8"),                # KOSHA 영문명 잡음(8006-14-2 천연가스)은 synonym 층이라 registry 가 이긴다
])
def test_cas(name, cas):
    r = m.resolve(name)
    assert (r.status, r.cas) == ("cas", cas), r


@pytest.mark.parametrize("name, group", [
    ("VOC", "VOC"), ("VOC (unspeciated)", "VOC"), ("Nitrogen Oxides (NOx)", "NOX"), ("PM2.5", "PM2_5"),
    ("Opacity", "OPACITY"), ("C5+ (not including benzene)", "HC_LUMP"), ("Other C7s", "HC_LUMP"),
    ("Natural Gas", "NATURAL_GAS"), ("Crude Oil", "CRUDE_OIL"), ("Other", "OTHER"),
])
def test_group(name, group):
    r = m.resolve(name)
    assert (r.status, r.group, r.cas) == ("group", group, ""), r
    assert group in m.GROUPS and m.GROUPS[group]["ko"] and m.GROUPS[group]["en"]


@pytest.mark.parametrize("name", [
    "Butanes",                  # 이성질체 미지정 복수형
    "1-Butene + Isobutylene",   # 두 물질 합계
    "Hexane, all isomers",      # 'all isomers' 를 지워 n-헥산으로 잇지 않는다
    "Butene, n-",               # 직쇄 부텐 묶음 ≠ 'Butene'(25167-67-3)
    "Nitrogen oxide",           # NOx 인지 NO 인지 갈린다
])
def test_ambiguous_never_picks(name):
    r = m.resolve(name)
    assert r.status == "ambiguous" and r.cas == "", r


def test_ambiguous_candidates():
    assert set(m.candidates("Butanes")) == {"106-97-8", "75-28-5"}
    assert m.candidates("Propane") == ()


def test_stereo_descriptor_in_parens_is_not_dropped():
    # '(E)' 를 버리면 2-펜텐(109-68-2)이 된다 — 검토 alias 로 trans-2-펜텐
    assert m.resolve("2-Pentene,(E)").cas == "646-04-8"
    assert m.resolve("2-Pentene,(Z)").cas == "627-20-3"


def test_unmapped_and_empty():
    assert m.resolve("Zzqx unknown substance 9").status == "unmapped"
    assert m.resolve("").status == "unmapped"


def test_plain_baseline_has_no_rules():
    assert m.resolve_plain("Butane, N-").status == "unmapped"
    assert m.resolve_plain("VOC").status == "unmapped"


def test_resolved_is_frozen():
    r = m.resolve("Propane")
    with pytest.raises(Exception):
        r.cas = "x"  # type: ignore[misc]


def test_reviewed_aliases_have_sources():
    for raw, v in m._entries(m._tables().cfg["aliases"]):
        assert v.get("cas") and v.get("name") and v.get("source"), raw


@pytest.mark.skipif(not Path(r"E:\dev-cache\pubchem").exists(), reason="PubChem 캐시(E:) 없음")
def test_reviewed_aliases_verify_against_sources():
    import tceq_event_name_report as report
    assert report.verify_aliases() == []
