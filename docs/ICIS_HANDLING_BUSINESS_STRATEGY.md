# ICIS Handling-Site Data And Business Strategy

Date: 2026-05-13

## Why This Document Exists

The project started with a narrow question: can ChemIP show companies that handle or release a given MSDS substance?

The answer is yes, but the better product direction is broader. ICIS/MCEE and PRTR data expose a very large universe of Korean chemical-handling businesses. Showing a raw company list is not enough. The useful product is a compliance, safety, and sales-intelligence layer that tells users which businesses matter, what risks they carry, and what actions they should take.

This document records the current findings, decisions, and product expansion ideas so they do not get lost in chat history.

## Current Working Data Sources

### 1. PRTR Release And Transfer Data

Source pages:

- `https://icis.mcee.go.kr/prtr/prtrInfo/unitySearch.do`
- `https://icis.mcee.go.kr/prtr/prtrInfo/mttrSearch.do`
- `https://icis.mcee.go.kr/prtr/prtrInfo/entrpsSearch.do`
- `https://icis.mcee.go.kr/prtr/infoYard/openApi.do`

Official PRTR OpenAPI shown by the portal:

- `http://icis.me.go.kr/openapi/service/prtr/getPrtrList?accessKey=...&searchYear=...`
- `http://icis.me.go.kr/openapi/service/prtr/getPrtrMttrList?accessKey=...&searchYear=...`

Current status:

- PRTR access key is approved.
- The old `icis.me.go.kr` URL redirects to `icis.mcee.go.kr`.
- The redirected `/openapi/service/prtr/...` path currently returns 404.
- The official key is valid, but the official endpoint appears broken after the MCEE migration.
- The web portal Excel endpoints still work and are usable.

Useful web endpoints:

- `POST /prtr/prtrInfo/unitySearchDown.do`
- `POST /prtr/prtrInfo/mttrSearchDown.do`
- `POST /prtr/prtrInfo/entrpsSearchDown.do`
- `POST /prtr/selectMttrListPopup.do`

Current local implementation:

- `scripts/backfill_prtr_facilities.py`
- `scripts/load_prtr_aggregate_workbook.py`
- `backend/api/handlers_adapter.py`
- Local cache: `data/prtr/prtr_facilities.sqlite`

Important constraint:

- Do not modify `data/terminology.db`.
- All PRTR/ICIS backfills should remain under `data/prtr/`.

### 2. ICIS Chemical Statistics / Handling Company Data

Source page:

- `https://icis.mcee.go.kr/search/searchType6.do`

Key JSON endpoints:

- `POST /iprtr/cdrInfoListJson.do`
- `POST /iprtr/cdrInfoLisByCountCompanyJson.do`
- `POST /search/searchType6CodeListJson.do`
- `POST /iprtr/cdrInfoExcelDown.do`

Why this matters:

- This data is closer to "chemical-handling companies" than PRTR release data.
- PRTR answers: who reports releases/transfers.
- ICIS statistics answer: who handles/reports the chemical in the statistical survey.

Observed example:

- Substance: Toluene, CAS `108-88-3`
- Year: 2022
- PRTR release/transfer company rows: about `623`
- ICIS handling/statistics company rows: about `7,415`

Example request pattern:

```text
POST https://icis.mcee.go.kr/iprtr/cdrInfoListJson.do
searchYear=2022
searchType=mttrCasNo
searchWord=108-88-3
pageNo=1
```

Then company list:

```text
POST https://icis.mcee.go.kr/iprtr/cdrInfoLisByCountCompanyJson.do
searchYear=2022
casNo=108-88-3
searchAdres1=
searchAdres2=
pageNo=1
```

Returned fields include:

- `bplcId`
- `bplcNm`
- `locplcAdres`
- `induty`
- `casNo`
- `matterNm`
- `ctprvnCdRmate`
- `signguCdRmate`
- `totalCount`

Product implication:

- This should become the main source for "handling companies".
- PRTR should become the source for "release/transfer signal".

### 3. Chemical Accident Data

Source page:

- `https://icis.mcee.go.kr/search/searchType2.do`

Visible JSON endpoints:

- `POST /search/searchListTypeJson2.do`
- `POST /search/searchListType2StatAJson.do`
- `POST /search/searchListType2StatBJson.do`
- `POST /search/searchListType2StatCJson.do`
- `POST /search/searchListType2StatDJson.do`
- `POST /search/searchListType2StatEJson.do`
- `POST /search/searchListType2StatFJson.do`
- `POST /search/searchListType2StatGJson.do`
- `POST /search/searchListType2StatHJson.do`
- `POST /search/searchType2Excel.do`

Current project also has a data.go.kr chemical accident adapter path through `HandlingSiteAdapter`.

Use:

- Link handling companies to accident history.
- Score businesses with accident records higher for safety/compliance outreach.
- Generate incident examples for MSDS training and emergency response content.

### 4. Offsite Pipeline Data

Source page:

- `https://icis.mcee.go.kr/pipe/qrpipingInfo.do`

Useful JSON endpoints:

- `GET /pipe/QrPipingMapData.do`
- `GET /pipe/QrPipingStats.do`
- `POST /pipe/QrPipingList.do`

Observed data:

- `/pipe/QrPipingMapData.do` returned about `2,070` public map points.
- Fields include company name, latitude, longitude, management code, and section name.
- `/pipe/QrPipingStats.do` returns material/statistical summaries such as pipeline material Top 10.

Use:

- Add facility-geography and infrastructure-risk signals.
- Identify high-value industrial facility targets.
- Enrich company profiles where chemical handling intersects with offsite pipeline exposure.

### 5. Chemical Classification And Hazard Guide Data

Source pages:

- `https://icis.mcee.go.kr/chmClsCl/chmClsClList.do`
- `https://icis.mcee.go.kr/toxicSNG/toxicsngInfoList.do`
- `https://icis.mcee.go.kr/search/searchType1.do`

Visible JSON endpoints:

- `POST /chmClsCl/chmClsClListJson.do`
- `POST /toxicSNG/selectToxicsngInfoList.do`
- `POST /chmCls/chmClsListJson.do`

Notes:

- `chmClsClListJson.do` and `toxicSNG/selectToxicsngInfoList.do` respond as public JSON.
- `chmCls/chmClsListJson.do` may require correct session/menu context or parameters; direct test returned HTML in one run.
- These sources can enrich hazard/regulatory labels.

Use:

- Substance master enrichment.
- Hazard group and regulatory guide overlays.
- Better risk scoring for companies handling high-risk substances.

## Crawling Strategy

### Do Not Full-Crawl Everything First

The ICIS handling-company dataset is large.

Observed scale:

- Material-level statistics list: about `4,200` substances.
- One common substance like toluene can have `7,415` handling companies.
- Full material-to-company expansion could become hundreds of thousands to over one million rows.

Full crawling is possible but should not be the first move.

### Recommended Phases

#### Phase 1: Material Index Backfill

Backfill only:

- CAS
- substance name
- reporting/handling company count
- year

Source:

- `/iprtr/cdrInfoListJson.do`

Value:

- Search can know whether a substance has handling-company data.
- We can show company counts immediately.
- Small and cheap to cache.

#### Phase 2: On-Demand Company Fetch

When a user opens a chemical detail page:

- Query `/iprtr/cdrInfoLisByCountCompanyJson.do`
- Fetch only page 1 first.
- Show top or first 10 companies.
- Cache the result.

If the user clicks "load more":

- Fetch page 2, page 3, etc.
- Continue caching.

#### Phase 3: Lazy Backfill By Demand

Track which substances are viewed most.

Backfill all company pages only for:

- frequently searched substances
- high-risk substances
- substances appearing in customer accounts
- substances with high company count

#### Phase 4: Full Backfill, Only If Needed

Run slow overnight jobs with:

- 0.2 to 0.5 second delay
- retry with backoff
- fetched marker table
- resume support
- `--limit`
- `--force`
- `--year`

Never write this into `data/terminology.db`.

## Product Direction

The raw question "which companies handle this chemical?" is not enough. For common chemicals, there are too many companies. Toluene alone has thousands.

The better question is:

> Among all companies handling this chemical, which companies are most likely to need compliance, safety, training, document, or consulting help right now?

## Things To Sell

### 1. Site Chemical Compliance Gap Report

Target:

- small and medium manufacturers
- paint/coating users
- plastics/rubber plants
- metal surface treatment
- electronics and automotive suppliers
- distributors and warehouses

Input:

- company name
- address
- or handling-company record from ICIS

Output:

- likely handled substances
- high-risk substances
- MSDS checklist
- Korean regulatory flags
- accident-prevention checklist
- required worker training topics
- storage/labeling checklist
- emergency-response summary
- PDF report

Why buyers care:

- They do not need another chemical search engine.
- They need to know what they must prepare before inspection, audit, customer review, or incident.

### 2. Business Lead Scoring For Safety/Compliance Sales

Use the data to rank companies.

Signals:

- number of handled substances
- high-risk substances
- PRTR release/transfer amount
- accident history
- offsite pipeline exposure
- hazardous substance guide matches
- industry type
- region/industrial complex
- company count and density by substance

Output:

- prioritized company list
- target substance list
- reason for outreach
- suggested sales pitch

Example:

```text
Company: Example Chemical Co.
Handled substances: toluene, xylene, MEK
Risk flags: volatile organic solvents, PRTR release signal
Recommended offer: MSDS audit + worker solvent safety training + storage labeling review
```

### 3. MSDS-Based Worker Training Kit

For each company/substance:

- 1-page worker summary
- PPE checklist
- fire/leak response
- first-aid instructions
- storage incompatibility notes
- quiz or attendance sheet

This is easier to sell than raw data because it becomes an immediately usable document.

### 4. Inspection Readiness Checklist

For a selected company:

- what documents should exist
- what labels/signs should be present
- what training records are needed
- which substances deserve extra attention
- which accidents/regulations are relevant

Possible product packaging:

- one-time PDF report
- monthly monitoring
- consultant lead generation
- document generation subscription

### 5. Company Profile Page

Each company can have a profile:

- company name
- address
- industry
- handled substances from ICIS
- PRTR release/transfer substances
- accident history
- pipeline/geographic signals
- risk score
- recommended actions

This turns the dataset into a sales and compliance intelligence product.

## Recommended MVP

Build:

> Business Chemical Safety Risk Report

Inputs:

- CAS or chemical name
- company name or selected company from ICIS

Output sections:

1. Company identity
2. Handled substances
3. High-risk substances
4. PRTR release/transfer signal
5. Accident history
6. Required MSDS/training checklist
7. Recommended next actions
8. PDF export

Pricing ideas:

- free: chemical/company lookup with limited rows
- paid one-off: 30,000 to 100,000 KRW per PDF report
- subscription: 90,000 to 290,000 KRW/month per business account
- B2B referral: lead sale or commission to safety consultants/document agencies

## Data Model Ideas

Use separate PRTR/ICIS database tables under `data/prtr/`.

Candidate tables:

```text
icis_cdr_materials
- year
- cas_no
- cas_key
- material_name
- company_count
- fetched_at

icis_cdr_companies
- year
- cas_no
- cas_key
- material_name
- bplc_id
- company_name
- address
- region
- city
- industry
- page_no
- row_no
- fetched_at

icis_pipeline_points
- mng_cd
- company_name
- latitude
- longitude
- section_name
- region_code
- fetched_at

company_risk_scores
- company_key
- score
- reasons_json
- updated_at
```

## Scoring Ideas

Company score can combine:

- high-risk substance count
- PRTR release/transfer amount
- accident history count
- offsite pipeline match
- carcinogenic substance match
- number of handled substances
- industry risk weight
- regional industrial-complex concentration

Example scoring:

```text
score =
  high_risk_substance_count * 20
  + accident_history_count * 25
  + prtr_reported_total_bucket * 15
  + pipeline_match * 10
  + handled_substance_count_bucket * 10
```

The score should always include human-readable reasons.

## Immediate Next Steps

1. Add an ICIS CDR adapter for `searchType6`.
2. Add a material-index loader for `/iprtr/cdrInfoListJson.do`.
3. Add on-demand company fetch for `/iprtr/cdrInfoLisByCountCompanyJson.do`.
4. Cache results in `data/prtr/prtr_facilities.sqlite`.
5. Update the chemical detail page:
   - show `Handling companies from ICIS statistics`
   - keep `PRTR release/transfer Top 10`
   - show company count separately
6. Add a company profile route:
   - `/api/companies/search?name=...`
   - `/api/companies/{company_id}/risk-profile`
7. Add a PDF report prototype.

## Decision Summary

- PRTR remains useful, but mainly for release/transfer signal.
- ICIS `searchType6` is the better source for handling-company lists.
- Raw Top 10 is not enough for common chemicals.
- The product should move toward company risk profiling and compliance report generation.
- The likely sellable item is not data access; it is action: checklist, report, training, and inspection readiness.

