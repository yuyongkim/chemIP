# R3 — Korean demand: what chemical engineering students and plant engineers search for and need

Research date: 2026-10-31. Method: WebSearch (standard and extended) plus WebFetch. **kin.naver.com is blocked to the fetch tool**, so Naver 지식iN evidence is indirect. It comes from Daum cafes, tistory, consultants, KTR, NICS, KoreaScience papers and prep-course curricula. **No search-volume numbers were available**, so "evidence strength" below means how many independent signals there are, not keyword volume. Before building, check the ranking against Naver DataLab or Search Advisor keyword volume.

Each item has:
- **Signal:** the evidence (links and example queries)
- **Feature:** what a ChemIP feature would look like
- **Data/licence:** data and licence considerations
- **Static?:** whether it fits a static, in-browser build

ChemIP already ships 29 calculators, a glossary, KOSHA guide search, OEL comparison, a compatibility matrix and other tools. The items below are the **gaps or extensions** the evidence points to. They are not repeats of what exists.

---

## Key context findings

1. **Practitioners must use KORA, and it is a desktop installer with forced version migrations.**
   - The 「화학사고예방관리계획서 작성 등에 관한 규정」 says: *"사고시나리오의 영향범위 평가는 화학물질안전원에서 배포하는 화학사고예방관리계획서 작성 지원 도구를 이용하여 산정해야 한다… 동등하다고 인정할 수 있는 프로그램 등을 이용하여 선정할 수도 있으며, 이때는 관련 근거를 제출해야 한다"* ([2022-9호 PDF](http://www.korearms.com/Contents/Upload/File/202211/%ED%99%94%ED%95%99%EC%82%AC%EA%B3%A0%EC%98%88%EB%B0%A9%EA%B4%80%EB%A6%AC%EA%B3%84%ED%9A%8D%EC%84%9C%20%EC%9E%91%EC%84%B1%20%EB%93%B1%EC%97%90%20%EA%B4%80%ED%95%9C%20%EA%B7%9C%EC%A0%95(%ED%99%94%ED%95%99%EB%AC%BC%EC%A7%88%EC%95%88%EC%A0%84%EC%9B%90%EA%B3%A0%EC%8B%9C)(%EC%A0%9C2022-9%ED%98%B8)(20221026).pdf)). The NICS page now cites **고시 제2026-7호 (작성), 2026-8호 (검토) and 2026-10호 (이행)** ([NICS 제도소개](https://nics.mcee.go.kr/sub.do?menuId=116)).
   - KORA ver.5 (installer dated 2022-07-28) was "structurally incompatible" with earlier versions, so plans had to be rewritten ([safety-as 동향](https://www.safety-as.com/bbs/board.php?bo_table=briefing&wr_id=1123)).
   - Ver.6 came with the 2025 law change. Per a practitioner blog, ver.6 is required for 계획서 and 변경검토서 submitted **from January 2026**. Users re-enter the 총괄영향범위 scenarios by hand through "외부평가" and re-enter KMA weather data ([cheming.inblog.io](https://cheming.inblog.io/%EB%B3%80%EA%B2%BD%EA%B2%80%ED%86%A0%EC%84%9C-%ED%99%94%ED%95%99%EC%82%AC%EA%B3%A0%EC%98%88%EB%B0%A9%EA%B4%80%EB%A6%AC%EA%B3%84%ED%9A%8D%EC%84%9C-kora-ver-5%EC%97%90%EC%84%9C-6%EB%A1%9C-%EC%98%AE%EA%B8%B0%EB%8A%94-%EB%B0%A9%EB%B2%95-151926)).
   - **Pain point:** heavy manual data entry, version lock-in and Windows-only workflows. **Opportunity:** a browser-side "pre-KORA worksheet" that organises inputs. ChemIP must not replace KORA.
2. **Independent and NICS-staff papers document KORA's limits.**
   - Damage radii from ALOHA, AERMOD and KORA differ widely, and the ranking flips between the toxic and VCE cases (KoreaScience [JAKO201718155359710](https://koreascience.kr/article/JAKO201718155359710.pdf)).
   - KORA results do not vary with season or weather in one study ([JAKO201813639173481](https://koreascience.kr/article/JAKO201813639173481.pdf)).
   - NICS staff describe limits in impact range, sensitive receptors and population assessment ([JAKO201819757622772](https://koreascience.kr/article/JAKO201819757622772.pdf); [PMC6121683](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6121683/)).
   - **Opportunity:** an educational "why models disagree" explainer.
3. **The 화공기사 실기 has become much harder, which drives demand for practice tools.**
   - Pass rates: 37.8% (2020) → 35.0% (2021) → 21.0% (2022) → 21.1% (2023) → **14.6% (2024)**. 2022 round 2 was 1.40%.
   - Since 2020 the exam covers 공정제어, 반응공학 and 열역학 as well as 단위조작 ([나무위키 화공기사](https://namu.wiki/w/%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC)).
4. **About 42–45% of 화공안전기술사 questions are now law questions** (129회 42%, 131회 45%). Pass rates are 1–3% per round. This is a seller's claim and is not independently verified ([kmong](https://kmong.com/gig/469694)). A regulation-structured study map is therefore as valuable as calculators.
5. **The government already funds free 계획서 consulting for SMEs.** The 2024 and 2025 programs cover new filers, 변경검토서, self-inspection and 작성수준 판단 ([bizinfo 2024](https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000100511); [KTR 2025 공지](https://reach.ktr.or.kr/www/selectBbsNttView.do;jsessionid=61D166F77588D4CC90F66B6D95312E6D?key=260&bbsNo=29&nttNo=3853&searchCtgry=&searchCnd=all&searchKrwd=&integrDeptCode=&pageIndex=1&p3=)). This shows SMEs struggle even with the **first question: "are we covered, and at which tier?"**

---

## Top 15 needs, ranked by evidence

### 1. "Does this law apply to us?" threshold and tier checker (화관법 / PSM / 위험물)
- **Signal:**
  - The KTR 화관법 page says tier depends on each chemical's 최대보유량 versus the 하위/상위 규정수량, and one chemical at the 상위 level makes the whole site 1군 ([KTR](https://reach.ktr.or.kr/www/contents.do?key=241)).
  - NICS added an **automatic 작성수준 classification to KORA**, which shows demand ([기계신문](https://www.mtnews.net/news/articleView.html?idxno=7820); [에코저널](https://ecojournal.co.kr/m/view.php?idx=117088)).
  - A logistics blog walks through pallet-count examples, 60 t → 2군 and 210 t → 1군 ([cello-square](https://www.cello-square.com/kr/blog/view-1729.do)).
  - 위험물: "위험물을 여러 종류 보관하면 지정수량은 어떻게 합산할까?" ([cutlinecheck](https://cutlinecheck.com/?p=269)). Also exam-prep posts on 배수 합 ≥ 1.
  - PSM: 51 substances since 2014 under 시행령 별표 (paper refs; [itwiki 공정안전보고서](https://itwiki.kr/w/%EA%B3%B5%EC%A0%95%EC%95%88%EC%A0%84%EB%B3%B4%EA%B3%A0%EC%84%9C)).
  - Example queries: "화학사고예방관리계획서 대상 판단", "사고대비물질 규정수량", "지정수량 배수 계산", "공정안전보고서 제출대상 규정량".
- **Feature:** one inventory table (CAS, form, max inventory). It returns:
  - 화관법 tier: exempt / 2군 / 1군, based on each chemical's 최대보유량 against its LT and UT
  - PSM: Σ(Q/규정량)
  - 위험물안전관리법: Σ(Q/지정수량)
  - 산안법: 관리대상 / 특별관리 / 작업환경측정 대상 flags

  Show the rule text and article number next to each verdict. Link to ChemIP substance pages.
- **Data/licence:** 별표 and 고시 tables (시행규칙 별표 3의2, 환경부 고시 수량기준, 산안법 시행령 별표 13 for PSM, 위험물 시행령 별표 1) are statutory text. **Laws and 고시 are not copyright-protected (저작권법 제7조).** They must be transcribed and kept current. Store the effective date per row.
  - **Verify the PSM 별표 number:** one paper cites 별표10 under the old 제33조의6 numbering, while current law uses 별표13.
  - **Verify the aggregation rule:** the PSM ratio-sum rule (Σ ≥ 1) comes from general knowledge and must be checked against the current 시행령 text.
- **Static?:** Yes. Ship it as a pure JSON threshold table plus a JS evaluator.

### 2. Off-site consequence screening plus a "pre-KORA" worksheet
- **Signal:** see context findings 1–2. Endpoints used in Korean practice are 복사열 5 kW/m², 과압 1 psi, and toxic ERPG-2 or AEGL-2. For AEGL-2, releases under 7 min use the 10-min value, and 7–25 min use the 30-min value ([JAKO201712965730241](https://koreascience.kr/article/JAKO201712965730241.pdf)). A NICS guideline revision is dated Dec 2016 ([JAKO201809361757839](https://koreascience.kr/article/JAKO201809361757839.page?lang=ko)). A KOSHA guide C-C-58-2026 also covers scenario selection ([KOSHA portal](https://portal.kosha.or.kr/openapi/v1/file/down/CTC2026012916154294835313/1)).
- **Feature:**
  - (a) An endpoint lookup per substance with the AEGL time-window rule.
  - (b) Screening distance with the existing ChemIP plume tool, plus TNT-equivalent / VCE and pool-fire radiation. This needs an explicit "screening, not KORA" banner.
  - (c) A **KORA input-prep sheet** covering:
    - facility list and coordinates
    - worst and alternative scenario candidates
    - KMA prior-year monthly weather fields
    - export to CSV/print
  - (d) A short "why ALOHA, KORA and PHAST disagree" explainer.
- **Data/licence:**
  - **AEGLs are US EPA public domain, which is safe.**
  - **ERPG values are copyrighted by AIHA**, so do not bulk-republish the ERPG table. Cite or link, or use DOE PAC/TEEL (public, and PAC-2 incorporates AEGL/ERPG/TEEL) with attribution. Check PAC terms.
  - KMA climate data: data.go.kr / 기상자료개방포털 (generally free use).
- **Static?:** Yes. Gaussian, TNT and pool-fire models are closed-form and run in the browser. A heavy-gas model is harder, so keep it out of scope or label it clearly.

### 3. 화공기사 실기 필답형 practice: topic-mapped calculators with worked examples
- **Signal:**
  - Pass-rate collapse (finding 3).
  - The Chemtop course splits 필답형 into 습도·반응속도, 화공양론, 무차원수·압력, Henry/Raoult/Dalton·열복사, 열전달, 유체역학 ×3, 증류 ×2, 물질전달, 단위조작 ×2, 반응공학 ×2 and 공정제어, then per-round 2022-3 → 2026-2 ([chemtop](https://chemtop.net/lecture.php?action=view&no=43)).
  - The tistory 필답형 series covers 건조, 흡수, 물질전달, 추출, McCabe-Thiele, Raoult/Henry/비휘발도, 증발관 and 복사 ([sml2756](https://sml2756.tistory.com/category/%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC%20%EC%8B%A4%EA%B8%B0/%ED%95%84%EB%8B%B5%ED%98%95?page=1)).
  - Namu cites specific traps: a 공간시간 problem where textbooks disagreed, with about 50% correct (2020-3), and a gas-phase mean residence time problem (2024-1).
  - 작업형 is a 단증류 experiment that uses the Rayleigh equation, with a 5% error tolerance ([나무위키](https://namu.wiki/w/%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC)).
- **Feature:**
  - A "실기 모드" hub that tags existing calculators with exam topics and adds missing ones:
    - McCabe-Thiele stepper with q-line, minimum reflux, Fenske-Underwood-Gilliland
    - Rayleigh 단증류, which is also the 작업형 calculation
    - 흡수 HTU/NTU and 건조 rate / time
    - 다중효용 증발관
    - 복사 with view factor
    - CSTR/PFR space time vs residence time, with the gas-phase expansion trap explained
    - 1st/2nd-order transfer function step response, Routh / ultimate gain, Bode
    - psychrometric (습도) chart
  - Each calculator shows units at every step and a "흔한 실수" note. This also matches the comento advice to check assumptions, units and plausibility ([comento](https://comento.kr/job-questions/%EB%AA%A8%EB%93%A0%ED%9A%8C%EC%82%AC/%EB%AA%A8%EB%93%A0%EC%A7%81%EB%AC%B4/%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC_%ED%95%84%EA%B8%B0%EC%8B%A4%EA%B8%B0%EB%8A%94%EC%9A%94-639256)).
- **Data/licence:** **Do not copy Q-Net/HRDK past questions or commercial solutions verbatim, since copyright belongs to HRDK or the publisher.** Write original problems in the same style. Equations are free. Use public-domain VLE data or Antoine constants (NIST WebBook is US government, but check its terms for bulk use).
- **Static?:** Yes. All of these are closed-form or simple iterations. A Bode/step plot fits a small canvas.

### 4. Unit conversion for engineering units and gas concentrations (공학단위 ↔ SI, ppm ↔ mg/m³)
- **Signal:**
  - Daum cafe: "문제의 풀이에서 SI로 어떻게 변환을 해야 하나요?? 아정말 깝깝 하네요", listing kcal, kgf and similar ([Daum cafe](https://m.cafe.daum.net/daelim98/1oMN/2689)).
  - University syllabi teach 단위환산 as the first topic in 공정계산.
  - English demand: the NIOSH and CCOHS converters ([CCOHS](https://ccohs.gc.ca/oshanswers/chemicals/convert.html); [NIOSH](https://wwwn.cdc.gov/Niosh-oeb/Resource/Calculator)), which use 24.45 at 25 °C or 24.05 at 20 °C.
  - Korean generic calculator sites exist but are thin, e.g. [tools.devcomma.com](https://tools.devcomma.com/calculators/pipe-pressure-loss), which has only a Darcy pipe-loss calculator.
- **Feature:**
  - Korean-labelled conversions: kgf/cm²(g) ↔ MPa(a), kcal/h ↔ kW, Nm³/h ↔ Sm³/h ↔ kg/h (with reference conditions stated), ppm ↔ mg/m³ (T and P inputs, defaults explained), %LEL ↔ vol%, and gauge vs absolute pressure.
  - A "단위 검산" mode that shows dimensional analysis.
  - Embedded on every calculator.
- **Data/licence:** none needed. Use constants from CODATA/NIST.
- **Static?:** Yes. This is the cheapest and highest-reach item, and good for SEO.

### 5. 작업환경측정 / industrial-hygiene decision tools
- **Signal:**
  - The 산업위생관리기사 exam: TWA, mixture index Σ(C/TLV), 보정노출기준 for long shifts (OSHA vs Brief-Scala), 필요환기량 ([Brief & Scala doc](https://tsp.esta.org/tsp/working_groups/FS/docs/Adjusting_TWAs_for_long_shifts.pdf)).
  - Legal frequency rules: 1×/yr when 특별관리/허가대상 exceeds the OEL, 3-monthly when results exceed 2× the OEL. 183 chemical, 2 physical and 7 dust factors (counts vary by revision).
  - 7 of the 44 특별관리물질 are not measurement targets ([KoreaScience JAKO202430544015816](https://koreascience.kr/article/JAKO202430544015816.pdf)).
  - Measurement data has flowed through KOSHA's K2B system since 2012 ([JAKO202430544007516](https://koreascience.kr/article/JAKO202430544007516.pdf)).
  - The bznav AI Q&A pages show SMEs asking "is X a measurement target".
- **Feature:**
  - Extend the existing IH calculators with:
    - a multi-sample TWA builder with STEL/C checks
    - a mixture additive index
    - a long-shift adjustment (OSHA, Brief-Scala), shown side by side
    - a **"측정주기 판정"** from the previous result vs the OEL and the substance class
    - a "측정대상/특수건강진단 대상 여부" flag on substance pages
    - general dilution ventilation Q = G·K/C
- **Data/licence:**
  - 고용노동부 노출기준 고시 and 산안법 시행규칙 별표 21/22 are statutory and not copyrighted.
  - **ACGIH TLVs are copyrighted, so do not republish the TLV table.** ChemIP's OEL comparison should already respect this; verify it does.
- **Static?:** Yes.

### 6. HAZOP / What-if worksheet builder that follows KOSHA guides
- **Signal:**
  - The KOSHA GUIDE **C-C-37-2026** (연속공정 HAZOP, published 2026-01-30) and **C-C-41-2026** (회분식 HAZOP) were just reissued ([KOSHA portal 1](https://portal.kosha.or.kr/openapi/v1/file/down/CTC2026013015285726898044/1); [KOSHA portal 2](https://portal.kosha.or.kr/openapi/v1/file/down/CTC2026012916063044243064/1)).
  - Searches for "HAZOP 워크시트 양식" return mostly foreign vendor pages and Scribd. **There is no good free Korean template**, which is itself a gap.
  - HAZOP plus Bow-tie studies for Korean HF sites ([JAKO202415157756122](https://koreascience.kr/article/JAKO202415157756122.pdf)).
  - K-PSR and Checklist are widely used for SMEs ([JAKO200710103466785](https://koreascience.kr/article/JAKO200710103466785.page?lang=ko)).
- **Feature:**
  - Node → parameter × guideword deviation generator, with the Korean terms from the KOSHA guide.
  - Columns for cause / consequence / safeguards / S-L-risk / recommendation.
  - Risk matrix configurable to the company's matrix.
  - Export to xlsx/CSV/print, saved in localStorage.
  - Pre-filled deviation libraries for pumps, vessels and heat exchangers.
  - Optional link to ChemIP substance hazards (flash point, LEL, toxicity) for consequence prompts.
- **Data/licence:** KOSHA GUIDE text is public, but **check the 공공누리 type per document.** Paraphrase and link rather than copying the full text. The guideword list is generic.
- **Static?:** Yes. Implement it as a client-side table editor.

### 7. Relief / PSV, pump NPSH and line sizing extensions (plant-engineer staples)
- **Signal:**
  - Cheresources threads: blocked-in pump and control-valve-failure relief by spreadsheet, inlet ΔP and chatter under API 521 ([cheresources 3545](https://cheresources.com/invision/topic/3545-prv-valve-sizing-software)); a free pump-sizing Excel with an NPSH check ([cheresources 32861](https://www.cheresources.com/invision/topic/32861-free-pump-sizing-calculator-for-preliminary-engineering-checks)).
  - Eng-Tips: two-phase PSV via the API 520 omega method and HEM, built-up back pressure, and ~30–40% model variance for two-phase flow ([eng-tips 52877](https://eng-tips.com/threads/psv-sizing-for-vapor-liquid-mixtures.52877); [eng-tips 487792](https://eng-tips.com/threads/steam-psv-inlet-outlet-pressure-drop-calculation-methodology.487792/page-2)).
  - Relief and flare is a core chapter of 화공안전기술사 textbooks.
- **Feature:**
  - Add: the omega-method two-phase option; inlet 3% / built-up back pressure checks; pump NPSHa and NPSHr margin; pump power with a system-curve operating point; recommended velocity line sizing.
  - Use Korean labels and a 기술사-style worked example.
- **Data/licence:** **API 520/521 is copyrighted.** Implementing published equations is fine, but do not reproduce tables or figures. Cite the clause numbers.
- **Static?:** Yes.

### 8. Hazardous-area classification helper (폭발위험장소 구분, KS C IEC 60079-10-1)
- **Signal:**
  - The standard became **mandatory as KS in 2017 (2nd ed.)**.
  - Practitioners complain that it gives no explicit extent formula ("그래프로 범위를 짐작"). NE (negligible extent) handling is unclear, and the choice of secondary-release hole size drives the outcome ([JAKO201831854886240](https://www.koreascience.or.kr/article/JAKO201831854886240.pdf) and related 2015–2025 papers).
  - Hydrogen facilities are a growing topic ([JAKO201912937051214](https://koreascience.or.kr/article/JAKO201912937051214.page?lang=ko)).
  - KOSHA P-92 (누출원 모델링) is cited.
- **Feature:**
  - Release-rate calculator (gas choked/subsonic, liquid, pool evaporation).
  - Characteristic release Wg/(ρg·k·LFL).
  - Ventilation velocity / dilution degree → zone type and approximate extent, with clear "추정" labelling.
  - A worked hydrogen example.
- **Data/licence:** **IEC/KS text and charts are copyrighted.** Implement the equations from the papers that reproduce them and cite the standard. Do not copy chart images.
- **Static?:** Yes.
- **Legal:** this is a design obligation. See the risk notes.

### 9. Regulation-structured study map for 화공안전기술사 (and 위험물·산업위생)
- **Signal:**
  - The law share of 42–45% (finding 4).
  - Textbook chapters: 화재·폭발, 방폭, 안전설계·안전장치, Relief·Flare, 정전기, PSM ([성안당](https://www.cyber.co.kr/book/item/7601); [예문사](http://yeamoonsa.com/shop/item.php?it_id=D-196)).
  - Q-Net posts the 기술사 past papers as PDFs ([Q-Net](https://q-net.or.kr/cst006.do?id=cst00602&gSite=Q&brdId=Q006&code=1203&artlSeq=5202518)).
- **Feature:**
  - Extend the existing exam-tagged glossary into a "법규 지도". Each topic (PSM, 화관서, 취급시설, 고압가스, 위험물) links to the article / 별표 / 고시 and to the relevant ChemIP calculator.
  - "최근 개정" badges, e.g. the 2025 화관법 changes and the 2026 NICS 고시.
  - A "답안 골격" outline (definition → legal basis → procedure → points to note) written originally.
- **Data/licence:** statutory text is free. Past questions are HRDK copyright, so list the topic or keyword per round rather than full question text, or link to Q-Net.
- **Static?:** Yes.

### 10. 유해화학물질 취급시설 기준 checklist with a dike calculator
- **Signal:**
  - Since the 2015 화관법 overhaul, 방류벽 rules include 110% capacity, ≥0.5 m height and ≥1.5 m spacing. 안전성평가 exceptions have applied since 2018. CCTV or detectors are accepted alternatives for existing sites ([JAKO201812965729998](https://www.koreascience.or.kr/article/JAKO201812965729998.pdf); [JAKO202015358833353](https://koreascience.or.kr/article/JAKO202015358833353.pdf)).
  - NICS runs a dedicated "취급시설 안전관리 자료" menu.
  - The 2025 changes cut 유해화학물질 safety training to 8 h every 2 years and clarified small-quantity (lab) criteria ([yoohantech](https://www.yoohantech.net/rhymix/ann/12293), a vendor source, so verify).
- **Feature:**
  - An item checklist by facility type (storage, piping, loading, labs).
  - Dike volume calculator: 110% of the largest tank plus displacement of other tanks.
  - A spill-jet trajectory check for dike height, which a published study models ([kyobo](https://scholar.kyobobook.co.kr/article/detail/4010027377940)).
  - Printable self-inspection sheet.
- **Data/licence:** the 취급시설 설치·관리 고시 is statutory. Track its effective date.
- **Static?:** Yes.

### 11. 최대보유량 / inventory calculator (feeds item 1 and 계획서 관리수준)
- **Signal:**
  - The tier is decided by 최대보유량 C, "the total that can stay in the facility at maximum".
  - The 금강유역환경청 화학안전관리단 published a "관리수준 확인 매뉴얼 / 최대보유량 산정 방법" reference set (Aug 2025, [mcee notice](https://mcee.go.kr/gg/web/board/read.do;jsessionid=gTPvog32MVqE0r_mFr0RcLFm5rtflU6aS94P5IL7.mehome1?boardCategoryId=&boardId=1758880&boardMasterId=228&decorator=&maxIndexPages=10&maxPageItems=10&menuId=2251&orgCd=&pagerOffset=40&searchKey=&searchValue=); the body was not fetched).
- **Feature:**
  - Tank / drum / pipe hold-up → mass, using a density lookup from the ChemIP substance DB.
  - Concentration (함량) handling for mixtures.
  - Sums per substance, piped directly into item 1.
- **Data/licence:** fetch the NICS manual for the exact counting rules, e.g. whether piping hold-up counts. Parts of the rules are not yet verified.
- **Static?:** Yes.

### 12. Korean ERG / initial-isolation quick reference linked to CARIS concepts
- **Signal:**
  - CARIS (NICS) gives damage-range estimates for 현장 대응 and 주민대피. Its distances are ERG-based, which papers say do not reflect plant conditions. The 2018 version ignores enclosed spaces.
  - There are 16 주민대피 대비물질.
  - Local governments need fast evacuation formulas, e.g. an ammonia regression study ([JAKO202031563538861](https://koreascience.or.kr/article/JAKO202031563538861.pdf); [JAKO202024852036427](https://koreascience.or.kr/article/JAKO202024852036427.pub?lang=ko)).
- **Feature:** on each substance page show:
  - the UN number
  - the ERG guide number
  - initial isolation and protective-action distances (small/large, day/night)
  - a Korean translation of the response guide
  - a link to NICS and 119 contacts
- **Data/licence:** **ERG (US DOT/PHMSA) is a US government work and public domain.** The Korean translation would be ChemIP's own. NICS 사고사례 API ([data.go.kr 15072446](https://www.data.go.kr/data/15072446/openapi.do)) and 화학물질안전관리정보 API ([15072442](https://www.data.go.kr/data/15072442/openapi.do)) list **"이용허락범위 제한 없음"** (verified for 15072442).
- **Static?:** Yes. The table is about 3k rows of JSON.

### 13. Thermophysical properties and steam tables (mass/energy-balance support)
- **Signal:**
  - r/ChemicalEngineering: daily work is mainly mass and heat balances in Excel. A Dec-2025 post promoting a free no-login property calculator (critical points, flammability limits) drew interest ([reddit snapshot](https://reddit.sentinel-team.org/posts/1pll7co/snapshots/2025-12-15T14%3A31%3A06.122798Z); [day-to-day thread](https://lr.eu.psf.lt/r/ChemicalEngineering/comments/1dfqd9t/people_working_as_cheme_what_do_you_do_daytoday)).
  - ChemEnggCalc and CheCalc compete on steam tables and stoichiometry ([checalc](https://checalc.com/); [chemenggcalc](https://chemenggcalc.com/chemical-engineering-resources/)).
  - Steam tables come up throughout the 실기.
- **Feature:**
  - IAPWS-IF97 steam tables (saturated/superheated, interpolation shown the way the exam requires).
  - Cp(T), ΔHvap and Antoine for the ChemIP substance list.
  - Mixture properties.
  - A simple mass/energy balance sheet.
- **Data/licence:** the IF97 equations are free to implement. **The DIPPR/Yaws databases are licensed and cannot be used.** Use public sources (NIST WebBook spot values with care, Wikidata, the PubChem experimental properties already in ChemIP).
- **Static?:** Yes. The IF97 JS implementation is about 30 KB.

### 14. Semi-quantitative chemical risk assessment helper (CHARM-style), linked to KRAS
- **Signal:**
  - KOSHA provides CHARM via KRAS (kras.kosha.or.kr). CHARM rates hazard (GHS H-codes) against exposure (daily amount, dustiness or volatility) ([JAKO202314843206694](https://koreascience.kr/article/JAKO202314843206694.page?lang=ko)).
  - SMEs must run 위험성평가 under 산안법 제36조.
- **Feature:**
  - From a ChemIP substance page plus user-entered amount and process temperature, compute an indicative hazard and exposure band (COSHH-Essentials logic) with control suggestions.
  - A "KRAS에 그대로 옮기는 값" panel so users finish the official record in KRAS.
- **Data/licence:** the CHARM manual (2012) is a KOSHA publication; check its 공공누리 type. **COSHH Essentials logic is UK HSE (OGL v3).**
- **Static?:** Yes.

### 15. P&ID / ISA 5.1 tag decoder and symbol reference in Korean
- **Signal:**
  - "P&ID 기호 읽는 법" queries are served by vendor pages (EdrawSoft Korean tutorial) and foreign blogs ([edrawsoft](https://www.edrawsoft.com/kr/diagram-tutorial/how-to-read-a-pid.html); [projectmaterials](https://blog.projectmaterials.com/quick-answers/epc/common-pid-symbols/)).
  - New engineers and PSM document reviewers need this, and P&IDs are a mandatory PSM attachment.
  - This is weaker evidence than the items above (inferred, not measured).
- **Feature:**
  - Type a tag (e.g. "PSHH-101", "FIC") to get a Korean explanation from the ISA first/succeeding-letter table.
  - SVG symbol gallery: valves, fail positions, line types, bubble types.
  - KS/ISO 10628 notes.
- **Data/licence:** **the ISA 5.1 text is copyrighted.** The letter-code convention is widely reproduced, so write it in our own words and draw our own SVGs.
- **Static?:** Yes.

**Honourable mentions** (weaker evidence, cheap to add):
- 위험물 유별 혼재기준 table (위험물안전관리법 시행규칙 별표, number to be confirmed) in the existing compatibility matrix
- 정전기 calculations (charge relaxation, MIE comparison)
- Le Chatelier mixture LFL (likely already present)
- TNT-equivalent drill as in exam problems ([ikkujun 르샤틀리에](https://ikkujun.com/189); [cbtbank TNT 예시](https://cbtbank.kr/exam/ft20160430))
- KORA ver.5→6 migration checklist page

---

## Legal and liability risk notes: ChemIP must stay a "reference/screening" tool

| Area | Why it is risky | Mitigation |
|---|---|---|
| 장외영향평가 / 화학사고예방관리계획서 영향범위 | The 고시 requires impact ranges computed with the **NICS-distributed tool (KORA)**. Other programs need demonstrated equivalence and supporting evidence. Since 2026-01 submissions reportedly require KORA ver.6. NICS reviews and may inspect on site. | Label every distance "참고용 스크리닝 — 제출용 영향범위는 KORA로 산정". Never output NICS forms (서식 11/12) or call results "장외평가 결과". Offer a KORA input-prep and checklist rather than a substitute. |
| PSM (공정안전보고서) | KOSHA reviews and confirms PSM reports. Applicability errors carry penalties. | Show the threshold checker as "판정 보조". Show the legal text and effective date, and tell users to confirm with the 지방고용노동관서 or KOSHA. |
| 화관법 tier / 유독물질 status / 취급시설 기준 | 고시 and 별표 change often (2025-04-11 시행규칙, 2025-08/10 law, 2026 NICS 고시). Stale tables produce wrong verdicts. | Store an effective date per table, show "기준일" in the UI, and add a review cadence. Link to law.go.kr. |
| 작업환경측정 | Only 지정측정기관 can perform the legal measurement, and results go through K2B. ChemIP numbers are not measurements. | Present tools as education and pre-planning. Do not offer a "측정결과표" export in the official format. |
| 폭발위험장소 구분 (KS C IEC 60079-10-1) | A mandatory KS. The classification drives 방폭 equipment selection, so under-classification is a safety hazard. | "추정 — 설계 확정은 자격자 검토" banner. Show the conservative option by default. Do not publish zone drawings. |
| PSV / relief sizing | Under-sizing can cause loss of containment. API standards are copyrighted. | Equations only, with clause citations. "예비 검토용" label. Show input-sensitivity warnings. |
| Copyrighted data | **ACGIH TLV**, **AIHA ERPG**, **DIPPR/Yaws**, **API/IEC/KS/ISA** text and tables, **Q-Net past questions and commercial solutions**, and some KOSHA guides (check 공공누리 type). The KOSHA MSDS API is marked "참고용" and "이용허락범위 제한" ([data.go.kr 15157612](https://www.data.go.kr/data/15157612/openapi.do)). | Use public-domain sources (EPA AEGL, NIOSH, DOT ERG, Korean statutes and 고시 under 저작권법 제7조, data.go.kr items marked "제한 없음"). Write original problems. Cite and link instead of copying. |
| Official-looking outputs | A page that imitates NICS, KOSHA or KORA forms could be taken as an official document. | Use ChemIP branding with a "비공식" footer on all printouts. Do not use agency logos. |

Suggested global disclaimer: "ChemIP 계산 결과는 학습·예비검토용 참고자료이며, 법정 제출서류(화학사고예방관리계획서·공정안전보고서·작업환경측정결과·방폭설계 등)를 대체하지 않습니다. 법정 산정은 화학물질안전원 KORA 등 지정 도구와 자격자 검토로 수행하십시오."

---

## Gaps in this research (to close before building)
1. **No keyword-volume data.** Pull Naver DataLab or Search Advisor for: 단위환산, ppm mg/m3, 지정수량 배수, 화관법 대상, 화공기사 실기, HAZOP 양식, McCabe-Thiele, 폭발위험장소.
2. **Statutory details to confirm on law.go.kr:**
   - the PSM aggregation rule and its 별표 number
   - the exact cross-substance aggregation rule for 화관법 tiers (appears per substance, not a ratio sum)
   - the 위험물 혼재 별표 number
3. **NICS documents to fetch** (attachments were not retrieved):
   - the 2026-7호 고시 text
   - the 최대보유량 산정 manual (Aug 2025)
4. **KORA ver.6 details:** distribution form, system requirements and licence.
5. **Q-Net 화공기사 실기 출제기준 PDF:** not retrieved, so the topic list above comes from prep-course curricula.
