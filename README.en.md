# ChemIP — Chemical regulation, permit and trade-control lookup for SMEs

Enter one substance name or CAS number and ChemIP collects, on one screen, its MSDS, every Korean statutory list it is on,
the permits and notifications those lists trigger, import/export obligations, destination-country regulations and HS codes,
and exports the result as a checklist (print, PDF, CSV). It is built for small and medium-sized enterprises that have no
in-house regulatory staff.

- Service: https://chemip.yule.pics/chemip/ (free, no sign-up)
- License: AGPL-3.0
- Feedback and data-error reports: the in-app request board, or GitHub issues
- Not legal advice. Every item links to the statutory text it is based on; confirm with the original and the competent authority.

> As of 2026-10-25. The previous README is kept at `docs/_legacy_README.en_2026-03-15.md`.

## Coverage

| Item | Content | Source |
|---|---|---|
| MSDS | 16 sections | KOSHA MSDS OpenAPI via data.go.kr |
| Korean statutory lists | 52 lists under 23 laws (10,094 entries): chemical control, K-REACH, occupational safety, air, water, soil, waste, odour, PRTR, hazardous materials, high-pressure gas, serious accidents, consumer chemical products, cosmetics, pesticides, RoHS, children's products, dangerous goods by sea | Current statutes and notices on law.go.kr |
| Permits and notifications | 56 items with conditions, authority and quoted statutory text | Same statutes |
| Real permit context | Number of integrated-permit sites with an emission limit for the substance, limit distribution, permit processing time (median 46 days) | IEPS permit review reports, CleanSYS |
| Import/export obligations | 19 rules, customs-confirmation flag | Korean chemical laws, Korea Customs notice |
| Control lists | CWC Schedules 1–3, Australia Group (1C350), drug precursors | OPCW, Korean strategic-goods notice, INCB |
| Destination-country lists | 51 lists: EU, US, CN, JP, CA, GB, CH, AU, TW, TR, SA, SG | Official lists (ECHA CHEM, EPA, MEE, METI, ECCC, HSE, …) |
| HS codes | 104,087 CAS → HS6, Korean HSK10 candidates | EU ECICS, Korea Customs Service |

Quantity conditions (e.g. "≥ 1 t/year") are shown as text, not evaluated.

## Architecture

```
Browser → Cloudflare Tunnel → Next (127.0.0.1:7000; /chemip static UI + /api proxy) → FastAPI (127.0.0.1:7011)
```

| Path | Responsibility |
|---|---|
| `backend/core/trade_controls/` | Per-substance regulation / permit / trade assembly |
| `backend/integrations/` | Sibling-project data (incidents, statute text, EPA enforcement, permit context) |
| `backend/feedback/`, `backend/usage/` | Request board, anonymous usage counts (no IP or browser data stored) |
| `scripts/trade_controls/` | Collectors for Korean, control, HS and destination-country lists |
| `frontend/public/chemip/` | Live UI (no-build React); file roles in its `README.md` |
| `deploy/linux/` | Cloud VM migration kit |
| `scripts/search_bench/` | Patent full-text search benchmarks |

Collected data (`backend/data/trade_controls/`, `data/*.db`) is not committed; rebuild it with the collectors.

## Quick start (reviewer / demo)

```bash
git clone https://github.com/yuyongkim/chemIP.git && cd chemIP
python -m venv .venv && .venv/bin/pip install -r requirements.txt
cd frontend && npm ci && cd ..
cp .env.example .env        # fill KOSHA_SERVICE_KEY_DECODED (free at data.go.kr)
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 7011 &
cd frontend && npm run dev   # http://localhost:7000/chemip/
```

Without collected data the regulation tab shows "자료 준비 중" (data pending); build it with the commands in the Korean
README, section "수집 자료 만들기". Patent indexes (140 GB) and the local LLM are optional; the app degrades gracefully.

## Verification

```bash
.venv/bin/python -m pytest tests -q    # 119 tests
```

Browser QA (Playwright): 11 substances × 1440/390 px × light/dark, checking console errors, mojibake and overflow.

## Data terms

See the in-app "자료 출처" page and `docs/public_release/compliance_v1.md`. In short: data.go.kr MSDS/NCIS are unrestricted
with attribution; KOTRA news/import-regulation data is KOGL Type 4 (verbatim only); KIPRIS Plus requires written permission
for third-party display (link-only until granted, `KIPRIS_PUBLIC_DISPLAY=false`); Naver results are shown separately and never
stored or fed to AI; ECHA bulk reuse requires permission (alternatives under review).

## References

- `README.md` (Korean, primary)
- `docs/RUNBOOK.md`, `PORT_REGISTRY.md`, `deploy/linux/README.md`, `docs/public_release/`
