"""Substance page template: facts (facts.build) + labels -> one static HTML document. Korean default, English optional.

Each section's <h2> carries data-count so validators can compare the rendered numbers with the live API.
"""
from __future__ import annotations

import config
import labels
import layout
import urls
from layout import esc


def _L(lang: str) -> dict:
    return labels.EN if lang == "en" else labels.KO


def _counts(f: dict) -> dict:
    c = f["counts"]
    return {"laws": c["kr_laws"], "kr": c["kr_lists"], "permits": c["permits"], "oblig": c["obligations"],
            "juris": c["foreign_juris"], "foreign": c["foreign_lists"]}


def _clauses(f: dict, L: dict, with_oblig: bool = True) -> str:
    """Non-zero count phrases only, e.g. '국내 13개 법령 28개 목록, 인허가·신고 25건'."""
    n = _counts(f)
    parts = [("cl_kr", n["kr"]), ("cl_permits", n["permits"]), ("cl_oblig", n["oblig"] if with_oblig else 0),
             ("cl_foreign", n["foreign"])]
    return L["cl_join"].join(L[key].format(**n) for key, v in parts if v)


def title(f: dict, lang: str = "ko") -> str:
    L = _L(lang)
    sfx = "" if f["has_msds"] else "_nomsds"
    name = f["name_ko"] if lang == "ko" else (f["name_en"] or f["name_ko"])
    for key in ("title", "title_short"):
        t = L[key + sfx].format(name=name, cas=f["cas"])
        if len(t) <= config.TITLE_MAX:
            return t
    t = layout.fit_name(L["title_short" + sfx], name, config.TITLE_MAX, cas=f["cas"])
    return t if len(t) <= config.TITLE_MAX else L["title_min" + sfx].format(cas=f["cas"])


def app_link(f: dict) -> tuple[str, str]:
    """(href, label key): the SPA substance view for KOSHA substances, the SPA search by CAS otherwise."""
    if f["chem_id"]:
        return config.app_link(f["chem_id"]), "cta"
    return config.app_search_link(f["cas"]), "cta_search"


def description(f: dict, lang: str = "ko") -> str:
    L = _L(lang)
    name = f["name_ko"] if lang == "ko" else (f["name_en"] or f["name_ko"])
    hz = f["hazards"]
    clauses = _clauses(f, L, with_oblig=False)
    base = (L["desc"].format(name="{name}", cas=f["cas"], clauses=clauses) if clauses
            else L["desc_none"].format(name="{name}", cas=f["cas"]))
    extras = []
    if hz["signal_word"]:
        extras.append(L["desc_msds"].format(signal=hz["signal_word"], h=len(hz["h_statements"])))
    if f["hs"]:
        extras.append(L["desc_hs"].format(hs6=f["hs"][0]["hs6"]))
    # drop extras from the end until it fits, then shorten the name if still needed
    for n in range(len(extras), -1, -1):
        tpl = base + "".join(extras[:n])
        if len(tpl.format(name=name)) <= config.DESC_MAX:
            return tpl.format(name=name)
    return layout.fit_name(base, name, config.DESC_MAX)


def _summary(f: dict, L: dict, name: str) -> str:
    clauses = _clauses(f, L)
    text = (L["summary"].format(name=name, cas=f["cas"], clauses=clauses) if clauses
            else L["summary_none"].format(name=name, cas=f["cas"]))
    if f["counts"]["controlled"]:
        text += L["summary_ctl"].format(n=f["counts"]["controlled"])
    hz = f["hazards"]
    if hz["signal_word"]:
        text += L["summary_msds"].format(signal=hz["signal_word"], h=len(hz["h_statements"]))
    return f'<p class="lead" id="summary">{esc(text)}</p>'


def _h2(sid: str, text: str, count: int | None = None, sub: str = "") -> str:
    dc = f' data-count="{count}"' if count is not None else ""
    s = f' <span class="sub">{esc(sub)}</span>' if sub else ""
    return f'<h2 id="{sid}"{dc}>{esc(text)}{s}</h2>'


def _msds(f: dict, L: dict, lang: str) -> str:
    hz = f["hazards"]
    out = [_h2("msds", L["sec_msds"], len(hz["h_statements"]), L["msds_src"])]
    if not f["has_msds"]:
        return "".join(out) + f'<p class="note" id="msds-absent">{esc(L["msds_absent"].format(cas=f["cas"]))}</p>'
    if hz["signal_word"]:
        out.append(f'<p>{esc(L["signal"])}: <span class="signal">{esc(hz["signal_word"])}</span></p>')
    if hz["pictograms"]:
        idx = 1 if lang == "en" else 0
        chips = "".join(f'<li><span class="mono">{p}</span> {esc(labels.PICTOGRAMS.get(p, ("", ""))[idx])}</li>'
                        for p in hz["pictograms"])
        out.append(f'<h3>{esc(L["pictograms"])}</h3><ul class="chips" id="pictograms">{chips}</ul>')
    if hz["h_statements"]:
        items = "".join(f'<li><span class="mono">{esc(h["code"])}</span> {esc(h["text"])}</li>' for h in hz["h_statements"])
        out.append(f'<h3>{esc(L["h_statements"])}</h3><ul class="plain" id="h-statements">{items}</ul>')
    else:
        out.append(f'<p class="note">{esc(L["msds_none"])}</p>')
    if hz["classes"]:
        out.append(f'<h3>{esc(L["hazard_classes"])}</h3><ul class="chips">'
                   + "".join(f"<li>{esc(c)}</li>" for c in hz["classes"]) + "</ul>")
    return "".join(out)


def _kr(f: dict, L: dict, list_pages: set[str]) -> str:
    c = f["counts"]
    out = [_h2("kr", L["sec_kr"], c["kr_lists"], L["kr_count"].format(laws=c["kr_laws"], lists=c["kr_lists"]))]
    for g in f["kr_groups"]:
        items = []
        for x in g["lists"]:
            name = esc(x["title"])
            if x["list_id"] in list_pages:
                name = f'<a href="{urls.list_path(x["list_id"])}">{name}</a>'
            amended = f' <span class="tag">{esc(L["amended"])} {esc(x["amended_on"])}</span>' if x["amended_on"] else ""
            src = (f' <a class="sub" href="{esc(x["source_url"])}" rel="nofollow noopener">{esc(L["list_source"])}</a>'
                   if x["source_url"] else "")
            items.append(f'<li data-list="{esc(x["list_id"])}">{name}{amended}{src}</li>')
        out.append(f'<h3>{esc(g["law"])}</h3><ul class="plain">{"".join(items)}</ul>')
    if f["ncis_categories"]:
        out.append(f'<h3>{esc(L["ncis"])}</h3><ul class="chips" id="ncis">'
                   + "".join(f"<li>{esc(x)}</li>" for x in f["ncis_categories"]) + "</ul>")
    if f["ncis_inventory"]:
        out.append(f'<p class="note">{esc(L["ncis_inventory"])}: {esc(", ".join(f["ncis_inventory"]))}</p>')
    return "".join(out)


def _permits(f: dict, L: dict) -> str:
    if not f["permits"]:
        return ""
    rows = "".join(
        f'<li data-permit="{esc(p["permit_id"])}"><strong>{esc(p["name"])}</strong>'
        + (f' <span class="tag">{esc(p["kind"])}</span>' if p["kind"] else "")
        + f'<br><span class="sub">{esc(p["law"])} · {esc(p["legal_basis"])}'
        + (f' · {esc(p["authority"])}' if p["authority"] else "") + "</span></li>"
        for p in f["permits"])
    return (_h2("permits", L["sec_permits"], len(f["permits"])) + f'<ul class="plain">{rows}</ul>'
            + f'<p class="note">{esc(L["permits_note"])}</p>')


def _obligations(f: dict, L: dict, lang: str) -> str:
    out = [_h2("obligations", L["sec_oblig"], len(f["obligations"]))]
    if f["obligations"]:
        dirs = labels.KR_DIRECTION[lang]
        items = "".join(
            f'<li data-rule="{esc(o["rule_id"])}"><span class="tag">{esc(dirs.get(o["direction"], o["direction"]))}</span> '
            f'{esc(o["obligation"])}<br><span class="sub">{esc(o["legal_basis"])}'
            + (f' · {esc(o["agency"])}' if o["agency"] else "")
            + (f' · {esc(L["customs"])}' if o["customs"] else "") + "</span></li>"
            for o in f["obligations"])
        out.append(f'<ul class="plain">{items}</ul>')
    else:
        out.append(f'<p class="note">{esc(L["oblig_none"])}</p>')
    if f["obligations_generic"]:
        gen = "; ".join(o["obligation"].split("(")[0].split(".")[0].strip() for o in f["obligations_generic"])
        out.append(f'<p class="note">{esc(L["oblig_generic"].format(items=gen))}</p>')
    return "".join(out)


def _controlled(f: dict, L: dict, lang: str) -> str:
    out = [_h2("controlled", L["sec_controlled"], len(f["controlled"]))]
    if not f["controlled"]:
        return "".join(out) + f'<p class="note">{esc(L["controlled_none"])}</p>'
    dirs = labels.KR_DIRECTION[lang]
    items = "".join(
        f'<li data-list="{esc(x["list_id"])}">{esc(x["title"])}'
        + "".join(f' <span class="tag">{esc(dirs.get(d, d))}</span>' for d in x["directions"])
        + (f'<br><span class="sub">{esc(x["kr_obligation"])}</span>' if isinstance(x["kr_obligation"], str) and x["kr_obligation"] else "")
        + "</li>" for x in f["controlled"])
    return "".join(out) + f'<ul class="plain">{items}</ul>'


def _intl(f: dict, L: dict, lang: str) -> str:
    c = f["counts"]
    out = [_h2("intl", L["sec_intl"], c["foreign_lists"], L["intl_count"].format(juris=c["foreign_juris"], lists=c["foreign_lists"]))]
    dirs = labels.INTL_DIRECTION[lang]
    inventories = []
    for g in f["intl_groups"]:
        regs = [x for x in g["lists"] if not x["inventory"]]
        inventories += [(g, x) for x in g["lists"] if x["inventory"]]
        if not regs:
            continue
        name = g["en"] if lang == "en" else f'{g["ko"]} · {g["en"]}'
        items = "".join(
            f'<li data-list="{esc(x["list_id"])}">'
            + (f'<a href="{esc(x["source_url"])}" rel="nofollow noopener">{esc(x["title"])}</a>' if x["source_url"] else esc(x["title"]))
            + "".join(f' <span class="tag">{esc(dirs.get(d, d))}</span>' for d in x["directions"]) + "</li>"
            for x in regs)
        out.append(f'<h3 data-jur="{esc(g["code"])}">{esc(name)}</h3><ul class="plain">{items}</ul>')
    if not c["foreign_lists"]:
        out.append(f'<p class="note">{esc(L["intl_none"])}</p>')
    if inventories:
        inv = ", ".join(f'{(g["en"] if lang == "en" else g["ko"])} {x["list_id"].split("_", 1)[1].replace("_", " ")}' for g, x in inventories)
        out.append(f'<p class="note" id="inventories">{esc(L["inventories"])}: {esc(inv)}</p>')
    return "".join(out)


def _hs(f: dict, L: dict) -> str:
    out = [_h2("hs", L["sec_hs"], len(f["hs"]))]
    if not f["hs"]:
        return "".join(out) + f'<p class="note">{esc(L["hs_none"])}</p>'
    items = "".join(f'<li><span class="mono">{esc(h["hs6"])}</span> {esc(h["title_ko"] or h["title_en"])}'
                    + (f' <span class="sub">({esc(h["description"])})</span>' if h["description"] else "") + "</li>"
                    for h in f["hs"])
    return "".join(out) + f'<ul class="plain">{items}</ul><p class="note">{esc(L["hs_note"])}</p>'


def _related(rel: list[dict], L: dict, lang: str) -> str:
    if not rel:
        return ""
    items = "".join(f'<li><a href="{urls.cas_path(r["cas"], lang)}">{esc(r["name_ko"] if lang == "ko" else (r["name_en"] or r["name_ko"]))}</a>'
                    f' <span class="sub mono">{esc(r["cas"])}</span></li>' for r in rel)
    return _h2("related", L["sec_related"]) + f'<ul class="grid">{items}</ul>'


def _sources(f: dict, L: dict, lang: str, updated: str) -> str:
    items = "".join(f'<li><a href="{esc(s["url"])}" rel="nofollow noopener">{esc(s[lang])}</a></li>' for s in labels.SOURCES)
    return (_h2("sources", L["sec_sources"]) + f'<ul class="plain">{items}</ul>'
            + (f'<p class="note">{esc(L["data_date"].format(date=f["lastmod"]))}</p>' if f["lastmod"] else "")
            + f'<footer><p>{esc(L["disclaimer"])}</p><p>{esc(L["updated"].format(date=updated))} · '
            f'<a href="{config.APP_PATH}">ChemIP</a></p></footer>')


def _ld(f: dict, L: dict, lang: str, page_title: str, desc: str, path: str, crumbs: list[tuple[str, str]]) -> list[dict]:
    name = f["name_ko"] if lang == "ko" else (f["name_en"] or f["name_ko"])
    alt = [x for x in [f["name_en"] if lang == "ko" else f["name_ko"], *f["alt_names"]] if x and x != name]
    about = {"@type": "ChemicalSubstance", "name": name,
             "identifier": {"@type": "PropertyValue", "propertyID": "CAS", "value": f["cas"]}}
    if alt:
        about["alternateName"] = alt
    page = {"@context": "https://schema.org", "@type": "WebPage", "name": page_title, "description": desc,
            "url": layout.url(path), "inLanguage": lang, "about": about,
            "isPartOf": {"@type": "WebSite", "name": config.SITE_NAME, "url": layout.url(config.APP_PATH)}}
    if f["lastmod"]:
        page["dateModified"] = f["lastmod"]
    return [page, layout.breadcrumb_ld(crumbs)]


def page(f: dict, *, lang: str, indexable: bool, related: list[dict], list_pages: set[str], updated: str,
         has_en: bool) -> str:
    L = _L(lang)
    path = urls.cas_path(f["cas"], lang)
    name = f["name_ko"] if lang == "ko" else (f["name_en"] or f["name_ko"])
    t, d = title(f, lang), description(f, lang)
    crumbs = [(L["crumb_home"], config.APP_PATH), (L["crumb_hub"], urls.hub_path("ko")), (name, path)]
    alternates = {"ko": urls.cas_path(f["cas"], "ko"), "en": urls.cas_path(f["cas"], "en")} if has_en else None
    if alternates:
        alternates["x-default"] = alternates["ko"]
    head = layout.head(lang=L["lang"], locale=L["locale"], title=t, description=d, path=path,
                       robots="index,follow" if indexable else "noindex,follow",
                       ld=_ld(f, L, lang, t, d, path, crumbs), alternates=alternates)
    other = f["name_en"] if lang == "ko" else (f["name_ko"] if f["name_en"] else "")
    href, cta = app_link(f)
    body = [
        layout.crumbs([(a, b) for a, b in crumbs[:-1]] + [(crumbs[-1][0], None)]),
        f'<h1>{esc(name)}{f'<span class="en">{esc(other)}</span>' if other else ""}</h1>',
        f'<p class="meta">{esc(L["cas"])} <span class="mono" id="cas">{esc(f["cas"])}</span></p>',
        _summary(f, L, name),
        f'<a class="cta" href="{esc(href)}">{esc(L[cta])}</a>',
        _msds(f, L, lang), _kr(f, L, list_pages), _permits(f, L), _obligations(f, L, lang),
        _controlled(f, L, lang), _intl(f, L, lang), _hs(f, L), _related(related, L, lang),
        _sources(f, L, lang, updated),
    ]
    return layout.document(lang=L["lang"], head_html=head, body_html="".join(body))
