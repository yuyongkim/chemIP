"""One loader per source category (config.CATEGORY_ORDER). Each returns (entries, skipped); an entry is
{category, name_ko, name_en, cas | lookup, aliases, source_url, fetched_date, ref}. No CAS is invented here:
KCIA entries carry lookup names only and build_list.py resolves them against terminology.db.
"""
from __future__ import annotations

import json
import os
import re

import config
from db_names import DbNames, segments
from seed_parse import load_seeds

# law-list group wording ("Lead and its inorganic compounds", "벤지딘 및 그 염") -> the substance a user types
_GROUP_SUFFIX = re.compile(
    r"\s+and its (?:inorganic )?(?:salts|compounds|hydrates)$|\s*및\s*그\s*(?:무기)?(?:염|화합물|수화물)$", re.IGNORECASE)


def _json(path: str):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _first(text: str) -> str:
    seg = segments(text)
    return seg[0] if seg else ""


def kcia(_db: DbNames) -> tuple[list[dict], list[dict]]:
    raw, exp = _json(config.KCIA_RAW), _json(config.KCIA_EXPANSION)["labels"]
    on_page = set(raw["statistics_labels"]) | {p["label"] for p in raw["product_info"]}
    out, skipped = [], []
    for p in raw["product_info"]:
        e = exp.get(p["label"])
        if e is None or "exclude" in e:
            skipped.append({"category": "petrochem_KPIA", "ref": f"KCIA {p['group']} / {p['label']}",
                            "why": (e or {}).get("exclude", "no expansion")})
            continue
        ko = e.get("ko_label", "")
        if ko and ko not in on_page:
            raise SystemExit(f"ko_label {ko!r} is not on the KCIA pages")
        label_alias = [p["label"]] if p["label"] not in (e["name_en"], ko) else []
        out.append({"category": "petrochem_KPIA", "name_ko": ko, "name_en": e["name_en"], "lookup": e["lookup"],
                    "aliases": label_alias, "source_url": config.KCIA_PAGES["product_info"],
                    "fetched_date": raw["_fetched"], "ref": f"KCIA {p['group']} / {p['label']}"})
    return out, skipped


def accident_prep(db: DbNames) -> tuple[list[dict], list[dict]]:
    out = [{"category": "accident_prep_97", "cas": cas, "name_ko": _first(ko), "name_en": _first(en), "aliases": [],
            "source_url": config.NCIS_SOURCE_URL, "fetched_date": fetched, "ref": f"NCIS 사고대비물질 No.{no}"}
           for cas, ko, en, no, fetched in db.accident_prep()]
    return out, []


def osha(_db: DbNames) -> tuple[list[dict], list[dict]]:
    out = []
    for list_id in config.OSH_LISTS:
        d = _json(os.path.join(config.KR_LISTS, f"{list_id}.json"))
        for e in d["entries"]:
            out.append({"category": "osha_kr_special", "cas": e["cas"], "name_ko": _GROUP_SUFFIX.sub("", e.get("name_ko", "")),
                        "name_en": _GROUP_SUFFIX.sub("", e.get("name_en", "")), "aliases": [], "source_url": d["source_url"],
                        "fetched_date": d["retrieved"], "ref": f"{d['title']} / {e.get('detail', '')}"})
    return out, []


def seed_wiki(_db: DbNames) -> tuple[list[dict], list[dict]]:
    return [{"category": "seed_wiki", "cas": cas, "name_ko": ko, "name_en": "", "aliases": [],
             "source_url": config.SEED_SOURCE_URL, "fetched_date": "", "ref": "SEO seed"} for cas, ko in load_seeds()], []


LOADERS = {"petrochem_KPIA": kcia, "accident_prep_97": accident_prep, "osha_kr_special": osha, "seed_wiki": seed_wiki}
