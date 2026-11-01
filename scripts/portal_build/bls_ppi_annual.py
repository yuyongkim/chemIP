"""US BLS Producer Price Index annual averages -> frontend/public/chemip/calc_economics_ppi.jsx (data only).

Used by the economics calculator (calc_economics.jsx) as an optional, public-domain alternative to the
paywalled CEPCI. BLS states that everything it publishes is in the public domain
(https://www.bls.gov/opub/copyright-information.htm); cite "U.S. Bureau of Labor Statistics".

    python scripts/portal_build/bls_ppi_annual.py [--start 2005] [--end 2025]

Uses the public BLS API v2 without a key (10 years per request, 25 requests/day). Only full-year
annual averages (period M13) are kept. No CEPCI values are written anywhere.
"""
import argparse
import datetime as dt
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend" / "public" / "chemip" / "calc_economics_ppi.jsx"
API = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

# series id -> (Korean label, English label as BLS titles it, base date as BLS lists it)
SERIES = {
    "WPU114": ("기계·장비 — 일반 기계·장비 (상품)", "Machinery and equipment — general purpose machinery and equipment (commodity)", "1982=100"),
    "PCU332410332410": ("보일러·열교환기 제조", "Power boiler and heat exchanger mfg", "Dec 2003=100"),
    "PCU332420332420": ("금속 탱크(후판) 제조", "Metal tanks, heavy gauge, mfg", "Dec 2003=100"),
    "PCU333912333912": ("공기·가스 압축기 제조", "Air and gas compressor mfg", "Jun 1984=100"),
    "PCU333914333914": ("계량·분배·기타 펌프 장비 제조", "Measuring, dispensing, and other pumping equipment mfg", "Dec 1983=100"),
}


def fetch(start, end):
    body = json.dumps({"seriesid": list(SERIES), "startyear": str(start), "endyear": str(end), "annualaverage": True}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    if data.get("status") != "REQUEST_SUCCEEDED":
        raise SystemExit(f"BLS API: {data.get('status')} {data.get('message')}")
    out = {}
    for s in data["Results"]["series"]:
        out[s["seriesID"]] = {int(x["year"]): float(x["value"]) for x in s["data"] if x["period"] == "M13"}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=2005)
    ap.add_argument("--end", type=int, default=dt.date.today().year - 1)
    a = ap.parse_args()
    values = {k: {} for k in SERIES}
    for y0 in range(a.start, a.end + 1, 10):
        for k, v in fetch(y0, min(y0 + 9, a.end)).items():
            values[k].update(v)
    lines = [
        "// 데이터만 — 미국 노동통계국(BLS) 생산자물가지수(PPI) 연평균. 공학 계산기 경제성(calc_economics.jsx)의 선택 지수.",
        "// BLS 자료는 공공 영역(public domain, https://www.bls.gov/opub/copyright-information.htm), 출처 표시: U.S. Bureau of Labor Statistics.",
        "// 만든 스크립트: scripts/portal_build/bls_ppi_annual.py (BLS API v2, 연평균 M13). 손으로 고치지 않는다. CEPCI 값은 싣지 않는다(유료).",
        f"// 받은 날: {dt.date.today().isoformat()}",
        "",
        "const CALC_PPI_SERIES = [",
    ]
    for sid, (ko, en, base) in SERIES.items():
        years = values[sid]
        if not years:
            continue
        pts = ", ".join(f"{y}: {years[y]:g}" for y in sorted(years))
        lines.append(f'  {{ id: "{sid}", label: tr("{ko}", "{en}"), base: "{base}", values: {{ {pts} }} }},')
    lines += [
        "];",
        "",
        f'const CALC_PPI_META = {{ fetched: "{dt.date.today().isoformat()}", url: "https://data.bls.gov/timeseries/" }};',
        "",
        "Object.assign(window, { CALC_PPI_SERIES, CALC_PPI_META });",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT} ({sum(len(v) for v in values.values())} values)")


if __name__ == "__main__":
    main()
