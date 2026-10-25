"""Download -> parse -> build -> write for the three controlled-chemical trade lists."""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

import build_ag
import build_cwc
import build_drug
import kr_lawgo
import parse_australia_group
import parse_incb_red_list
import parse_kr_annexes
import parse_opcw
import pubchem_cas
from common import STALE, fetch, sha256, write_json

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[2]


def _load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def _raw(cfg: dict, raw_dir: Path, key: str, offline: bool) -> Path:
    d = cfg["downloads"][key]
    return fetch(d["url"], raw_dir / d["file"], offline)


def _file_info(path: Path, url: str) -> dict:
    info = {"path": str(path), "url": url, "sha256": sha256(path), "bytes": path.stat().st_size,
            "file_mtime": dt.datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds")}
    if str(path) in STALE:
        info["stale"] = "fresh download failed on this run; previous copy reused"
    return info


def _kr_doc(cfg: dict, raw_dir: Path, key: str, offline: bool) -> tuple[Path, dict]:
    spec = cfg["kr_laws"][key]
    meta = kr_lawgo.find_current(cfg["law_go_kr"], spec["query"], spec["target"], raw_dir, offline)
    path = kr_lawgo.download_xml(cfg["law_go_kr"], meta, spec["target"], raw_dir / spec["file"], offline)
    meta = dict(meta, raw_file=str(path), sha256=sha256(path))
    return path, meta


def run(raw_dir: Path | None = None, out_dir: Path | None = None, offline: bool = False) -> dict:
    cfg = _load("sources.json")
    raw_dir = raw_dir or Path(cfg["raw_dir"])
    out_dir = out_dir or PROJECT / cfg["output_dir"]
    today = dt.date.today().isoformat()
    report = {}

    # ---- CWC
    sched, files = {}, []
    for s in (1, 2, 3):
        key = f"opcw_schedule_{s}"
        p = _raw(cfg, raw_dir, key, offline)
        files.append(_file_info(p, cfg["downloads"][key]["url"]))
        sched[s] = parse_opcw.parse_schedule(p, s)
    cwc_xml, cwc_meta = _kr_doc(cfg, raw_dir, "cwc_act", offline)
    annex = kr_lawgo.annex_text(cwc_xml, "특정화학물질")
    kr_items = parse_kr_annexes.cwc_categories(annex)
    cwc_meta["annex"] = "[별표] 특정화학물질(제2조제5호 관련)"
    cwc_meta["annex_amended"] = _amended(annex)
    out, probs = build_cwc.build(
        cfg["lists"]["cwc_schedules"], sched, kr_items, cwc_meta,
        {"version": "OPCW web text of the CWC Annex on Chemicals, Schedules 1-3 (page carries no edition date; "
                    "Schedule 1 includes items (13)-(16)); KR: 생화학무기법 법률 제{0}호 시행 {1}".format(
                        cwc_meta["number"], cwc_meta["effective"]),
         "retrieved": today, "raw_files": files})
    write_json(out_dir / "cwc_schedules.json", out)
    report["cwc_schedules.json"] = _summary(out)

    # ---- Australia Group
    p = _raw(cfg, raw_dir, "ag_cw_precursors", offline)
    ag = parse_australia_group.parse(p)
    rule_xml, rule_meta = _kr_doc(cfg, raw_dir, "strategic_notice", offline)
    kr1c350 = parse_kr_annexes.strategic_1c350(kr_lawgo.full_text(rule_xml))
    rule_meta["annex"] = "[별표 2] 이중용도품목 1C350"
    out, probs = build_ag.build(cfg["lists"]["australia_group"], ag, kr1c350, rule_meta,
                                {"retrieved": today, "raw_files": [_file_info(p, cfg["downloads"]["ag_cw_precursors"]["url"])]})
    write_json(out_dir / "australia_group.json", out)
    report["australia_group.json"] = _summary(out)

    # ---- Drug precursors
    p = _raw(cfg, raw_dir, "incb_red_list", offline)
    incb = parse_incb_red_list.parse(p)
    drug_xml, drug_meta = _kr_doc(cfg, raw_dir, "drug_decree", offline)
    annex = kr_lawgo.annex_text(drug_xml, "원료물질, 최대거래량")
    kr_rows = parse_kr_annexes.drug_precursors(annex)
    drug_meta["annex"] = "[별표 8] 원료물질, 최대거래량 및 최고농도"
    drug_meta["annex_amended"] = _amended(annex)
    aliases = _load("name_aliases.json")["kr_to_incb"]
    out, probs = build_drug.build(
        cfg["lists"]["drug_precursors"], incb, kr_rows, aliases,
        lambda name: pubchem_cas.lookup(name, raw_dir, offline), drug_meta,
        {"retrieved": today, "raw_files": [_file_info(p, cfg["downloads"]["incb_red_list"]["url"])]})
    write_json(out_dir / "drug_precursors.json", out)
    report["drug_precursors.json"] = _summary(out)
    return report


def _amended(annex: str) -> str:
    m = re.search(r"<개정 ([^>]+)>", annex[:600])
    return m.group(1).strip() if m else ""


def _summary(out: dict) -> dict:
    return {"source_version": out["source_version"], "counts": out["counts"],
            "cas_checksum_failures": out["validation"]["cas_checksum_failures"],
            "problems": out["validation"]["problems"]}
