"""Build the small Korean 시도 (17 regions) TopoJSON used by the PRTR facility map, as a frontend data module.

Input  : geoBoundaries gbOpen KOR ADM1 GeoJSON (boundarySource "Natural Earth", boundaryLicense "Public Domain"),
         pinned release https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/KOR/ADM1/geoBoundaries-KOR-ADM1.geojson
         Download it yourself into an empty folder and pass the path; this script makes no network calls.
Output : frontend/public/chemip/prtr_map_geo.jsx  (const PRTR_GEO_TOPO, PRTR_GEO_SOURCE) — generated, do not edit by hand.

Steps (no third-party packages): drop islands smaller than --min-area-km2 (each region keeps its largest part),
quantize, cut rings into arcs at shared-border junctions so neighbours share one arc, Douglas-Peucker simplify every arc
once (shared borders stay identical, no slivers), orient rings for d3-geo (exterior clockwise), delta-encode arcs.

  python -I -B scripts/geo/build_kr_sido_topo.py <geoBoundaries-KOR-ADM1.geojson> [--tolerance 6] [--min-area-km2 25]
"""
from __future__ import annotations

import argparse
import json
import math
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "public", "chemip", "prtr_map_geo.jsx")
SOURCE = {
    "name": "geoBoundaries gbOpen KOR ADM1 (Natural Earth)",
    "url": "https://www.geoboundaries.org/",
    "data_url": "https://github.com/wmgeolab/geoBoundaries/tree/9469f09/releaseData/gbOpen/KOR/ADM1",
    "license": "Public Domain",
    "license_url": "https://www.naturalearthdata.com/about/terms-of-use/",
}
QUANT = 10000


def ring_area(r):  # planar shoelace on (x, y); > 0 = counter-clockwise with y up
    return sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1)) / 2


def km2(area_deg2, lat):
    return abs(area_deg2) * 111.32 * 111.32 * math.cos(math.radians(lat))


def polygons_of(geom):
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


def keep_parts(polys, min_km2):
    sized = [(km2(ring_area(p[0]), p[0][0][1]), p) for p in polys]
    biggest = max(s for s, _ in sized)
    return [p for s, p in sized if s >= min_km2 or s == biggest]


def quantizer(features):
    xs = [pt[0] for f in features for poly in f["polys"] for ring in poly for pt in ring]
    ys = [pt[1] for f in features for poly in f["polys"] for ring in poly for pt in ring]
    x0, y0 = min(xs), min(ys)
    sx, sy = (max(xs) - x0) / (QUANT - 1), (max(ys) - y0) / (QUANT - 1)
    return (x0, y0, sx, sy), lambda pt: (round((pt[0] - x0) / sx), round((pt[1] - y0) / sy))


def clean_ring(ring, q):
    out = []
    for pt in ring:
        p = q(pt)
        if not out or out[-1] != p:
            out.append(p)
    if out[0] != out[-1]:
        out.append(out[0])
    return out if len(out) >= 4 else None


def orient(ring, exterior):
    a = ring_area(ring)
    return ring[::-1] if (exterior and a > 0) or (not exterior and a < 0) else ring


def edge(a, b):
    return (a, b) if a <= b else (b, a)


def cut_arcs(rings):
    """rings: {rid: closed ring} → {rid: [open point lists that chain into the ring]}."""
    owners = {}
    for rid, r in rings.items():
        for i in range(len(r) - 1):
            owners.setdefault(edge(r[i], r[i + 1]), set()).add(rid)
    pieces = {}
    for rid, r in rings.items():
        pts = r[:-1]
        n = len(pts)
        sig = [frozenset(owners[edge(pts[i], pts[(i + 1) % n])]) for i in range(n)]
        cuts = [i for i in range(n) if sig[i - 1] != sig[i]]
        if not cuts:
            pieces[rid] = [None]  # whole ring, canonicalised later
            continue
        start = cuts[0]
        rot = pts[start:] + pts[:start]
        cut_set = {(c - start) % n for c in cuts}
        arcs, cur = [], [rot[0]]
        for i in range(1, n):
            cur.append(rot[i])
            if i in cut_set:
                arcs.append(cur)
                cur = [rot[i]]
        cur.append(rot[0])
        arcs.append(cur)
        pieces[rid] = arcs
    return pieces


def canonical_ring(r):
    pts = r[:-1]
    i = pts.index(min(pts))
    return pts[i:] + pts[:i] + [pts[i]]


def dp(points, tol):
    if len(points) <= 2:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = points[a], points[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, at = -1.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            d = math.hypot(px - ax, py - ay) if norm == 0 else abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, at = d, i
        if best > tol:
            keep[at] = True
            stack += [(a, at), (at, b)]
    return [p for p, k in zip(points, keep) if k]


def simplify(arc, tol, closed):
    if not closed:
        return dp(arc, tol)
    far = max(range(len(arc)), key=lambda i: (arc[i][0] - arc[0][0]) ** 2 + (arc[i][1] - arc[0][1]) ** 2)
    out = dp(arc[: far + 1], tol)[:-1] + dp(arc[far:], tol)
    return out if len(out) >= 4 else arc


def build(geojson, tol, min_km2):
    feats = []
    for f in geojson["features"]:
        polys = keep_parts(polygons_of(f["geometry"]), min_km2)
        feats.append({"id": f["properties"]["shapeISO"], "name": f["properties"]["shapeName"], "polys": polys})
    transform, q = quantizer(feats)
    rings, layout = {}, []
    for f in feats:
        fpolys = []
        for poly in f["polys"]:
            rids = []
            for k, ring in enumerate(poly):
                r = clean_ring(ring, q)
                if r is None:
                    continue
                rid = len(rings)
                rings[rid] = orient(r, exterior=(k == 0))
                rids.append(rid)
            if rids:
                fpolys.append(rids)
        layout.append(fpolys)
    pieces = cut_arcs(rings)
    arcs, index = [], {}

    def arc_id(pts, closed):
        key = tuple(pts)
        if key in index:
            return index[key]
        rkey = tuple(reversed(pts))
        if rkey in index:
            return ~index[rkey]
        if closed:  # a whole ring shared as it is (enclave): match any rotation / direction
            fwd, back = tuple(canonical_ring(pts)), tuple(canonical_ring(pts[::-1]))
            if fwd in index:
                return index[fwd]
            if back in index:
                return ~index[back]
            key, pts = fwd, list(fwd)
        index[key] = len(arcs)
        arcs.append(simplify(pts, tol, closed))
        return index[key]

    geometries = []
    for f, fpolys in zip(feats, layout):
        polys = []
        for rids in fpolys:
            polys.append([[arc_id(rings[rid], True)] if pieces[rid] == [None] else [arc_id(a, False) for a in pieces[rid]]
                          for rid in rids])
        geom = {"type": "Polygon", "arcs": polys[0]} if len(polys) == 1 else {"type": "MultiPolygon", "arcs": polys}
        geometries.append({**geom, "id": f["id"], "properties": {"name": f["name"]}})
    x0, y0, sx, sy = transform
    delta = []
    for a in arcs:
        px = py = 0
        d = []
        for x, y in a:
            d.append([x - px, y - py])
            px, py = x, y
        delta.append(d)
    return {
        "type": "Topology",
        "transform": {"scale": [round(sx, 9), round(sy, 9)], "translate": [round(x0, 6), round(y0, 6)]},
        "objects": {"sido": {"type": "GeometryCollection", "geometries": sorted(geometries, key=lambda g: g["id"])}},
        "arcs": delta,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("geojson")
    ap.add_argument("--tolerance", type=float, default=6.0, help="Douglas-Peucker tolerance in quantized units (1 ≈ 75 m)")
    ap.add_argument("--min-area-km2", type=float, default=25.0)
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    with open(args.geojson, encoding="utf-8") as fh:
        topo = build(json.load(fh), args.tolerance, args.min_area_km2)
    body = json.dumps(topo, separators=(",", ":"))
    src = json.dumps(SOURCE, ensure_ascii=False)
    text = (
        "// Korean first-level regions (17 시도) for the PRTR facility map — GENERATED by scripts/geo/build_kr_sido_topo.py, do not edit.\n"
        f"// Source: {SOURCE['name']}, {SOURCE['data_url']} — {SOURCE['license']} ({SOURCE['license_url']}).\n"
        f"// Simplified: tolerance {args.tolerance} (quantized 1e4), islands under {args.min_area_km2} km2 dropped. Feature id = ISO 3166-2:KR.\n"
        f"const PRTR_GEO_SOURCE = {src};\n"
        f"const PRTR_GEO_TOPO = {body};\n\n"
        "Object.assign(window, { PRTR_GEO_SOURCE, PRTR_GEO_TOPO });\n"
    )
    with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    pts = sum(len(a) for a in topo["arcs"])
    print(f"wrote {os.path.normpath(args.out)}: {len(text)} bytes, {len(topo['arcs'])} arcs, {pts} points")


if __name__ == "__main__":
    main()
