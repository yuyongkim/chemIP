"""SEO sitemap (scripts/seo_pages/sitemap.py, glossary_terms.py): SPA ko/en hreflang pairs and the glossary section.

scripts/seo_pages has its own `config` module (so does scripts/static_export), so the modules are imported with a clean
sys.modules view and the previous entries are put back afterwards.
"""
import importlib
import os
import sys
import xml.etree.ElementTree as ET

import pytest

SEO = os.path.join(os.path.dirname(__file__), "..", "scripts", "seo_pages")
NAMES = ("config", "layout", "sitemap", "glossary_terms")


@pytest.fixture()
def seo():
    saved = {n: sys.modules.pop(n) for n in NAMES if n in sys.modules}
    sys.path.insert(0, SEO)
    try:
        mods = {n: importlib.import_module(n) for n in NAMES}
        yield mods
    finally:
        sys.path.remove(SEO)
        for n in NAMES:
            sys.modules.pop(n, None)
        sys.modules.update(saved)


NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9", "x": "http://www.w3.org/1999/xhtml"}


def _parse(xml):
    root = ET.fromstring(xml.encode("utf-8"))
    out = {}
    for u in root.findall("s:url", NS):
        loc = u.findtext("s:loc", namespaces=NS)
        out[loc] = {l.get("hreflang"): l.get("href") for l in u.findall("x:link", NS)}
    return out


def test_spa_home_pair_without_glossary(seo):
    entries = seo["sitemap"].spa_entries(terms=[])
    urls = _parse(seo["sitemap"].sitemap_xml(entries + [("/chemip/cas/71-43-2", "2026-10-25")]))
    site = seo["config"].SITE
    assert set(urls) == {f"{site}/chemip", f"{site}/chemip?lang=en", f"{site}/chemip/cas/71-43-2"}
    pair = {"ko": f"{site}/chemip", "en": f"{site}/chemip?lang=en", "x-default": f"{site}/chemip"}
    assert urls[f"{site}/chemip"] == pair and urls[f"{site}/chemip?lang=en"] == pair
    assert urls[f"{site}/chemip/cas/71-43-2"] == {}  # Korean-only SEO pages get no alternates


def test_glossary_section_and_escaping(seo):
    xml = seo["sitemap"].sitemap_xml(seo["sitemap"].spa_entries(terms=["psm", "flash_point"]))
    assert "&amp;term=psm" in xml and "&term=" not in xml.replace("&amp;", "")
    urls = _parse(xml)
    site = seo["config"].SITE
    hub_en = f"{site}/chemip?view=glossary&lang=en"
    assert hub_en in urls and urls[hub_en]["ko"] == f"{site}/chemip?view=glossary"
    term = f"{site}/chemip?view=glossary&term=flash_point"
    assert urls[term] == {"ko": term, "en": term + "&lang=en", "x-default": term}
    assert len(urls) == 2 + 2 * 3  # home ko/en + (hub + 2 terms) x ko/en


def test_without_alternates_keeps_plain_urlset(seo):
    xml = seo["sitemap"].sitemap_xml([("/chemip/cas/", "")])
    assert "xmlns:xhtml" not in xml and "<loc>https://chemip.yule.pics/chemip/cas/</loc>" in xml


def test_glossary_parsers(seo):
    g = seo["glossary_terms"]
    text = 'const GLOSSARY_X_KO = {\n  // c\n  psm: {\n    term: "a",\n    see: { x: 1 },\n  },\n  fire_ball: { term: "b" },\n};\nconst Y = {\n  no: {},\n};\n'
    assert g.object_keys(text, "GLOSSARY_X_KO") == ["psm", "fire_ball"]
    assert g.object_keys(text, "MISSING") == []
    assert g.abbr_key("K-REACH") == "k_reach" and g.abbr_key("KOSHA") == "kosha"
    reg = 'const GLOSSARY_CATS = [\n  { k: "psm", ko: GLOSSARY_PSM_KO, en: GLOSSARY_PSM_EN },\n  { k: "fire", ko: GLOSSARY_FIRE_KO, en: X },\n];'
    assert g.registry_cats(reg) == [("psm", "GLOSSARY_PSM_KO"), ("fire", "GLOSSARY_FIRE_KO")]
    assert g.view_registered('  { k: "glossary", Component: GlossaryView },', "glossary")
    assert not g.view_registered('  { k: "calc", Component: CalcView },', "glossary")
    assert g.glossary_query("psm", "en") == "?view=glossary&term=psm&lang=en" and g.glossary_query() == "?view=glossary"


def test_glossary_keys_from_real_files_are_unique_and_url_safe(seo):
    keys = seo["glossary_terms"].term_keys()  # [] until app.jsx registers the glossary screen
    assert len(keys) == len(set(keys))
    assert all(k and k.replace("_", "").isalnum() and k == k.lower() for k in keys)
