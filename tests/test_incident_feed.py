"""Incident feed (service 9): pure parsing functions, feed_items writes and the static export (temporary DB/dirs only)."""
from __future__ import annotations

import datetime as dt
import gzip
import json
import os
import sqlite3
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for sub in ("scripts/portal_build", "scripts/static_export"):
    p = os.path.join(ROOT, *sub.split("/"))
    if p not in sys.path:
        sys.path.append(p)

import feed_config as FC  # noqa: E402
import feed_db  # noqa: E402
import feed_export  # noqa: E402
import feed_fetch  # noqa: E402
from feed_parse import (NameTagger, emars_country, iso_date, kosha_date, parse_rss, rfc822_date,  # noqa: E402
                        truncate, valid_cas_list)

TODAY = dt.date(2026, 10, 31)

CSB_RSS = b"""\xef\xbb\xbf<?xml version="1.0" encoding="utf-8"?><rss version="2.0" xmlns:dc="https://purl.org/dc/elements/1.1/"><channel><title>CSB News</title>
<item><title>CSB Releases Final Report on Ammonia Release</title><link>http://www.csb.gov/csb-final-report-ammonia/</link>
<description>Final &lt;b&gt;Report&lt;/b&gt; </description><pubDate>Mon, 19 Oct 2026 11:59:00 GMT</pubDate></item>
<item><title>No link item</title><link>javascript:alert(1)</link><pubDate>Mon, 19 Oct 2026 11:59:00 GMT</pubDate></item>
</channel></rss>"""

PRESS_RSS = """<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<item><title>여수 공장 암모니아가 누출 - 어느신문</title><link>https://news.google.com/rss/articles/abc?oc=5</link>
<pubDate>Fri, 30 Oct 2026 05:42:14 GMT</pubDate><description>&lt;a href="x"&gt;본문 일부&lt;/a&gt;</description><source url="https://x.kr">어느신문</source></item>
<item><title>여수소방서 합동훈련 - 다른신문</title><link>https://news.google.com/rss/articles/def?oc=5</link>
<pubDate>Thu, 29 Oct 2026 01:00:00 GMT</pubDate></item>
</channel></rss>""".encode("utf-8")

PAIRS = [("7664-41-7", "암모니아"), ("7664-41-7", "Ammonia"), ("1333-74-0", "수소"), ("7732-18-5", "Water"), ("", "폐액")]


def tagger():
    return NameTagger(PAIRS, FC.NAME_MATCH_MIN_LATIN, FC.NAME_MATCH_MIN_HANGUL, FC.NAME_MATCH_SKIP)


def test_iso_date_rejects_typos_and_future():
    assert iso_date("2025-06-04", TODAY) == "2025-06-04"
    assert iso_date("2024-07", TODAY) == "2024-07"
    assert iso_date("2202-11-21", TODAY) == ""          # typo in the RMP data
    assert iso_date("2026-11-01", TODAY) == ""          # future
    assert iso_date("1850-01-01", TODAY) == ""
    assert iso_date("2025-13-01", TODAY) == ""
    assert iso_date("", TODAY) == ""


def test_kosha_date_from_summary():
    assert kosha_date("‘2025.11.00(금) 13:16경, 경기도", TODAY) == "2025-11"
    assert kosha_date("2025. 06. 12.(금) 12:35경", TODAY) == "2025-06-12"
    assert kosha_date("날짜 없음", TODAY) == ""


def test_emars_country():
    assert emars_country("not given - Marl, Nordrhein-Westfalen, BRD - Germany") == "DE"
    assert emars_country("not given - South Humberside - United Kingdom") == "GB"
    assert emars_country("x - United Kingdom (North East)") == "GB"
    assert emars_country("Solvay Fluor GmbH - Carl-Ulrich-Strasse 34, 74206 Bad Wimpfen") == ""


def test_rfc822_and_truncate():
    assert rfc822_date("Mon, 19 Oct 2026 23:59:00 -0500") == "2026-10-20"
    assert rfc822_date("not a date") == ""
    assert truncate("abcdef", 4) == "abc…"
    assert truncate("abc", 4) == "abc"


def test_parse_rss_keeps_http_links_only_and_rejects_dtd():
    rows = parse_rss(CSB_RSS)
    assert [r["title"] for r in rows] == ["CSB Releases Final Report on Ammonia Release"]
    assert rows[0]["description"] == "Final Report"
    with pytest.raises(ValueError):
        parse_rss(b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x "y">]><rss><channel></channel></rss>')


def test_name_tagger_word_boundaries():
    t = tagger()
    assert t.tag("여수 공장 암모니아가 누출") == (["7664-41-7"], ["암모니아"])
    assert t.tag("여수소방서 합동훈련") == ([], [])        # 수소 inside a longer word
    assert t.tag("Ammonia leak in Iowa") == (["7664-41-7"], ["Ammonia"])
    assert t.tag("ammonia-based fertilizer") == ([], [])
    assert t.tag("Water tank leaked") == ([], [])            # skipped generic name
    assert valid_cas_list([("71-43-2", "Benzene"), ("bad", "x"), ("71-43-2", "벤젠")]) == (["71-43-2"], ["Benzene"])


def test_rss_to_items():
    csb = feed_fetch.rss_to_csb(CSB_RSS, "2026-10-31T00:00:00Z", tagger())
    assert len(csb) == 1
    it = csb[0]
    assert it["id"] == "csb_rss:csb-final-report-ammonia"
    assert it["url"] == "https://www.csb.gov/csb-final-report-ammonia/"
    assert it["date"] == "2026-10-19" and it["country"] == "US" and it["cas"] == ["7664-41-7"]
    press = feed_fetch.rss_to_press(PRESS_RSS, "2026-10-31T00:00:00Z", tagger())
    assert [p["summary"] for p in press] == ["", ""]           # press: title and link only
    assert press[0]["cas"] == ["7664-41-7"] and press[1]["cas"] == []
    assert press[0]["lang"] == "ko" and press[0]["id"].startswith("press_gnews:")


def test_fetch_press_skips_failed_query():
    calls = []

    def fake_get(url):
        calls.append(url)
        if len(calls) == 1:
            raise RuntimeError("down")
        return PRESS_RSS

    items, errors = feed_fetch.fetch_press("t", None, get=fake_get)
    assert len(calls) == len(FC.PRESS_QUERIES) and len(errors) == 1
    assert len(items) == 2                                     # same links from several queries → one item each


def _item(i, source="chemeng_csb", date="2025-01-01", cas=None):
    return {"id": f"{source}:{i}", "date": date, "title": f"t{i}", "url": f"https://x/{i}", "source_id": source,
            "cas": cas or [], "chem_names": ["Benzene"] * len(cas or []), "equipment": [], "discipline": [],
            "country": "US", "summary": "", "lang": "en", "fetched_at": None}


@pytest.fixture()
def feed_conn(tmp_path):
    conn = sqlite3.connect(tmp_path / "portal.db")
    conn.executescript("CREATE TABLE sources (source_id TEXT PRIMARY KEY, name TEXT, url TEXT, license TEXT, retrieved_at TEXT);")
    feed_db.ensure_schema(conn)
    yield conn, str(tmp_path / "portal.db")
    conn.close()


def test_feed_db_replace_upsert_prune(feed_conn):
    conn, _ = feed_conn
    assert feed_db.replace_source(conn, "chemeng_csb", [_item(1), _item(2), _item(2)]) == 2
    assert feed_db.replace_source(conn, "chemeng_csb", [_item(3)]) == 1
    feed_db.upsert(conn, [_item(i, "csb_rss", f"2026-10-{10 + i:02d}") for i in range(5)])
    assert feed_db.prune_keep_newest(conn, "csb_rss", 3) == 2
    feed_db.upsert(conn, [_item(1, "press_gnews", "2026-01-01"), _item(2, "press_gnews", "2026-10-30")])
    assert feed_db.prune_older_than(conn, "press_gnews", 120, TODAY) == 1
    assert feed_db.counts(conn) == {"csb_rss": 3, "chemeng_csb": 1, "press_gnews": 1}
    back = {it["id"]: it for it in feed_db.read_all(conn)}
    assert back["csb_rss:4"]["date"] == "2026-10-14" and back["csb_rss:4"]["cas"] == []


def test_select_latest_caps_and_keeps_every_source():
    items = [_item(i, "press_gnews", "2026-10-30") for i in range(50)] + [_item(i, "chemeng_rmp", "2001-01-01") for i in range(5)]
    out = feed_export.select_latest(items, n=20, per_source=3, per_source_max=10)
    sources = [it["source_id"] for it in out]
    assert sources.count("press_gnews") == 10 and sources.count("chemeng_rmp") == 5
    assert out[0]["date"] >= out[-1]["date"]


def test_export_feed_files(feed_conn, tmp_path):
    conn, path = feed_conn
    feed_db.replace_source(conn, "chemeng_csb", [_item(1, cas=["71-43-2"], date="2020-01-01"), _item(2, cas=["71-43-2", "7664-41-7"]),
                                                  _item(3, date="")])
    with conn:
        conn.execute("INSERT INTO sources VALUES ('chemeng_csb', 'CSB', 'https://www.csb.gov', 'Public domain', '2026-10-15')")
    out = tmp_path / "feed"
    report = feed_export.export_feed(log=lambda *_: None, db_path=path, out_dir=str(out))
    assert report["items"] == 3 and report["cas_files"] == 2

    def read(p):
        data = (out / p).read_bytes()
        assert data[:2] == b"\x1f\x8b"
        return json.loads(gzip.decompress(data))

    latest = read("latest.json")
    assert latest["v"] == FC.EXPORT_FORMAT and latest["total"] == 3 and latest["count"] == 3
    assert [it["id"] for it in latest["items"]] == ["chemeng_csb:2", "chemeng_csb:1", "chemeng_csb:3"]  # no date last
    assert latest["sources"]["chemeng_csb"]["license"] == "Public domain" and latest["sources"]["chemeng_csb"]["n"] == 3
    assert set(latest["items"][0]) == {"id", "date", "title", "url", "source", "cas", "names", "equipment", "disciplines",
                                       "country", "summary"}
    assert latest["substances"][0] == ["71-43-2", "Benzene", 2]
    benzene = read("by-cas/71-43-2.json")
    assert benzene["cas"] == "71-43-2" and benzene["total"] == 2 and benzene["by_source"] == {"chemeng_csb": 2}


def test_pc_site_route_serves_feed_files(tmp_path, monkeypatch):
    """PC site: /data/v1/feed/... from the local export (backend/api/routes/static_areas.py, Next rewrite)."""
    from backend.api.routes import static_areas

    (tmp_path / "feed" / "by-cas").mkdir(parents=True)
    (tmp_path / "feed" / "latest.json").write_bytes(gzip.compress(b'{"v":1,"items":[]}'))
    (tmp_path / "feed" / "by-cas" / "71-43-2.json").write_bytes(gzip.compress(b'{"v":1}'))
    monkeypatch.setattr(static_areas, "EXPORT_DIR", tmp_path)
    r = static_areas.get_area_file("feed", "latest.json")
    assert r.status_code == 200 and r.headers["content-encoding"] == "gzip" and "max-age=900" in r.headers["cache-control"]
    assert static_areas.get_area_sub_file("feed", "by-cas", "71-43-2.json").status_code == 200
    assert static_areas.get_area_sub_file("feed", "by-cas", "50-00-0.json").status_code == 404
