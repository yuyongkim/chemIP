# ChemIP — Chemical regulation, permit and trade-control lookup

[한국어](README.md) | **English**

Enter one substance name or CAS number and ChemIP collects, on one screen, its MSDS, every Korean statutory list it is on,
the permits and notifications those lists trigger, import/export obligations, destination-country regulations and HS codes,
and exports the result as a checklist (print, PDF, CSV).

- Service: https://chemip.yule.pics/chemip/ (free, no sign-up)
- License: AGPL-3.0
- Feedback and data-error reports: the in-app request board, or GitHub issues
- Not legal advice. Every item links to the statutory text it is based on; confirm with the original and the competent authority.

> As of 2026-10-25, the same baseline as the Korean README. Earlier versions are kept at `docs/_legacy_README.en_2026-03-15.md` and `docs/_legacy_README.en_2026-11-01.md`.

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
| Other | Korean handling sites (PRTR), domestic and overseas incidents, US EPA enforcement cases, patents (KIPRIS links), safety guides | Linked sources |

Quantity conditions (e.g. "≥ 1 t/year") are shown as text, not evaluated. The tool confirms whether a substance is listed and on what basis.

## Screens

| Screen | Content |
|---|---|
| Home | What the service does, how to use it, free and open-source notice, disclaimer |
| Substance search → substance detail | MSDS tab, with the regulation, permit and import/export tabs beside it |
| Request board | Feature requests, data errors, substance additions; admin mode (token) for status and replies |
| Data sources | Terms and attribution for each source |
| Research and development | Developer screens such as papers and benchmarks |

The live UI is no-build React (`frontend/public/chemip/*.jsx`); file roles are in `frontend/public/chemip/README.md`.

## Architecture

```
Browser → Cloudflare Tunnel → Next (127.0.0.1:7000; /chemip static UI + /api proxy) → FastAPI (127.0.0.1:7011)
```

| Path | Responsibility | Docs |
|---|---|---|
| `backend/api/routes/` | API routes (`/api/chemicals`, `/api/regulations`, `/api/integrations`, `/api/feedback`, `/api/usage`, …) | — |
| `backend/core/trade_controls/` | Per-substance regulation / permit / trade assembly | `README.md` |
| `backend/integrations/` | Sibling-project data (incidents, statute text, EPA enforcement, permit context) | `README.md` |
| `backend/feedback/`, `backend/usage/` | Request board, anonymous usage counts (no IP or browser data stored) | each `__init__.py` |
| `scripts/trade_controls/` | Collectors for Korean, control, HS and destination-country lists | subfolder `README.md` |
| `frontend/public/chemip/` | Live UI | `README.md` |
| `deploy/linux/` | Cloud VM migration kit (install, upload, systemd, tunnel, checks) | `README.md` |
| `scripts/search_bench/` | Patent full-text search benchmarks | `README.md` |
| `docs/public_release/` | Terms review and draft release procedure | — |

Collected data (`backend/data/trade_controls/`, `data/*.db`) is not committed, because of its size and terms of use; rebuild it with the collectors.

## Running it

### 1) Install

```bash
git clone https://github.com/yuyongkim/chemIP.git && cd chemIP
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Linux: .venv/bin/pip
cd frontend && npm ci
```

### 2) Environment variables

Copy `.env.example` to `.env` and fill in the keys. Main entries:

| Variable | Purpose |
|---|---|
| `KOSHA_SERVICE_KEY_DECODED` | data.go.kr MSDS, NCIS and related APIs (free key) |
| `KOSHA_MSDS_ROUTES` | Order of MSDS routes (`datagokr` alone uses only the route with confirmed terms) |
| `KIPRIS_API_KEY`, `KIPRIS_PUBLIC_DISPLAY`, `KIPRIS_IN_AI` | KIPRIS. Keep `KIPRIS_PUBLIC_DISPLAY=false` (links only) until the Korea Institute of Patent Information grants written permission |
| `KOTRA_API_KEY_DECODED`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | Trade news (Naver results are shown separately and excluded from AI input) |
| `CHEMIP_ADMIN_TOKEN` | Request-board admin mode |
| `RATE_LIMIT_*` | Per-address request limits (keyed on `CF-Connecting-IP` behind Cloudflare) |
| `BACKEND_ORIGIN` | Backend that the frontend forwards `/api` to (default `http://127.0.0.1:7011`) |

### 3) Run

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 7011
cd frontend && npm run dev          # http://localhost:7000/chemip/
```

With PM2 (how production runs): `start_all.bat` / `bash start_all.sh`. After startup, `scripts/check_runtime_health.py` checks both
the local services and the public domain (`python scripts/check_runtime_health.py --wait-seconds 60`).

Without collected data the regulation tab shows "자료 준비 중" (data pending). Patent indexes (140 GB) and the local LLM are optional; the app degrades gracefully.

### 4) Build the collected data

```bash
python -I scripts/trade_controls/kr_env/run_all.py              # Korean environmental laws
python -I scripts/trade_controls/kr_safety/run.py build          # Korean safety laws (run fetch first)
python -I scripts/trade_controls/kr_product/build_all.py         # Korean product and transport laws
python -m scripts.trade_controls.build_kr_rules                  # Import/export obligation rules
python -I scripts/trade_controls/collect_controlled_lists.py     # CWC, Australia Group, drug precursors
python -I scripts/trade_controls/collect_hs_codes.py             # HS codes
python -I scripts/trade_controls/collect_intl_lists.py           # Destination-country lists
python scripts/build_kr_permit_context.py                        # Integrated-permit context (needs Environment data)
```

Each collector reconciles against the source count and checks CAS check digits. Items that cannot be confirmed are kept separate.

### 5) Move to the cloud

Following `deploy/linux/README.md`, migration to an Ubuntu VM (ARM64 or x86_64) takes about 40 minutes. About 2.6 GB goes to the server;
the large patent index (140 GB) is left out, and the patent tab then works through KIPRIS links.

## Verification

```bash
.venv/Scripts/python -m pytest tests -q    # 119 tests
```

Browser QA (Playwright): 11 substances × 1440/390 px × light/dark, checking console errors, mojibake and overflow.

## Data terms

Terms for each source are on the in-app **자료 출처** (Data sources) screen and in `docs/public_release/compliance_v1.md`. In short:

- data.go.kr MSDS, NCIS, KISChem: no restriction on permitted use; attribution required
- KOTRA overseas market news and import regulations: KOGL Type 4; verbatim only, no summaries or translations
- KIPRIS Plus: written permission required for third-party display or processing of search results; links only until granted
- Naver search: labelled separately as Naver search results; never stored or fed to AI
- ECHA: prior permission required for bulk reuse of the database; alternatives under review

## Contributing

Requests come through the in-app request board or GitHub issues. Code rules are in `CLAUDE.md` (one responsibility per file, each value defined once, text in data files) and `CONTRIBUTING.md`.

## References

- `docs/RUNBOOK.md` — operations
- `PORT_REGISTRY.md` — ports
- `deploy/linux/README.md` — cloud migration
- `docs/public_release/` — release procedure and terms of use
- `README.md` — 한국어
