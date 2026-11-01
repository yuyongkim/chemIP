"""Original-UNIFAC tables -> public/chemip/calc_vle_unifac_data.jsx (subgroups R, Q and main-group interaction a_mn [K]).

Source values are the published UNIFAC tables (Skjold-Joergensen 1979, Gmehling 1982, Macedo 1983, Tiegs 1987,
Hansen 1991, Wittig 2003). They are read from the MIT-licensed `thermo` package (0.6.1: thermo/unifac.py UFSG and
"Phase Change/UNIFAC original interaction parameters.tsv") and every value is cross-checked against the DDBST
"Published Parameters UNIFAC" page, which lists the same papers. Only main groups 1-51 are kept: groups 55, 84 and 85
on that page come from later work that is not in the cited list.

    python -I frontend/scripts/build_unifac_data.py <unpacked thermo wheel>/thermo <saved ddbst published-parameters-unifac.html>
"""
import html
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "chemip" / "calc_vle_unifac_data.jsx"
MAX_MAIN = 51


def read_thermo(thermo_dir):
    src = (thermo_dir / "unifac.py").read_text(encoding="utf-8")
    sub = {}
    pat = r'^UFSG\[(\d+)\] = UNIFAC_subgroup\((\d+), "([^"]+)", (\d+), "([^"]+)", ([0-9.]+), ([0-9.]+)'
    for m in re.finditer(pat, src, re.M):
        sub[int(m[1])] = {"name": m[3], "main": int(m[4]), "mainName": m[5], "R": float(m[6]), "Q": float(m[7])}
    ip = {}
    tsv = thermo_dir / "Phase Change" / "UNIFAC original interaction parameters.tsv"
    for line in tsv.read_text(encoding="utf-8").splitlines():
        a = line.split()
        if len(a) >= 3:
            ip[(int(a[0]), int(a[1]))] = float(a[2])
    return sub, ip


def read_ddbst(path):
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    toks = [x.strip() for x in html.unescape(re.sub(r"<[^>]+>", "\n", text)).split("\n") if x.strip()]
    ip, k = {}, toks.index("Aji") + 1
    while k + 3 < len(toks) and toks[k].isdigit() and toks[k + 1].isdigit():
        a, b = int(toks[k]), int(toks[k + 1])
        ip[(a, b)], ip[(b, a)] = float(toks[k + 2]), float(toks[k + 3])
        k += 4
    j = [n for n, x in enumerate(toks) if x.startswith("List of Sub Groups")][-1] + 7
    sub = {}
    while toks[j].isdigit() and re.fullmatch(r"\[\d+\].*", toks[j + 2]):
        sub[int(toks[j])] = (int(re.match(r"\[(\d+)\]", toks[j + 2])[1]), float(toks[j + 3]), float(toks[j + 4]))
        j += 5
    return sub, ip


def main():
    thermo_dir, ddbst = Path(sys.argv[1]), sys.argv[2]
    sub, ip = read_thermo(thermo_dir)
    dsub, dip = read_ddbst(ddbst)
    bad_ip = [p for p in set(ip) | set(dip) if p not in ip or p not in dip or abs(ip[p] - dip[p]) > 1e-9]
    bad_sub = [k for k in set(sub) | set(dsub) if k not in sub or k not in dsub
               or (sub[k]["main"], sub[k]["R"], sub[k]["Q"]) != dsub[k]]
    if bad_ip or bad_sub:
        raise SystemExit(f"cross-check failed: pairs {sorted(bad_ip)[:10]} subgroups {sorted(bad_sub)[:10]}")
    sub = {k: v for k, v in sub.items() if v["main"] <= MAX_MAIN}
    ip = {p: v for p, v in ip.items() if p[0] <= MAX_MAIN and p[1] <= MAX_MAIN}
    mains = {}
    for v in sub.values():
        mains.setdefault(v["main"], v["mainName"])
    lines = [
        "// 원 UNIFAC(Fredenslund 1975 형식) 매개변수 — 부그룹 R·Q 와 주그룹 사이 상호작용 a_mn [K]. React 없음(자료만).",
        "// 값: 출판된 표(Skjold-Jørgensen 1979; Gmehling 1982; Macedo 1983; Tiegs 1987; Hansen 1991; Wittig 2003) 그대로.",
        "//   thermo 0.6.1(MIT) 표에서 읽고 DDBST 'Published Parameters UNIFAC' 쪽과 값 하나하나 대조(차이 0). 주그룹 1–51 만.",
        "// 만든 곳: frontend/scripts/build_unifac_data.py — 손으로 고치지 않는다.",
        "// CALC_UNIFAC_SUBGROUPS: [부그룹 번호, 이름, 주그룹 번호, R, Q]. CALC_UNIFAC_A: [m, n, a_mn] (Ψ_mn = exp(−a_mn / T)).",
        f"const CALC_UNIFAC_MAIN = {json.dumps({k: mains[k] for k in sorted(mains)}, ensure_ascii=False)};",
        "const CALC_UNIFAC_SUBGROUPS = [",
    ]
    for k in sorted(sub):
        v = sub[k]
        lines.append(f"  [{k}, {json.dumps(v['name'])}, {v['main']}, {v['R']}, {v['Q']}],")
    lines.append("];")
    lines.append("const CALC_UNIFAC_A = [")
    pairs = sorted(ip)
    for i in range(0, len(pairs), 8):
        lines.append("  " + " ".join(f"[{a},{b},{ip[(a, b)]:g}]," for a, b in pairs[i:i + 8]))
    lines.append("];")
    lines.append("")
    lines.append("Object.assign(window, { CALC_UNIFAC_MAIN, CALC_UNIFAC_SUBGROUPS, CALC_UNIFAC_A });")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{OUT.name}: subgroups {len(sub)}, main groups {len(mains)}, pairs {len(ip)} (DDBST cross-check: 0 differences)")


if __name__ == "__main__":
    main()
