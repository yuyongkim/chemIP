# 화학사고 소식(포털 서비스 9) v1 — 자료원·DB·정적 파일·화면·Worker 정기 갱신

작성 2026-10-31. `PORTAL_SERVICES_v1.md` 3장 9번 "화학사고 소식 모음"의 구현 기록이다.
화면: `?view=feed`(통합 검색 "화학사고 소식" 묶음으로 연다). 정적 파일 형식: `scripts/static_export/CONTRACT.md` "feed/".

## 1. 자료원과 라이선스

| source_id | 자료 | 건수(2026-10-31) | 라이선스 | 보이는 것 |
|---|---|---|---|---|
| `chemeng_rmp` | 미국 EPA RMP 5년 사고 이력(Data Liberation Project FOIA 공개본) — Chem_Eng `incidents.db` | 7,291 | 공공 영역(17 U.S.C. 105) | 제목·날짜·장소 나라·설비·물질(요약 없음: 원본이 정형 칸뿐) |
| `chemeng_emars` | 유럽 eMARS(JRC MAHB / EEA) | 1,254 | CC BY 4.0 — "Source: eMARS, European Commission JRC / EEA" 표기 | 제목·날짜·요약·설비·물질, 나라는 장소 글에 적힌 경우만 |
| `chemeng_nics` | 화학물질안전원 화학사고 정보(data.go.kr 파일 15069200) | 1,142 | data.go.kr 이용허락범위 제한 없음 | 제목·날짜·요약·물질 |
| `chemeng_kosha` | KOSHA 국내재해사례(data.go.kr OpenAPI 15121001, 공정안전 부분) | 528 | data.go.kr 이용허락범위 제한 없음 | 제목·요약, 날짜는 요약 첫머리("2025.11.00")에서(일이 가려진 경우 연-월) |
| `chemeng_csb` | 미국 CSB 조사 보고 | 139 | 공공 영역 | 제목·날짜·요약·설비·물질 |
| `csb_rss` | CSB "All News" RSS `https://www.csb.gov/rss/news.aspx` | 20(쌓이며 최신 60건 유지) | 공공 영역 | 제목·날짜·짧은 설명·링크 |
| `press_gnews` | Google News RSS 검색("화학사고", "화학물질 누출", "chemical plant explosion", "chemical leak") | 244(최근 120일) | 기사는 각 언론사 소유 — **제목·링크·날짜만**, 본문·이미지 저장 안 함 | 제목·링크(제목에 물질 이름이 있으면 CAS 표시) |

- Chem_Eng 출처의 이름·주소·라이선스 글은 `incidents.db` `source` 표를 그대로 옮긴다(물질 화면 사고 사례 패널과 같은 표기).
- NICS(화학물질안전원)는 사이트(nics.me.go.kr·icis.me.go.kr)를 긁지 않는다: robots.txt 가 일반 수집기를 막고, 같은 자료가
  data.go.kr 파일(제한 없음)로 이미 Chem_Eng DB 에 있다(제목·요약만 사용).
- 모든 출처는 `portal_facts.db` `sources` 표에 이름·주소·라이선스로 남고, 화면 아래 "출처와 이용 조건"에 그대로 보인다.

## 2. DB — `portal_facts.db` `feed_items`

```sql
CREATE TABLE IF NOT EXISTS feed_items (
  id TEXT PRIMARY KEY,                    -- "<source_id>:<그 출처 안의 id>"
  date TEXT,                              -- YYYY-MM-DD | YYYY-MM | YYYY | "" (1900~오늘만, 그 밖은 "")
  title TEXT NOT NULL, url TEXT, source_id TEXT NOT NULL,
  cas TEXT NOT NULL DEFAULT '[]', chem_names TEXT NOT NULL DEFAULT '[]',     -- JSON 배열(같은 순서)
  equipment TEXT NOT NULL DEFAULT '[]', discipline TEXT NOT NULL DEFAULT '[]', -- 설비 토큰 / EPC 설계 분야 key
  country TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', lang TEXT NOT NULL DEFAULT '', fetched_at TEXT);
CREATE INDEX IF NOT EXISTS feed_items_date ON feed_items (date);
CREATE INDEX IF NOT EXISTS feed_items_source ON feed_items (source_id);
```

- Chem_Eng 출처는 실행마다 자기 source_id 행을 통째로 바꾼다(스냅숏). 실시간 출처(`csb_rss`·`press_gnews`)는 쌓는다:
  새 행은 덮어쓰고, `csb_rss` 는 최신 60건, `press_gnews` 는 120일 지난 행을 지운다. 네트워크가 안 되면 이전 행이 그대로 남는다.
- 설계 분야는 `backend/integrations/equipment_disciplines.py`(사고 사례 패널과 같은 표). 보도 제목의 물질은 Chem_Eng `chemical`
  표 이름(한글은 다른 글자 속이 아닐 때만, 영문은 낱말 단위)으로 찾는다.

## 3. 만드는 과정

```
python -I -B G:\MSDS\scripts\portal_build\incident_feed.py            # [--offline] [--no-press]  약 10초
python -I -B G:\MSDS\scripts\static_export\run_all.py --steps feed     # → E:\dev-cache\chemip-static\out\v1\feed\ (1초)
del E:\dev-cache\chemip-static\out\reports\r2_s3_uploaded_v1_feed.txt  # 다시 올릴 때: 이어 올리기 기록을 지워야 바뀐 파일이 올라간다
E:/dev-cache/r2-venv/Scripts/python -B G:\MSDS\scripts\static_export\upload_r2_s3.py --src E:\dev-cache\chemip-static\out\v1\feed --prefix v1/feed --gzip-all
```

| 파일 | 맡는 일 |
|---|---|
| `scripts/portal_build/feed_config.py` | 자료원·라이선스·RSS 주소·보도 검색어·보관 기간·내보내기 개수, `feed_items` 스키마(값만) |
| `scripts/portal_build/feed_parse.py` | 순수 함수: 글자 정리·날짜 검사·KOSHA 날짜·eMARS 나라·RSS 읽기(DTD 거부)·물질 이름 찾기(`NameTagger`) |
| `scripts/portal_build/feed_chemeng.py` | Chem_Eng `incidents.db`(읽기 전용) → 소식 행·출처 행·이름 사전 |
| `scripts/portal_build/feed_fetch.py` | CSB RSS·Google News RSS 받기(재시도·크기 제한) → 소식 행 |
| `scripts/portal_build/feed_db.py` | `feed_items` 쓰기(짧은 트랜잭션: 출처 통째 바꾸기·덮어쓰기·오래된 행 지우기)·읽기 |
| `scripts/portal_build/incident_feed.py` | 진입점: 위를 차례로 부르고 `sources` 행을 남김 |
| `scripts/static_export/feed_export.py` | `feed_items` → `feed/latest.json`·`feed/by-cas/<CAS>.json`(run_all 단계 `feed`) |

2026-10-31 결과: 행 10,618, `latest.json` 356건(55 KB gzip), `by-cas/` 525개(0.9 MB gzip), R2 `v1/feed/` 526개 올림.

## 4. 화면

| 파일 | 맡는 일 |
|---|---|
| `feed_labels.jsx` · `feed_labels_en.jsx` | 문구(`FEED_LABELS_KO`/`_EN` → `FEED_LABELS`), 출처 짧은 이름, 유럽 나라 이름, 통합 검색 낱말 |
| `feed_helpers.jsx` | 순수 함수: 거르기(나라·출처·물질)·선택지·표시 값·물질 링크(`?view=product&pv=chemical&chem=<CAS>&anchor=incidents`) |
| `feed_link.jsx` | 주소 `?view=feed&sub=<물질|CAS>&country=<ISO2>&src=<source_id>` 읽기·만들기·맞추기 |
| `api_feed.jsx` | 정적 파일 읽기 `fetchFeedLatest`·`fetchFeedByCas`, 훅 `useFeedLatest`·`useFeedByCas` |
| `feed_view.jsx` | 화면 셸(`IncidentFeedView`, `APP_SCREENS` 한 줄) |
| `feed_filters.jsx` · `feed_list.jsx` · `feed_item.jsx` · `feed_attribution.jsx` | 거르기 줄 / 목록(40건씩 더 보기) / 한 건 / 출처와 이용 조건 |
| `usearch_provider_feed.jsx` | 통합 검색 묶음: 화면 줄·소식 많은 물질·소식 제목(CAS 면 그 물질 파일까지) |

- 물질을 CAS 로 고르면 `by-cas/<CAS>.json`(그 물질의 모든 기록 중 최신 100건)을, 이름이면 최근 소식에서 거른다.
- 스타일은 `product_views.css` `.feed-*`(토큰 변수만). 시험: `node frontend/scripts/tests/test_incident_feed.cjs`, `pytest tests/test_incident_feed.py`.
- PC 사이트(정적 자료 꺼짐)는 같은 주소 `/data/v1/feed/` 를 Next rewrite → `backend/api/routes/static_areas.py` 로 읽는다
  (Next·백엔드를 한 번 다시 시작해야 잡힌다. 그 전에는 화면이 "자료를 아직 받지 못했습니다" 안내를 보인다).

## 5. Worker 정기 갱신(집 PC 가 꺼져 있어도) — 만들어 두었고, 켜지 않았다

`cloudflare/worker/src/cron_feed.js`(`runFeedCron`, `scheduledFeed`) + `src/feed/csb_rss.js`(RSS 읽기) · `src/feed/feed_merge.js`
(합치기) · `src/feed/gzip_json.js`(gzip). 설정은 `src/config.js` `FEED`.

1. CSB RSS 를 받는다(15초 제한, 2 MB 제한, DTD 거부).
2. R2 `v1/feed/latest.json`(gzip)을 읽는다. 없거나 형식(v 1)이 다르면 아무것도 쓰지 않는다.
3. 합친다: 다른 출처 소식(Chem_Eng·보도)은 그대로, `csb_rss` 는 파일의 것 ∪ 새 것(같은 id 면 파일 쪽 — 집 PC 가 단 CAS 표시 유지),
   최신 60건. `updated_at`·`cron{last_run, fetched, added}`·`total` 을 고친다. id 규칙은 파이썬 수집기와 같다(`csb_rss:<주소 끝 칸>`).
4. 새 소식이 있을 때만, **읽은 뒤 바뀌지 않았을 때만**(`onlyIf.etagMatches`) gzip 으로 다시 쓴다 — 그사이 집 PC 가 새로 올렸으면 덮지 않는다.
5. `by-cas/` 는 건드리지 않는다(RSS 에는 CAS 가 없다). 실패하면 이유만 남기고 R2 는 그대로.

화면 캐시: Worker 가 `feed` 영역은 15분, `feed/by-cas` 는 1시간 캐시로 내준다(`STATIC_DATA.AREA_CACHE_CONTROL`).

시험·모의 실행(wrangler·R2 쓰기 없음):

```
node cloudflare/worker/scripts/cron_feed_check.mjs              # 시험 6개(RSS 읽기·합치기·gzip·쓰기 1회·실패 시 그대로·동시 올리기 보호)
node cloudflare/worker/scripts/cron_feed_check.mjs --dry-run    # 실제 CSB RSS + 내보낸 latest.json 사본으로 합쳐 보기 [--src 파일] [--out 결과.json]
```

**켜는 방법**(사장님 승인 뒤, 배포 때):

1. `cloudflare/worker/src/index.js` 에 `import { scheduledFeed } from "./cron_feed.js";` 를 더하고, `export default` 에
   `scheduled(controller, env, ctx) { scheduledFeed(controller, env, ctx); },` 를 더한다(다른 정기 작업이 생기면 여기서 `controller.cron` 으로 나눈다).
2. `wrangler.toml` 의 운영 환경(`[env.production]`)에 정기 실행을 더한다(하루 4번 예):
   ```
   [env.production.triggers]
   crons = ["17 */6 * * *"]
   ```
   R2 binding `STATIC_DATA` 는 이미 있다. 무료 플랜은 Cron Trigger 5개까지, 이 작업은 한 번에 R2 읽기 1·쓰기 0~1.
3. 배포 뒤 확인: `wrangler tail --env production` 에서 `cron_feed {"ok":true,...}` 줄, 또는 Cloudflare 대시보드 Workers → Triggers 의 "Run" 으로 한 번 실행.
4. 끄기: `[env.production.triggers]` 를 지우고 다시 배포(또는 `crons = []`).

## 6. 배포에 남은 것

- Worker 배포: `config.js` `STATIC_DATA.AREAS` 에 "feed"·"feed/by-cas" 와 `AREA_CACHE_CONTROL`, `routes/static_data.js` 영역별 캐시.
  배포 전에는 `https://chemip.yule.pics/data/v1/feed/latest.json` 이 404 다(R2 에는 이미 있음).
- Pages 배포: `deploy/cloudflare/site_rules.mjs` `FUNCTION_ROUTES` 에 `/data/v1/feed/*`, 새 화면 파일이 든 `dist/`.
- PC 사이트: Next(`next.config.ts` rewrite)·백엔드(`static_areas.py` AREAS) 다시 시작.
- 정기 갱신을 쓰려면 5장 "켜는 방법". 집 PC 쪽 갱신(Chem_Eng·보도 포함)은 3장 명령을 다시 돌리고 올린다.
