"""Hub pages: /chemip/cas/ (every indexable page by law list and by initial) and /chemip/cas/list/<list>/ pages."""
from __future__ import annotations

import config
import labels
import layout
import names
import urls
from layout import esc

L = labels.KO


def list_meta(kr_lists: list[dict]) -> dict[str, dict]:
    """list_id -> {law, title, legal_basis, source_url, amended_on, total} for real Korean statutory lists."""
    out = {}
    for d in kr_lists:
        lid = d.get("list_id") or ""
        if config.is_real_kr_list(lid):
            out[lid] = {"list_id": lid, "law": d.get("law") or "", "title": d.get("title") or lid,
                        "legal_basis": d.get("legal_basis") or "", "source_url": d.get("source_url") or "",
                        "amended_on": d.get("amended_on") or "",
                        "total": len(d.get("entries") or []) + len(d.get("family_entries") or [])}
    return out


def members_by_list(facts: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for f in facts:
        for g in f["kr_groups"]:
            for x in g["lists"]:
                out.setdefault(x["list_id"], []).append(f)
    for lid in out:
        out[lid].sort(key=lambda f: (f["name_ko"], f["cas"]))
    return out


def _sub_link(f: dict) -> str:
    return (f'<li><a href="{urls.cas_path(f["cas"])}">{esc(f["name_ko"])}</a> '
            f'<span class="sub mono">{esc(f["cas"])}</span></li>')


def _collection_ld(title: str, desc: str, path: str, crumbs: list[tuple[str, str]]) -> list[dict]:
    return [{"@context": "https://schema.org", "@type": "CollectionPage", "name": title, "description": desc,
             "url": layout.url(path), "inLanguage": "ko",
             "isPartOf": {"@type": "WebSite", "name": config.SITE_NAME, "url": layout.url(config.APP_PATH)}},
            layout.breadcrumb_ld(crumbs)]


def hub_page(facts: list[dict], meta: dict[str, dict], members: dict[str, list[dict]], list_pages: set[str], updated: str) -> str:
    n = len(facts)
    path = urls.hub_path()
    title = L["hub_title"].format(n=f"{n:,}")
    desc = layout.fit([L["hub_desc"].format(n=f"{n:,}")], config.DESC_MAX)
    crumbs = [(L["crumb_home"], config.APP_PATH), (L["crumb_hub"], path)]
    # by law: laws ordered by how many pages they cover, lists inside by page count
    laws: dict[str, list[str]] = {}
    for lid in sorted(members, key=lambda x: (-len(members[x]), x)):
        if lid in meta:
            laws.setdefault(meta[lid]["law"], []).append(lid)
    law_html = []
    for law, lids in sorted(laws.items(), key=lambda kv: (-max(len(members[x]) for x in kv[1]), kv[0])):
        items = []
        for lid in lids:
            label = esc(meta[lid]["title"])
            if lid in list_pages:
                label = f'<a href="{urls.list_path(lid)}">{label}</a>'
            items.append(f'<li>{label} <span class="sub">{esc(L["hub_list_count"].format(n=len(members[lid])))}</span></li>')
        law_html.append(f'<h3>{esc(law)}</h3><ul class="plain">{"".join(items)}</ul>')
    # by initial: every indexable page exactly once, so crawlers reach all of them in one hop
    by_initial: dict[str, list[dict]] = {}
    for f in sorted(facts, key=lambda f: (f["name_ko"], f["cas"])):
        by_initial.setdefault(f["initial"], []).append(f)
    jump = " · ".join(f'<a href="#i-{i}">{esc(i if i != names.OTHER_INITIAL else L["hub_other_initial"])}</a>'
                      for i in names.initial_order() if i in by_initial)
    init_html = [f'<p>{jump}</p>']
    for i in names.initial_order():
        if i in by_initial:
            label = i if i != names.OTHER_INITIAL else L["hub_other_initial"]
            init_html.append(f'<h3 id="i-{i}">{esc(label)}</h3><ul class="grid">{"".join(_sub_link(f) for f in by_initial[i])}</ul>')
    body = [
        layout.crumbs([(L["crumb_home"], config.APP_PATH), (L["crumb_hub"], None)]),
        f'<h1>{esc(L["hub_h1"])}</h1>',
        f'<p class="lead">{esc(L["hub_intro"].format(n=f"{n:,}"))}</p>',
        f'<a class="cta" href="{config.APP_PATH}">{esc(L["hub_search"])}</a>',
        f'<h2 id="by-law">{esc(L["hub_by_law"])}</h2>', *law_html,
        f'<h2 id="by-initial">{esc(L["hub_by_initial"])}</h2>', *init_html,
        f'<footer><p>{esc(L["disclaimer"])}</p><p>{esc(L["updated"].format(date=updated))}</p></footer>',
    ]
    head = layout.head(lang="ko", locale=L["locale"], title=title, description=desc, path=path, robots="index,follow",
                       ld=_collection_ld(title, desc, path, crumbs))
    return layout.document(lang="ko", head_html=head, body_html="".join(body))


def list_page(m: dict, members: list[dict], updated: str) -> str:
    n = len(members)
    path = urls.list_path(m["list_id"])
    title = layout.fit([L["list_title"].format(title=m["title"], n=n),
                        L["list_title_short"].format(law=m["law"], n=n)], config.TITLE_MAX)
    desc = layout.fit([L["list_desc"].format(law=m["law"], title=m["title"], n=n, total=f'{m["total"]:,}', amended=m["amended_on"] or "-"),
                       L["list_desc"].format(law=m["law"], title=m["title"].split("(")[0].strip(), n=n,
                                             total=f'{m["total"]:,}', amended=m["amended_on"] or "-")], config.DESC_MAX)
    crumbs = [(L["crumb_home"], config.APP_PATH), (L["crumb_hub"], urls.hub_path()), (m["title"], path)]
    rows = "".join(f'<tr><td><a href="{urls.cas_path(f["cas"])}">{esc(f["name_ko"])}</a></td>'
                   f'<td class="mono">{esc(f["cas"])}</td></tr>' for f in members)
    src = (f'<a href="{esc(m["source_url"])}" rel="nofollow noopener">{esc(L["list_source"])}</a>' if m["source_url"] else "")
    body = [
        layout.crumbs([(a, b) for a, b in crumbs[:-1]] + [(m["title"], None)]),
        f'<h1>{esc(m["title"])}<span class="en">{esc(m["law"])}</span></h1>',
        f'<p class="lead">{esc(L["list_intro"].format(law=m["law"], title=m["title"], total=f"{m["total"]:,}", n=n))}</p>',
        f'<p class="meta">{esc(L["list_basis"])}: {esc(m["legal_basis"])}'
        + (f' · {esc(L["amended"])} {esc(m["amended_on"])}' if m["amended_on"] else "") + (f" · {src}" if src else "") + "</p>",
        f'<table><thead><tr><th>{esc(L["col_name"])}</th><th>{esc(L["col_cas"])}</th></tr></thead><tbody>{rows}</tbody></table>',
        f'<footer><p>{esc(L["disclaimer"])}</p><p>{esc(L["updated"].format(date=updated))} · '
        f'<a href="{urls.hub_path()}">{esc(L["crumb_hub"])}</a></p></footer>',
    ]
    head = layout.head(lang="ko", locale=L["locale"], title=title, description=desc, path=path, robots="index,follow",
                       ld=_collection_ld(title, desc, path, crumbs))
    return layout.document(lang="ko", head_html=head, body_html="".join(body))
