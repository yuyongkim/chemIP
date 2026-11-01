// Check list for verify_portal_local.cjs — data only. One entry per portal service; add a service by adding an entry.
//
// service fields
//   key, name         id and display name
//   detect            repo-relative globs ("*" in the file name only). None present → the service is "NOT YET" (not run)
//   requires          repo-relative files that must all exist once the service is detected (missing → FAIL)
//   jsx / css         public/chemip files that must be listed in index.html (deploy readiness; default: detected .jsx/.css)
//   areas             static areas the service reads (keys of STATIC_AREAS) — on disk + Worker AREAS + Pages routes
//   dataFiles         single static files the service reads ("g/un_index.json"), relative to the v1 root
//   views             ?view=<k> values that must be registered in APP_SCREENS
//   pages             [{ path, expect, actions, hangulExclude, hangulMax, allowHttp, modes, widths, langs }]
//                     path = query string after /chemip ("?view=search&q=LMTD"); &lang= is added by the harness
//                     expect = { any: [...], ko: [...], en: [...] }; item = "text" | /re/ | { sel: "css" } | { notText }
//                     actions = [{ scroll: true } | { click: "css" } | { fill: ["css", "value"] } | { press: "Enter" } | { wait: ms }]
//   hangulExclude     css selectors whose text is source data (KOSHA MSDS 원문, 법령 이름 …): skipped by the Hangul-in-EN check
//   allowHttp         [{ re, status, modes }] expected 4xx/5xx in addition to ALLOW_HTTP
"use strict";

const CHEMIP = "frontend/public/chemip";

// Static areas under /data/v1/<dir>. root: where the files are on disk (default: the exporter's out/v1/<dir>).
// minFiles: plausible lower bound. samples: files that must exist. gzip: bytes start 1f 8b (R2 objects).
// worker: must be routed by the Worker (config.js STATIC_DATA.AREAS / PATENT_AREA) and the Pages _routes.json include.
const STATIC_AREAS = {
  p: { dir: "p", minFiles: 300000, samples: ["001008.json", "71-43-2.json", "71-43-2.x.json"], gzip: true, worker: true },
  g: { dir: "g", minFiles: 6, samples: ["rulebook.json", "trade_common.json", "guide_index.json"], gzip: true, worker: true },
  tx: { dir: "tx", minFiles: 400, samples: ["106-99-0.json"], gzip: true, worker: true },
  pv: { dir: "pv", minFiles: 400, samples: ["71-43-2.json"], gzip: true, worker: true },
  pat: { dir: "pat", root: "E:/dev-cache/chemip-patents/out/v1", minFiles: 15000, samples: ["71-43-2/index.json"], gzip: false, worker: true, patent: true },
  search: { dir: "search", minFiles: 5, samples: ["manifest.json", "docmeta.json"], gzip: false, worker: false, pagesCopy: true },
  // new areas (docs/portal/PORTAL_SERVICES_v1.md §4.3 and the agents' plans; CONTRACT.md sections)
  f: { dir: "f", minFiles: 10000, samples: ["71-43-2.json", "id_0.json"], gzip: true, worker: true },
  reg: { dir: "reg", minFiles: 4, samples: ["lists.json", "changes.json", "changes.xml"], gzip: true, worker: true },
  feed: { dir: "feed", minFiles: 2, samples: ["latest.json"], gzip: true, worker: true },
  gs: { dir: "gs", minFiles: 1000, samples: ["manifest.json", "t_0.json"], gzip: true, worker: true },
  prtr: { dir: "prtr", minFiles: 100, samples: ["index.json", "71-43-2.json"], gzip: true, worker: true },
  oel: { dir: "oel", minFiles: 100, samples: ["71-43-2.json"], gzip: true, worker: true },
  el: { dir: "el", minFiles: 3000, samples: ["7782-50-5.json", "64-19-7.json", "index.json"], gzip: true, worker: true },
  rel: { dir: "rel", minFiles: 1000, samples: ["71-43-2.json"], gzip: true, worker: true },
  tp: { dir: "tp", minFiles: 500, samples: ["71-43-2.json", "7732-18-5.json", "index.json", "licenses.json"], gzip: true, worker: true },
  law: { dir: "law", minFiles: 130, samples: ["index.json", "toc.json", "lists.json", "law_000162.json", "cas_0.json"], gzip: true, worker: true },
};

// Expected non-2xx answers in every service (re is tested against the full URL).
const ALLOW_HTTP = [
  { re: /\/api\//, status: 503, modes: ["off"], why: "PC-off mode: every /api request answers 503" },
  { re: /\/data\/v1\/tx\/[^/]+\.json/, status: 404, why: "tx/: 404 = no events for this CAS (CONTRACT.md)" },
  { re: /\/data\/v1\/pv\/[^/]+\.json/, status: 404, why: "pv/: only 413 CAS pre-fetched; others go to the home PC" },
  { re: /\/data\/v1\/pat\/[^/]+\/index\.json/, status: 404, why: "pat/: CAS without patent mapping" },
  { re: /\/data\/v1\/p\/[^/]+\.x\.json/, status: 404, why: "extras not exported → API fallback" },
  { re: /\/data\/v1\/(el|tp|oel|rel)\/[^/]+\.json/, status: 404, why: "el/ tp/ oel/ rel/: 404 = no file for this CAS, the panel shows nothing (CONTRACT.md)" },
  { re: /\/favicon\.ico$/, status: 404, why: "local server has no favicon in PC-on Next dev" },
];

// Text that is source data in every page (skipped by the Hangul-in-EN check).
const HANGUL_EXCLUDE = [
  ".lang-seg",           // 한 / EN switch
  "script", "style", "noscript",
  "[data-source-text]",  // convention for new code: wrap source-data text in data-source-text
  "[lang=ko]",
  // unified search: rows that quote source records (KOSHA guide titles/snippets, Korean substance names, incident titles)
  'section[aria-labelledby="us-g-guides"] .us-list',
  'section[aria-labelledby="us-g-substances"] .us-item-title', 'section[aria-labelledby="us-g-substances"] .us-item-sub',
  'section[aria-labelledby="us-g-identifiers"] .us-item-title', 'section[aria-labelledby="us-g-identifiers"] .us-item-sub',
  'section[aria-labelledby="us-g-transport"] .us-item-sub', 'section[aria-labelledby="us-g-feed"] .us-list',
  'section[aria-labelledby="us-g-prtr"] .us-item-sub',
  ".ld-feed-title",       // landing "최근 사고 소식": news headlines as published
  ".gl-other",            // glossary: the term's name in the other language, shown on purpose
];

const BENZENE = "?view=product&pv=chemical&chem=71-43-2";

// 국가별 규제 패널의 EU 단추(제목에 "European Union"이 ko·en 모두 들어간다)
const EU_JUR_BUTTON = '#intl-regulation button.pd-jur:has-text("European Union")';
const SERVICES = [
  // ---- already live ----
  {
    key: "usearch", name: "Unified search",
    detect: [`${CHEMIP}/usearch_view.jsx`],
    requires: [`${CHEMIP}/usearch_view.jsx`, `${CHEMIP}/usearch_providers.jsx`],
    views: ["search"], areas: ["search", "g"], dataFiles: ["g/guide_index.json"],
    pages: [
      { path: "?view=search&q=LMTD", expect: { any: [{ sel: ".us-page" }, { sel: ".us-group" }, /LMTD/] } },
      { path: "?view=search&q=71-43-2", expect: { any: [{ sel: ".us-group" }, /71-43-2/], ko: [/벤젠/], en: [/Benzene/i] } },
      { path: "?view=search&q=flash%20point", langs: ["en"], expect: { any: [{ sel: ".us-group" }], en: [/flash point/i] } },
    ],
  },
  {
    key: "calc", name: "Calculators",
    detect: [`${CHEMIP}/calc_view.jsx`],
    requires: [`${CHEMIP}/calc_registry.jsx`, `${CHEMIP}/calc_view.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc", expect: { any: [{ sel: ".calc-view" }, { sel: ".calc-layout" }] } },
      { path: "?view=calc&calc=ppm_mgm3&mw=78.1134&name=Benzene", expect: { any: [{ sel: ".calc-view" }, /78\.11/] } },
      { path: "?view=calc&calc=lmtd", expect: { any: [{ sel: ".calc-view" }, /LMTD/] } },
    ],
  },
  {
    key: "calcchart", name: "Calculator charts (shared CalcChart)",
    detect: [`${CHEMIP}/calc_chart.jsx`],
    requires: [`${CHEMIP}/calc_chart.jsx`, `${CHEMIP}/calc_chart_scale.jsx`, `${CHEMIP}/calc_chart_axes.jsx`, `${CHEMIP}/calc_chart_legend.jsx`,
      `${CHEMIP}/calc_chart_tip.jsx`, `${CHEMIP}/calc_chart_table.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=antoine", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: ".calc-chart-marker" }, /1 atm/] } },
      { path: "?view=calc&calc=pipe_dp", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: "details.calc-chart-data" }] } },
      { path: "?view=calc&calc=reactor", expect: { any: [{ sel: ".calc-chart-legend" }, /CSTR/, /PFR/, { sel: "path.calc-chart-line.is-dashed" }] } },
    ],
  },
  {
    key: "units", name: "Engineering unit converter",
    detect: [`${CHEMIP}/calc_units_converter.jsx`],
    requires: [`${CHEMIP}/calc_units_converter.jsx`, `${CHEMIP}/calc_units_gas.jsx`, `${CHEMIP}/calc_units.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=units", expect: { any: [{ sel: ".calc-view" }, /bar\(g\)/, /kgf\/cm²\(g\)/, /psig/], ko: ["공학 단위 변환기"], en: ["Engineering unit converter"] } },
      { path: "?view=calc&calc=units&kind=gasflow&mw=44.01&name=CO2", expect: { any: [/Nm³\/h/, /SCFM/, /kmol\/h/, /44\.01/] } },
      { path: "?view=search&q=unit%20converter", expect: { any: [{ sel: 'a[href*="calc=units"]' }] } },
    ],
  },
  {
    key: "calcthermo", name: "Thermodynamics (real-fluid properties via CoolProp wasm, binary VLE with UNIFAC)",
    detect: [`${CHEMIP}/calc_fluid_props.jsx`, `${CHEMIP}/calc_vle_binary.jsx`],
    requires: [`${CHEMIP}/calc_fluid_props.jsx`, `${CHEMIP}/calc_fluid_engine.jsx`, `${CHEMIP}/calc_fluid_data.jsx`, `${CHEMIP}/calc_fluid_names.jsx`,
      `${CHEMIP}/calc_fluid_cycle.jsx`, `${CHEMIP}/calc_fluid_charts.jsx`, `${CHEMIP}/calc_form_engine.jsx`, `${CHEMIP}/calc_form_engine_status.jsx`,
      `${CHEMIP}/calc_substance_link_fluid.jsx`, `${CHEMIP}/vendor/coolprop/coolprop.js`, `${CHEMIP}/vendor/coolprop/coolprop.wasm`, `${CHEMIP}/vendor/coolprop/LICENSE`,
      `${CHEMIP}/calc_vle_binary.jsx`, `${CHEMIP}/calc_vle_solve.jsx`, `${CHEMIP}/calc_vle_models.jsx`, `${CHEMIP}/calc_vle_unifac.jsx`,
      `${CHEMIP}/calc_vle_unifac_data.jsx`, `${CHEMIP}/calc_vle_antoine_data.jsx`, `${CHEMIP}/calc_vle_presets.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=fluid_props", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: ".calc-chart-marker" }, /kJ\/kg/], ko: ["열역학", "과열 증기"], en: ["Thermodynamics", "Superheated vapour"] } },
      { path: "?view=calc&calc=fluid_props&fluid=Ammonia&mode=cycle", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: ".calc-result-table" }, /COP/], ko: ["냉동 효과"], en: ["Refrigerating effect"] } },
      { path: "?view=calc&calc=fluid_props&fluid=CarbonDioxide&mode=sat", expect: { any: [{ sel: ".calc-tout-table" }, { sel: ".calc-chart svg path.calc-chart-line" }], ko: ["포화 표"], en: ["saturation table"] } },
      { path: "?view=calc&calc=vle_binary", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: ".calc-chart-marker" }, /CH3 \+ CH2 \+ OH/], ko: ["공비점 있음"], en: ["Azeotrope —"] } },
      { path: "?view=calc&calc=vle_binary&c1=Benzene&c2=Toluene&plot=xy", expect: { any: [{ sel: "path.calc-chart-line.is-dashed" }], ko: ["공비점 없음"], en: ["No azeotrope"] } },
      { path: "?view=search&q=R134a", expect: { any: [{ sel: 'a[href*="calc=fluid_props"]' }] } },
      { path: "?view=search&q=UNIFAC", expect: { any: [{ sel: 'a[href*="calc=vle_binary"]' }] } },
    ],
  },
  {
    key: "rxn", name: "Reaction & economics (batch/series reactors, Arrhenius, adiabatic T-X, runaway screening, economics, flue gas)",
    detect: [`${CHEMIP}/calc_batch_reactor.jsx`, `${CHEMIP}/calc_runaway.jsx`, `${CHEMIP}/calc_economics.jsx`, `${CHEMIP}/calc_flue_gas.jsx`],
    requires: [`${CHEMIP}/calc_reaction_math.jsx`, `${CHEMIP}/calc_batch_reactor.jsx`, `${CHEMIP}/calc_runaway.jsx`, `${CHEMIP}/calc_economics_ppi.jsx`,
      `${CHEMIP}/calc_economics_math.jsx`, `${CHEMIP}/calc_economics.jsx`, `${CHEMIP}/calc_flue_gas.jsx`, `${CHEMIP}/calc_chart.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=batch_reactor", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /23\.026/], ko: ["반응·경제"], en: ["Reaction & economics"] } },
      { path: "?view=calc&calc=batch_reactor&mode=adiabatic", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /1\.407/, /351\.7/] } },
      { path: "?view=calc&calc=batch_reactor&mode=arrhenius", expect: { any: [{ sel: ".calc-chart svg" }, /121\.5/] } },
      { path: "?view=calc&calc=runaway", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /MTSR/, /TD24/], ko: ["참고용 스크리닝", "2등급"], en: ["Screening only", "Class 2"] } },
      { path: "?view=calc&calc=economics&mode=npv", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /137\.2/, /15\.24/] } },
      { path: "?view=calc&calc=economics&mode=escalate&src=ppi", expect: { any: [/BLS/, /PPI/] } },
      { path: "?view=calc&calc=flue_gas", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /10\.53/, /2\.105/] } },
      { path: "?view=search&q=MTSR", expect: { any: [{ sel: 'a[href*="calc=runaway"]' }] } },
      { path: "?view=search&q=NPV", expect: { any: [{ sel: 'a[href*="calc=economics"]' }] } },
    ],
  },
  {
    key: "calcflam", name: "Flammability & inerting (mixture flash point, LOC/MOC, purge, static)",
    detect: [`${CHEMIP}/calc_mix_flash_point.jsx`, `${CHEMIP}/calc_loc_moc.jsx`, `${CHEMIP}/calc_purge.jsx`, `${CHEMIP}/calc_static_charge.jsx`],
    requires: [`${CHEMIP}/calc_mix_flash_point.jsx`, `${CHEMIP}/calc_loc_moc.jsx`, `${CHEMIP}/calc_purge.jsx`, `${CHEMIP}/calc_static_charge.jsx`,
      `${CHEMIP}/calc_flam_fill.jsx`, `${CHEMIP}/api_calc_fill_flam.jsx`, `${CHEMIP}/calc_stoich_air.jsx`, `${CHEMIP}/calc_chart.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=mix_flash_point", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /19\.47/], ko: ["가연성·불활성화", "혼합물 인화점"], en: ["Flammability & inerting", "Mixture flash point"] } },
      { path: "?view=calc&calc=mix_flash_point", actions: [{ click: "button.calc-row-fill" }, { wait: 1500 }], expect: { ko: ["MSDS 9항"], en: ["SDS Section 9"] } },
      { path: "?view=calc&calc=loc_moc", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /10\.4/, /3\.18/, /OSFC/, /ISOC/] } },
      { path: "?view=calc&calc=purge", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /0\.5513/], ko: ["참고용 스크리닝"], en: ["Screening estimate only"] } },
      { path: "?view=calc&calc=purge&mode=sweep", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /Nm³/] } },
      { path: "?view=calc&calc=static_charge", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /17\.71/, /W \/ MIE/] } },
      { path: "?view=search&q=OSFC", expect: { any: [{ sel: 'a[href*="calc=loc_moc"]' }] } },
      { path: "?view=search&q=purge", expect: { any: [{ sel: 'a[href*="calc=purge"]' }] } },
    ],
  },
  {
    key: "calcfire", name: "Fire & explosion (pool fire, BLEVE fireball, VCE, harm probits)",
    detect: [`${CHEMIP}/calc_pool_fire.jsx`, `${CHEMIP}/calc_bleve.jsx`, `${CHEMIP}/calc_vce.jsx`, `${CHEMIP}/calc_probit_harm.jsx`],
    requires: [`${CHEMIP}/calc_fire_common.jsx`, `${CHEMIP}/calc_fire_radiation.jsx`, `${CHEMIP}/calc_fire_harm.jsx`, `${CHEMIP}/calc_blast_curves.jsx`,
      `${CHEMIP}/calc_pool_fire.jsx`, `${CHEMIP}/calc_bleve.jsx`, `${CHEMIP}/calc_vce.jsx`, `${CHEMIP}/calc_probit_harm.jsx`,
      `${CHEMIP}/calc_next_data.jsx`, `${CHEMIP}/calc_results_next.jsx`, `${CHEMIP}/calc_chart.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=pool_fire", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: "path.calc-chart-line.is-dashed" }, /0\.103/, /Shokri/], ko: ["화재·폭발", "참고용 스크리닝", "KORA"], en: ["Fire & explosion", "Screening only", "KORA"] } },
      { path: "?view=calc&calc=pool_fire&size=A&A=966.19&PFF=4.3", expect: { any: [/134/, /Pool Fire Factor/] } },
      { path: "?view=calc&calc=bleve", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /125/, /9\.69/, { sel: 'a.calc-next-link[href*="calc=probit_harm"]' }], ko: ["이어서 계산"], en: ["Continue with"] } },
      { path: "?view=calc&calc=vce&M=22679.6", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /479/, /0\.44/] } },
      { path: "?view=calc&calc=probit_harm", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /6\.86/, /54\.7/] } },
      { path: "?view=calc&calc=probit_harm&kind=thermal&I=36.6&t=9.69", expect: { any: [/36\.6/] } },
      { path: "?view=search&q=BLEVE", expect: { any: [{ sel: 'a[href*="calc=bleve"]' }] } },
      { path: "?view=search&q=TNT", expect: { any: [{ sel: 'a[href*="calc=vce"]' }] } },
    ],
  },
  {
    key: "ctrl", name: "Process control (PID tuning, loop simulation, Routh/Bode)",
    detect: [`${CHEMIP}/calc_pid_tuning.jsx`, `${CHEMIP}/calc_loop_sim.jsx`, `${CHEMIP}/calc_tf_tools.jsx`],
    requires: [`${CHEMIP}/calc_ctrl_fopdt.jsx`, `${CHEMIP}/calc_ctrl_tuning.jsx`, `${CHEMIP}/calc_ctrl_sim.jsx`, `${CHEMIP}/calc_ctrl_routh.jsx`,
      `${CHEMIP}/calc_ctrl_step.jsx`, `${CHEMIP}/calc_ctrl_margins.jsx`, `${CHEMIP}/calc_out_table.jsx`, `${CHEMIP}/calc_chart.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=pid_tuning", expect: { any: [{ sel: ".calc-result-table" }, /SIMC/, /Cohen–Coon/, /2\.5/], ko: ["공정제어", "PID 튜닝"], en: ["Process control", "PID tuning"] } },
      { path: "?view=calc&calc=loop_sim", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: ".calc-result-table" }, /IAE/], ko: ["폐루프"], en: ["Closed-loop"] } },
      { path: "?view=calc&calc=tf_tools&tool=routh", expect: { any: [{ sel: ".calc-result-table" }, /12\.6/, /Routh/] } },
      { path: "?view=calc&calc=tf_tools&tool=bode", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /3\.142/, /61\.35/] } },
      { path: "?view=search&q=PID", expect: { any: [{ sel: 'a[href*="calc=pid_tuning"]' }] } },
      { path: "?view=search&q=Routh", expect: { any: [{ sel: 'a[href*="calc=tf_tools"]' }] } },
      { path: "?view=search&q=Bode", expect: { any: [{ sel: 'a[href*="calc=tf_tools"]' }] } },
      { path: "?view=search&q=%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC%20%EC%A0%9C%EC%96%B4", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=pid_tuning"]' }, { sel: 'a[href*="calc=tf_tools"]' }] } },
      { path: "?view=search&q=%ED%8A%9C%EB%8B%9D", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=pid_tuning"]' }] } },
    ],
  },
  {
    key: "sep", name: "Separations (flash, McCabe–Thiele, FUG, Rayleigh, absorption)",
    detect: [`${CHEMIP}/calc_flash.jsx`, `${CHEMIP}/calc_mccabe.jsx`],
    requires: [`${CHEMIP}/calc_sep_vle.jsx`, `${CHEMIP}/calc_antoine_facts.jsx`, `${CHEMIP}/calc_mccabe_steps.jsx`, `${CHEMIP}/calc_shortcut_math.jsx`,
      `${CHEMIP}/calc_fug.jsx`, `${CHEMIP}/calc_rayleigh.jsx`, `${CHEMIP}/calc_absorption.jsx`, `${CHEMIP}/calc_table_field_fill.jsx`,
      `${CHEMIP}/api_calc_fill.jsx`, `${CHEMIP}/calc_chart.jsx`],
    views: ["calc"], areas: ["f"],
    pages: [
      // 행 채우기: 1행 성분 칸에 톨루엔 CAS → 돋보기 → CoolProp 사전 설정 또는 f/108-88-3.json 두 점 맞춤(3.79 kPa, 25 °C)
      { path: "?view=calc&calc=flash", actions: [{ fill: [".calc-field-table tbody tr:first-child td:nth-child(2) input", "108-88-3"] },
        { click: ".calc-field-table tbody tr:first-child button.calc-row-fill" }, { wait: 2500 }],
        expect: { ko: [/1행: .*(CoolProp|3\.79 kPa)/], en: [/Row 1: .*(CoolProp|3\.79 kPa)/] } },
      { path: "?view=calc&calc=mccabe",expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /13\.3/], ko: ["분리공정", "최소 환류비"], en: ["Separations", "Minimum reflux ratio"] } },
      { path: "?view=calc&calc=mccabe&eqmode=raoult&xF=0.45&xB=0.1&q=1.1937&rmode=R&R=4", expect: { any: [{ sel: ".calc-chart svg" }, { sel: "button.calc-row-fill" }, /7\.39/] } },
      { path: "?view=calc&calc=flash", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: "button.calc-row-fill" }, /0\.4045/], ko: ["두 상"], en: ["Two phases"] } },
      { path: "?view=calc&calc=fug", expect: { any: [{ sel: ".calc-chart svg" }, /0\.3951/], ko: ["Underwood"], en: ["Underwood"] } },
      { path: "?view=calc&calc=rayleigh", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /0\.3276/] } },
      { path: "?view=calc&calc=absorption", expect: { any: [{ sel: ".calc-chart svg" }, /5\.124/], ko: ["흡수 인자"], en: ["Absorption factor"] } },
      { path: "?view=search&q=McCabe", expect: { any: [{ sel: 'a[href*="calc=mccabe"]' }] } },
      { path: "?view=search&q=%ED%99%94%EA%B3%B5%EA%B8%B0%EC%82%AC%20%EC%A6%9D%EB%A5%98", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=mccabe"]' }] } },
      { path: "?view=search&q=%EB%8B%A8%EC%A6%9D%EB%A5%98", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=rayleigh"]' }] } },
      { path: "?view=search&q=%EA%B8%B0%ED%8F%AC%EC%A0%90", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=flash"]' }] } },
      { path: "?view=search&q=%ED%9D%A1%EC%88%98%ED%83%91", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=absorption"]' }] } },
      { path: "?view=search&q=bubble%20point", langs: ["en"], expect: { any: [{ sel: 'a[href*="calc=flash"]' }] } },
    ],
  },
  {
    key: "steam", name: "Steam tables (IAPWS-IF97) + T–s/Mollier + psychrometric chart",
    detect: [`${CHEMIP}/calc_steam.jsx`, `${CHEMIP}/calc_if97.jsx`],
    requires: [`${CHEMIP}/calc_if97_coef.jsx`, `${CHEMIP}/calc_if97.jsx`, `${CHEMIP}/calc_if97_solve.jsx`, `${CHEMIP}/calc_steam_chart.jsx`,
      `${CHEMIP}/calc_steam_table.jsx`, `${CHEMIP}/calc_table_data.jsx`, `${CHEMIP}/calc_table_out.jsx`, `${CHEMIP}/calc_psy_math.jsx`,
      `${CHEMIP}/calc_psychro_chart.jsx`, `${CHEMIP}/calc_chart.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=steam", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /3,051\.7/, /IAPWS-IF97/], ko: ["증기표", "과열 증기"], en: ["Steam tables", "Superheated vapor"] } },
      { path: "?view=calc&calc=steam&mode=ph&p=1&h=2000&chart=hs", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /0\.61/], ko: ["습증기", "몰리에"], en: ["Wet steam", "Mollier"] } },
      { path: "?view=calc&calc=steam_table", expect: { any: [{ sel: ".calc-tout-table" }, /h_fg/, /2,256/], ko: ["CSV 받기"], en: ["Download CSV"] } },
      { path: "?view=calc&calc=psychro&mode=mix", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }], ko: ["두 공기 혼합", "나오는 공기"], en: ["Mixing two streams", "Leaving air"] } },
      { path: "?view=calc&calc=psychro&mode=coil&T=30&RH=80&Tout=14", expect: { any: [{ sel: ".calc-chart svg" }, /−8\.51|-8\.51/] } },
      { path: "?view=search&q=%EC%A6%9D%EA%B8%B0%ED%91%9C", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=steam"]' }] } },
      { path: "?view=search&q=steam%20table", expect: { any: [{ sel: 'a[href*="calc=steam_table"]' }] } },
      { path: "?view=search&q=%EB%AA%B0%EB%A6%AC%EC%97%90", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=steam"]' }] } },
      { path: "?view=search&q=%EC%8A%B5%EA%B3%B5%EA%B8%B0%EC%84%A0%EB%8F%84", langs: ["ko"], expect: { any: [{ sel: 'a[href*="calc=psychro"]' }] } },
    ],
  },
  {
    key: "sizing", name: "Equipment sizing calculators",
    detect: [`${CHEMIP}/calc_pump_system.jsx`],
    requires: [`${CHEMIP}/calc_sizing_common.jsx`, `${CHEMIP}/calc_fittings_data.jsx`, `${CHEMIP}/calc_pump_system.jsx`, `${CHEMIP}/calc_control_valve.jsx`,
      `${CHEMIP}/calc_compressor.jsx`, `${CHEMIP}/calc_hx_ntu.jsx`, `${CHEMIP}/calc_fittings_dp.jsx`, `${CHEMIP}/calc_separator.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=pump_system", expect: { any: [{ sel: ".calc-chart-svg" }], ko: ["운전점"], en: [/Operating point/] } },
      { path: "?view=calc&calc=control_valve", expect: { any: [{ sel: ".calc-chart-svg" }, /164\.?9|165/], ko: ["필요 Kv"], en: [/Required Kv/] } },
      { path: "?view=calc&calc=compressor", expect: { any: [{ sel: ".calc-chart-svg" }], ko: ["토출 온도"], en: [/discharge temperature/i] } },
      { path: "?view=calc&calc=hx_ntu", expect: { any: [{ sel: ".calc-chart-svg" }, /NTU/], ko: ["유효도"], en: [/Effectiveness/] } },
      { path: "?view=calc&calc=fittings_dp", expect: { any: [{ sel: ".calc-chart-svg" }, /Moody/], ko: ["손실계수"], en: [/loss coefficients/i] } },
      { path: "?view=calc&calc=separator", expect: { any: [{ sel: ".calc-chart-svg" }, /Souders/], ko: ["허용 기체 속도"], en: [/Allowable gas velocity/] } },
    ],
  },
  {
    key: "family", name: "Family links",
    detect: [`${CHEMIP}/family_footer.jsx`],
    requires: [`${CHEMIP}/family_sites.jsx`, `${CHEMIP}/family_footer.jsx`, `${CHEMIP}/family_menu.jsx`],
    pages: [
      { path: "", expect: { any: [{ sel: ".fam-footer" }, /ChemEng AI/, /EPC Workbench/], ko: ["패밀리 사이트"], en: ["Family sites"] } },
    ],
  },
  {
    key: "tceq", name: "TCEQ events",
    detect: [`${CHEMIP}/product_tceq_events.jsx`],
    requires: [`${CHEMIP}/product_tceq_events.jsx`, `${CHEMIP}/tceq_events_labels.jsx`, `${CHEMIP}/tceq_events_labels_en.jsx`],
    areas: ["tx"],
    pages: [
      { path: "?view=product&pv=chemical&chem=106-99-0&anchor=tceq-events", actions: [{ scroll: true }],
        expect: { any: [{ sel: "#tceq-events" }], ko: ["텍사스 배출사고"], en: [/Texas emission event/i] }, hangul: "report" },
    ],
  },
  {
    key: "provisions", name: "Statutory provisions",
    detect: [`${CHEMIP}/product_provisions.jsx`],
    requires: [`${CHEMIP}/product_provisions.jsx`],
    areas: ["pv"],
    pages: [
      { path: `${BENZENE}&anchor=provisions`, actions: [{ scroll: true }],
        expect: { any: [{ sel: "#provisions" }], ko: ["근거 조문"], en: [/Statutory provisions/] }, hangul: "report" },
    ],
  },
  {
    key: "caslink", name: "CAS link (substance page)",
    detect: [`${CHEMIP}/product_detail.jsx`],
    requires: [`${CHEMIP}/product_detail.jsx`, `${CHEMIP}/api_chemicals.jsx`],
    areas: ["p", "g"],
    pages: [
      { path: BENZENE, expect: { any: [{ sel: ".tabs" }, /71-43-2/, /MSDS/], en: [/Benzene/i] }, hangul: "report" },
      { path: "?view=product&pv=chemical&chem=99999-99-9", allowHttp: [{ re: /\/data\/v1\/p\/99999-99-9\.json/, status: 404 }, { re: /\/api\/chemicals\/99999-99-9/, status: 404 }], expect: { ko: [/찾지 못했습니다/], en: [/not found|could not find|No substance/i] } },
    ],
  },

  // ---- new services (built in parallel; detect lists the files their plans name) ----
  {
    key: "facts", name: "Facts / identifiers / UN transport",
    detect: [`${CHEMIP}/api_static_facts.jsx`, `${CHEMIP}/api_facts.jsx`, `${CHEMIP}/usearch_answer_facts.jsx`,
      `${CHEMIP}/usearch_provider_identifiers.jsx`, `${CHEMIP}/usearch_provider_transport.jsx`, `${CHEMIP}/facts_*.jsx`, `${CHEMIP}/product_facts*.jsx`],
    areas: ["f"], dataFiles: ["g/un_index.json"],
    pages: [
      // answer card reads f/ only when static data is on (api_static_facts.jsx: no /api twin) → PC site shows no card by design
      { path: "?view=search&q=benzene%20flash%20point", modes: ["off"], expect: { any: [{ sel: ".us-page" }, /-11|−11/] }, hangul: "report" },
      { path: "?view=search&q=UN1114", expect: { any: [{ sel: ".us-page" }, /1114/] }, hangul: "report" },
      { path: "?view=search&q=200-753-7", expect: { any: [{ sel: ".us-page" }, /71-43-2/] }, hangul: "report" },
      { path: BENZENE, expect: { any: [{ sel: ".tabs" }] }, hangul: "report" },
    ],
  },
  {
    key: "oel", name: "OEL comparison",
    detect: [`${CHEMIP}/product_oel*.jsx`, `${CHEMIP}/oel_*.jsx`, `${CHEMIP}/api_oel.jsx`, `${CHEMIP}/usearch_answer_oel.jsx`],
    requires: [`${CHEMIP}/product_oel.jsx`, `${CHEMIP}/api_oel.jsx`, `${CHEMIP}/oel_labels.jsx`, `${CHEMIP}/oel_labels_en.jsx`, `${CHEMIP}/usearch_provider_oel.jsx`],
    areas: ["oel"], dataFiles: ["g/oel_summary.json"],
    pages: [
      // KR notice / MSDS notations are source text (Korean) — excluded from the Hangul-in-EN check
      { path: `${BENZENE}&anchor=oel`, actions: [{ scroll: true }, { wait: 1500 }], hangulExclude: ["#oel .pd-oel-note-col", "#oel .pd-oel-note"],
        expect: { any: [{ sel: "#oel table.pd-oel-table" }, /0\.66/], ko: ["노출기준 비교"], en: [/Exposure limits/] }, hangul: "report" },
      { path: "?view=search&q=%EB%B2%A4%EC%A0%A0%20%EB%85%B8%EC%B6%9C%EA%B8%B0%EC%A4%80", allowHttp: [{ re: /\/data\/v1\/oel\/[^/]+\.json/, status: 404 }], expect: { any: [{ sel: ".us-page" }], ko: ["벤젠 노출기준"] }, langs: ["ko"], hangul: "report" },
      { path: "?view=search&q=benzene%20exposure%20limit", allowHttp: [{ re: /\/data\/v1\/oel\/[^/]+\.json/, status: 404 }], expect: { any: [{ sel: ".us-page" }], en: ["Benzene exposure limits"] }, langs: ["en"], hangul: "report" },
    ],
  },
  {
    key: "el", name: "Emergency exposure guidelines (AEGL · ERPG via DOE PAC · PAC Rev. 29) + toxic probit",
    detect: [`${CHEMIP}/product_el.jsx`, `${CHEMIP}/el_*.jsx`, `${CHEMIP}/api_el.jsx`, `${CHEMIP}/calc_toxic_probit*.jsx`],
    requires: [`${CHEMIP}/product_el.jsx`, `${CHEMIP}/api_el.jsx`, `${CHEMIP}/el_labels.jsx`, `${CHEMIP}/el_labels_en.jsx`, `${CHEMIP}/el_helpers.jsx`,
      `${CHEMIP}/usearch_answer_el.jsx`, `${CHEMIP}/el_answer_card.jsx`, `${CHEMIP}/calc_toxic_probit.jsx`, `${CHEMIP}/calc_toxic_probit_data.jsx`],
    areas: ["el"], views: ["calc"],
    pages: [
      { path: "?view=product&pv=chemical&chem=7782-50-5&anchor=el", actions: [{ scroll: true }, { wait: 2000 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        hangulExclude: ["#el [data-source-text]"],
        expect: { any: [{ sel: "#el table.pd-el-table" }, /0\.71/, /−13\.7|-13\.7/, { sel: '#el a[href*="calc=toxic_probit"]' }, { sel: '#el a[href="#oel"]' }],
          ko: ["비상대응 기준", "KORA"], en: [/Emergency exposure guidelines/, /KORA/] }, hangul: "report" },
      { path: "?view=product&pv=chemical&chem=64-19-7&anchor=el", actions: [{ scroll: true }, { wait: 2000 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        expect: { any: [{ sel: "#el table.pd-el-table" }, /ERPG/, /35/] }, hangul: "report" },
      { path: "?view=search&q=%EC%97%BC%EC%86%8C%20AEGL", expect: { any: [{ sel: ".us-answer" }, /0\.5 \/ 2 \/ 20 ppm/], ko: ["염소 · AEGL"] }, langs: ["ko"], hangul: "report" },
      { path: "?view=search&q=acetic%20acid%20ERPG", expect: { any: [{ sel: ".us-answer" }, /5 \/ 35 \/ 250 ppm/], en: [/ERPG · Acetic acid/i] }, langs: ["en"], hangul: "report" },
      { path: "?view=calc&calc=toxic_probit", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: "path.calc-chart-line.is-dashed" }, /RIVM/],
        ko: ["독성 probit", "KORA"], en: [/Toxic probit/, /KORA/] }, hangul: "report" },
      { path: "?view=calc&calc=toxic_probit&src=custom&cunit=ppm&C=400", expect: { any: [/80\.6/, /5\.863/] }, hangul: "report" },
    ],
  },
  {
    key: "reg", name: "Regulation lists + RSS",
    detect: [`${CHEMIP}/reg_view.jsx`, `${CHEMIP}/api_reg.jsx`, `${CHEMIP}/usearch_provider_reglists.jsx`],
    requires: [`${CHEMIP}/reg_view.jsx`, `${CHEMIP}/api_reg.jsx`],
    areas: ["reg"], dataFiles: ["reg/lists.json", "reg/changes.json", "reg/changes.xml"],
    views: ["reg"],
    pages: [
      { path: "?view=reg", expect: { any: [{ sel: ".reg-page" }] }, hangul: "report" },
    ],
  },
  {
    key: "feed", name: "Incident feed",
    detect: [`${CHEMIP}/api_feed.jsx`, `${CHEMIP}/feed_*.jsx`],
    areas: ["feed"], dataFiles: ["feed/latest.json"],
    views: ["feed"],
    pages: [
      { path: "?view=feed", expect: { any: [{ sel: ".feed-page" }] }, hangulExclude: [".feed-page li", ".feed-page article"], hangul: "report" },
      { path: "?view=feed&sub=71-43-2", expect: { any: [{ sel: ".feed-page" }] }, hangul: "report" },
      { path: BENZENE, actions: [{ scroll: true }], expect: { any: [{ sel: ".tabs" }] }, hangul: "report" },
    ],
  },
  {
    key: "compat", name: "Compatibility matrix + mixture GHS",
    detect: [`${CHEMIP}/safety_rules_data.jsx`, `${CHEMIP}/calc_compat*.jsx`, `${CHEMIP}/calc_mix_ghs*.jsx`, `${CHEMIP}/compat_*.jsx`, `${CHEMIP}/mixghs_*.jsx`],
    dataFiles: ["g/reactive_class.json", "g/clp_annex6.json"],
    views: ["compat", "mixghs"],
    pages: [
      { path: "?view=compat&cas=71-43-2,7722-84-1", expect: { any: [{ sel: ".sft-view" }] }, hangul: "report" },
      { path: "?view=mixghs", expect: { any: [{ sel: ".sft-view" }] }, hangul: "report" },
    ],
  },
  {
    key: "hazop", name: "HAZOP worksheet builder",
    detect: [`${CHEMIP}/hazop_*.jsx`, `${CHEMIP}/api_hazop.jsx`],
    requires: [`${CHEMIP}/hazop_view.jsx`, `${CHEMIP}/hazop_core.jsx`, `${CHEMIP}/hazop_labels.jsx`, `${CHEMIP}/hazop_labels_en.jsx`],
    views: ["hazop"],
    pages: [
      { path: "?view=hazop", expect: { any: [{ sel: ".hz-view" }, { sel: ".hz-matrix" }], ko: ["작성 보조 도구"], en: [/Worksheet aid/] }, hangul: "report" },
      // 예시 불러오기(확인 창은 자동 수락) → 기록지 2줄·위험도 8(높음)·물질 톨루엔 제안·도구 링크
      { path: "?view=hazop", actions: [{ click: ".hz-toolbar .btn:nth-child(3)" }, { wait: 2500 }, { click: ".hz-row textarea" }, { wait: 800 }],
        hangulExclude: [".hz-row", ".hz-node-name", ".hz-sub", ".hz-sg-chip", ".calc-input"],
        expect: { any: [{ sel: ".hz-row" }, { sel: ".hz-risk.is-high" }, { sel: ".hz-sg-chip" }, { sel: ".hz-links a" }] }, hangul: "report" },
    ],
  },
  {
    key: "env_calcs", name: "Tank losses (AP-42) + hazardous area helper",
    detect: [`${CHEMIP}/calc_tank_losses.jsx`, `${CHEMIP}/calc_area_class.jsx`],
    requires: [`${CHEMIP}/calc_tank_losses.jsx`, `${CHEMIP}/calc_area_class.jsx`, `${CHEMIP}/calc_facts_link.jsx`],
    views: ["calc"],
    pages: [
      { path: "?view=calc&calc=tank_losses", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, { sel: ".calc-links a" }, /AP-42/] }, hangul: "report" },
      { path: "?view=calc&calc=tank_losses&vp=cc&M=78.11&Pref=10&Tref=20&Tb=80.1&name=Benzene", expect: { any: [{ sel: ".calc-prefill" }, /78\.11/] }, hangul: "report" },
      { path: "?view=calc&calc=area_class", expect: { any: [{ sel: ".calc-chart svg path.calc-chart-line" }, /60079-10-1/] }, hangul: "report" },
    ],
  },
  {
    key: "applicability", name: "Regulatory applicability checker (PSM · Chemicals Control Act · dangerous substances)",
    detect: [`${CHEMIP}/apl_view.jsx`, `${CHEMIP}/api_applicability.jsx`],
    requires: [`${CHEMIP}/apl_view.jsx`, `${CHEMIP}/apl_psm_data.jsx`, `${CHEMIP}/apl_hazmat_data.jsx`, `${CHEMIP}/apl_labels.jsx`, `${CHEMIP}/apl_labels_en.jsx`],
    dataFiles: ["g/hazchem_quantity.json", "g/reactive_class.json"],
    views: ["applicability"],
    pages: [
      { path: "?view=applicability", expect: { any: [{ sel: ".apl-view" }, { sel: ".apl-disclaimer" }], ko: ["사전 검토용"], en: [/Pre-screening only/] }, hangul: "report" },
      // 예시(혼합 사업장 4종) → 세 법 판정 표·법별 패널. 물질 이름·NCIS 분류 칩은 원문(data-source-text)
      { path: "?view=applicability", actions: [{ click: ".apl-view .sft-examples .btn" }, { wait: 4000 }],
        hangulExclude: [".apl-row-name", ".apl-row-foot", ".apl-reasons", ".apl-table td:first-child"],
        expect: { any: [{ sel: ".apl-summary" }, { sel: ".apl-verdict.is-applies" }, /2\.55/], ko: ["2군 사업장"], en: [/Tier 2 site/] }, hangul: "report" },
    ],
  },
  {
    key: "law", name: "Korean law texts (법제처 corpus) + substance Korean legal basis",
    detect: [`${CHEMIP}/law_view.jsx`, `${CHEMIP}/api_law.jsx`, `${CHEMIP}/product_law_basis.jsx`],
    requires: [`${CHEMIP}/law_core.jsx`, `${CHEMIP}/law_labels.jsx`, `${CHEMIP}/law_labels_en.jsx`, `${CHEMIP}/law_doc.jsx`, `${CHEMIP}/law_article.jsx`],
    areas: ["law"], views: ["law"],
    pages: [
      { path: "?view=law", expect: { any: [{ sel: ".law-index" }, { sel: ".law-doc-row a[href*='law=law_000162']" }], ko: ["국내 법령 보기", "저작권법 제7조"], en: [/Korean law texts/, /Copyright Act, Article 7/] }, hangul: "report" },
      { path: "?view=law", actions: [{ fill: [".law-index input.pv-input", "사고대비물질"] }, { wait: 1500 }],
        expect: { any: [{ sel: ".law-corpus .law-hit" }, /제39조/] }, hangul: "report" },
      { path: "?view=law&law=law_000162&art=39", actions: [{ wait: 1500 }],
        expect: { any: [{ sel: "#law-art-39.is-current" }, { sel: ".law-toc" }, { sel: "#law-art-2 .law-line.l1" }, /사고대비물질의 지정/],
          ko: ["차례", "법제처 원문"], en: [/Contents/, /Official text/] }, hangul: "report" },
      { path: "?view=law&law=%ED%99%94%ED%95%99%EB%AC%BC%EC%A7%88%EA%B4%80%EB%A6%AC%EB%B2%95&q=%EC%82%AC%EA%B3%A0%EB%8C%80%EB%B9%84%EB%AC%BC%EC%A7%88", actions: [{ wait: 1500 }],
        expect: { any: [{ sel: ".law-article .law-hit" }, { sel: ".law-search-meta" }] }, hangul: "report" },
      { path: "?view=law&law=law_000162", actions: [{ click: ".law-tabs button:nth-child(3)" }, { wait: 800 }], expect: { any: [{ sel: ".law-table tr.is-current" }] }, hangul: "report" },
      { path: "?view=law&law=no_such_law", expect: { any: [{ sel: ".law-missing" }] }, hangul: "report" },
      // 황산(7664-93-9): 사고대비물질 → 화학물질관리법 제2조제6호·제39조, PSM → 산안법 시행령 제43조·별표 13 (PC 꺼짐에도)
      { path: "?view=product&pv=chemical&chem=7664-93-9&anchor=kr-law", actions: [{ scroll: true }, { wait: 2500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        expect: { any: [{ sel: "#kr-law .pd-law-chip.r-def" }, { sel: "#kr-law a[href*='view=law&law=law_000162&art=39']" }, { sel: "#kr-law .pd-law-duty" }],
          ko: ["국내 근거 조문", "참고용 정보"], en: [/Korean legal basis/, /For reference only/] }, hangul: "report" },
      { path: "?view=product&pv=chemical&chem=50-00-0&anchor=kr-law", actions: [{ scroll: true }, { wait: 2500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        expect: { any: [{ sel: "#kr-law .pd-law-mentions .law-hit" }, { sel: "#kr-law a[href*='flDownload']" }] }, hangul: "report" },
      // 에틸렌(74-85-1): KOSHA 이름 "에틸렌 ( 관용명 : ACETENE )" → 제목 에틸렌 · Ethylene(영어 이름은 f/ names.en), 카드마다 할 일 한 줄
      { path: "?view=product&pv=chemical&chem=74-85-1&anchor=kr-law", actions: [{ scroll: true }, { wait: 2500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        expect: { any: [{ sel: "#kr-law .pd-law-card .pd-law-duty" }, { sel: ".chem-hdr .pd-name-syn" }, { notText: "( 관용명 : ACETENE )" }],
          ko: ["에틸렌 · Ethylene", "매년 배출량 조사표"], en: ["Ethylene · 에틸렌", /emission survey form/] }, hangul: "report" },
      { path: "?view=search&q=%EB%B2%95%EB%A0%B9%20%EB%B3%B4%EA%B8%B0", expect: { any: [{ sel: ".us-item a[href='?view=law']" }] }, langs: ["ko"], hangul: "report" },
    ],
  },
  {
    key: "ghslabel", name: "GHS label maker",
    detect: [`${CHEMIP}/ghs_label_*.jsx`, `${CHEMIP}/api_ghs.jsx`],
    requires: [`${CHEMIP}/assets/ghs/GHS01.svg`, `${CHEMIP}/assets/ghs/GHS09.svg`, `${CHEMIP}/assets/ghs/phrases.json`],
    views: ["ghslabel"],
    pages: [
      { path: "?view=ghslabel&chem=71-43-2", expect: { any: [{ sel: ".gl-sheet" }] }, hangul: "report" },
      { path: "?view=ghslabel&pict=GHS02,GHS07&size=a5", expect: { any: [{ sel: ".gl-sheet" }] } },
    ],
  },
  {
    key: "glossary", name: "Glossary + guide full-text search",
    detect: [`${CHEMIP}/glossary_core.jsx`, `${CHEMIP}/glossary_view.jsx`, `${CHEMIP}/guide_text_core.jsx`, `${CHEMIP}/api_guide_text.jsx`],
    areas: ["gs"],
    views: ["glossary"],
    pages: [
      { path: "?view=glossary", expect: { any: [{ sel: ".gl-page" }] } },
      { path: "?view=glossary&term=echa", expect: { any: [{ sel: ".gl-page" }, /ECHA/] } },
      { path: "?view=search&q=HAZOP", expect: { any: [{ sel: ".us-group" }, /HAZOP/] }, hangul: "report" },
      { path: "?view=search&q=%EB%B0%80%ED%8F%90%EA%B3%B5%EA%B0%84", langs: ["ko"], expect: { any: [{ sel: ".us-group" }, /밀폐공간/] } },
    ],
  },
  {
    key: "prtr", name: "PRTR map",
    detect: [`${CHEMIP}/prtr_map_view.jsx`, `${CHEMIP}/api_prtr.jsx`],
    requires: [`${CHEMIP}/prtr_map_view.jsx`, `${CHEMIP}/api_prtr.jsx`],
    areas: ["prtr"], dataFiles: ["prtr/index.json"],
    views: ["prtr"],
    pages: [{ path: "?view=prtr&cas=71-43-2", expect: { any: [{ sel: ".prtr-layout" }] }, hangul: "report" }],
  },
  {
    key: "rel", name: "Related / popular / substance of the day",
    detect: [`${CHEMIP}/landing_discover*.jsx`, `${CHEMIP}/product_related*.jsx`, `${CHEMIP}/api_rel*.jsx`, `${CHEMIP}/rel_*.jsx`],
    areas: ["rel"],
    pages: [
      { path: "", expect: { any: [{ sel: ".fam-footer" }, { sel: ".ld-disc-sec" }] } },
      { path: BENZENE, actions: [{ scroll: true }], expect: { any: [{ sel: ".tabs" }, { sel: "#related" }] }, hangul: "report" },
    ],
  },
  {
    key: "tp", name: "Properties vs temperature + Joback estimation",
    detect: [`${CHEMIP}/product_tp.jsx`, `${CHEMIP}/tp_*.jsx`, `${CHEMIP}/api_tp.jsx`, `${CHEMIP}/calc_joback*.jsx`],
    requires: [`${CHEMIP}/product_tp.jsx`, `${CHEMIP}/api_tp.jsx`, `${CHEMIP}/tp_forms.jsx`, `${CHEMIP}/tp_labels.jsx`, `${CHEMIP}/tp_labels_en.jsx`],
    areas: ["tp"], views: ["calc"],
    pages: [
      { path: `${BENZENE}&anchor=tp`, actions: [{ scroll: true }, { wait: 1500 }],
        expect: { any: [{ sel: "#tp .calc-chart svg path.calc-chart-line" }, { sel: "#tp table.pd-tp-table" }], ko: ["온도별 물성"], en: [/Properties vs temperature/] }, hangul: "report" },
      { path: "?view=product&pv=chemical&chem=7732-18-5&anchor=tp", actions: [{ scroll: true }, { wait: 1500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel)\/7732-18-5\.json/, status: 404 }],   // water has no OEL / related-substance file: 404 = "none"
        expect: { any: [{ sel: "#tp .calc-chart-marker" }, /ChemSep/, /NASA CEA/] }, hangul: "report" },
      { path: "?view=calc&calc=joback", expect: { any: [{ sel: ".calc-view" }, /Joback/] }, hangul: "report" },
    ],
  },
  {
    key: "offsite", name: "Release rate + off-site consequence screening + KORA worksheet",
    detect: [`${CHEMIP}/calc_offsite.jsx`, `${CHEMIP}/calc_release.jsx`, `${CHEMIP}/kora_sheet_*.jsx`],
    requires: [`${CHEMIP}/calc_rmp_data.jsx`, `${CHEMIP}/calc_rmp_core.jsx`, `${CHEMIP}/calc_offsite_run.jsx`, `${CHEMIP}/calc_offsite_chart.jsx`,
      `${CHEMIP}/calc_source_term.jsx`, `${CHEMIP}/kora_sheet_labels.jsx`, `${CHEMIP}/kora_sheet_labels_en.jsx`, `${CHEMIP}/kora_sheet_core.jsx`,
      `${CHEMIP}/kora_sheet_table.jsx`, `${CHEMIP}/kora_sheet_print.jsx`, `${CHEMIP}/kora_sheet_panel.jsx`],
    areas: ["f"], views: ["calc"],
    pages: [
      { path: "?view=calc&calc=release&phase=liquid&Dt=3", expect: { any: [{ sel: ".calc-chart svg" }], ko: ["누출량"], en: [/Release rate/] }, hangul: "report" },
      { path: "?view=calc&calc=release&phase=gas&V=1", expect: { any: [{ sel: ".calc-chart svg" }], ko: [/막힘/], en: [/Choked/] }, hangul: "report" },
      { path: "?view=calc&calc=offsite", actions: [{ wait: 1500 }],
        allowHttp: [{ re: /\/data\/v1\/(el|f)\/[^/]+\.json/, status: 404 }],
        expect: { any: [{ sel: ".kora-panel .kora-table" }], ko: ["KORA 입력 준비표", "참고용"], en: [/KORA input worksheet/, /reference only/] }, hangul: "report" },
      { path: "?view=calc&calc=offsite&basis=us&cat=flam&sub_f=74-98-6&QS=22679.6", expect: { any: [{ sel: ".calc-chart svg" }, /0\.479/] }, hangul: "report" },
    ],
  },
  {
    key: "catrules", name: "Substance page: international lists merged (name variants once, intl_lists) + rules by hazard class",
    detect: [`${CHEMIP}/product_catrules.jsx`, `${CHEMIP}/catrule_*.jsx`, `${CHEMIP}/api_catrules.jsx`, `${CHEMIP}/intl_merge.jsx`, `${CHEMIP}/api_intl.jsx`],
    requires: [`${CHEMIP}/product_catrules.jsx`, `${CHEMIP}/catrule_data.jsx`, `${CHEMIP}/catrule_core.jsx`, `${CHEMIP}/catrule_labels.jsx`,
      `${CHEMIP}/catrule_labels_en.jsx`, `${CHEMIP}/api_catrules.jsx`, `${CHEMIP}/intl_merge.jsx`, `${CHEMIP}/api_intl.jsx`],
    areas: ["p", "f", "g"], dataFiles: ["g/clp_annex6.json", "g/rulebook.json"],
    pages: [
      // ethylene: 13 lists in 9 jurisdictions (CAA 112(r) and TRI once each, TSCA/DSL/AIIC/China/GB MCL added); PSM 제1호 5,000 kg, OSHA PSM, Seveso P2
      { path: "?view=product&pv=chemical&chem=74-85-1&anchor=catrules", actions: [{ scroll: true }, { wait: 2500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        hangulExclude: ["#intl-regulation .pd-reg-entry", "#catrules .pd-reg-entry.muted"],
        expect: { any: [{ sel: "#catrules .pd-reg-group" }, /5,000 kg/, /10,000 lb/, /P2/], ko: ["분류로 걸리는 규제", /목록 \d+개 · \d+개 국가·기구/, "다른 이름: Ethene"],
          en: [/Rules by hazard class/, /\d+ lists · \d+ jurisdictions/, /Also listed as: Ethene/] }, hangul: "report" },
      // benzene: liquid — PSM 제2호, 별표 9 제4호나 400 L, 위험물 제1석유류 200 L (MSDS 15항), Seveso P5c
      { path: `${BENZENE}&anchor=catrules`, actions: [{ scroll: true }, { wait: 2500 }],
        hangulExclude: ["#intl-regulation .pd-reg-entry", "#catrules .pd-reg-entry.muted"],
        expect: { any: [{ sel: "#catrules .pd-reg-group" }, /400 L/, /200 L/, /P5c/] }, hangul: "report" },
    ],
  },
  {
    key: "eu_reach", name: "Substance page: EU REACH registration (ECHA CHEM: bundled g/intl_add or on-demand /api/reach) + SVHC + DWD",
    detect: [`${CHEMIP}/api_intl.jsx`, `${CHEMIP}/intl_merge.jsx`],
    requires: [`${CHEMIP}/api_intl.jsx`, `${CHEMIP}/intl_merge.jsx`, `${CHEMIP}/reg_list_names_en.jsx`, `${CHEMIP}/api_reach.jsx`,
      `${CHEMIP}/intl_reach.jsx`, `${CHEMIP}/reach_format.jsx`, `${CHEMIP}/reach_labels.jsx`, `${CHEMIP}/reach_labels_en.jsx`, `${CHEMIP}/product_intl_reach.jsx`],
    areas: ["p", "g"], dataFiles: ["g/intl_add.json", "g/rulebook.json"],
    pages: [
      ...["74-85-1", "71-43-2", "50-00-0"].map(cas => ({
        path: `?view=product&pv=chemical&chem=${cas}&anchor=intl-regulation`, actions: [{ scroll: true }, { wait: 2500 }, { click: EU_JUR_BUTTON }, { wait: 1200 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        hangulExclude: ["#intl-regulation .pd-reg-entry", "#catrules .pd-reg-entry.muted"],
        expect: { any: [{ sel: "#intl-regulation .pd-reach-facts" }, /chem\.echa\.europa\.eu/, "Source: European Chemicals Agency, https://echa.europa.eu/"],
          ko: ["EU REACH 등록물질", /활성 등록/, "톤수 구간", "최초 등록일"], en: [/REACH registered substances/, /Active registrations/, /Total tonnage band/] }, hangul: "report" })),
      { path: "?view=product&pv=chemical&chem=117-81-7&anchor=intl-regulation", actions: [{ scroll: true }, { wait: 2500 }, { click: EU_JUR_BUTTON }, { wait: 1200 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        hangulExclude: ["#intl-regulation .pd-reg-entry", "#catrules .pd-reg-entry.muted"],
        expect: { any: [{ sel: "#intl-regulation .pd-reach-facts" }],
          ko: ["EU REACH 등록물질", "고우려물질(SVHC)", /활성 등록/], en: [/REACH registered substances/, /Candidate List of SVHC/] }, hangul: "report" },
      // MTBE is not in the bundled ~250: the page asks /api/reach (on-demand). PC off here = /api 503 → graceful "unknown" line.
      { path: "?view=product&pv=chemical&chem=1634-04-4&anchor=intl-regulation", modes: ["off"], actions: [{ scroll: true }, { wait: 3000 }, { click: EU_JUR_BUTTON }, { wait: 1500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        hangulExclude: ["#intl-regulation .pd-reg-entry", "#catrules .pd-reg-entry.muted"],
        expect: { any: [{ sel: "#intl-regulation .pd-reach-entry" }, "Source: European Chemicals Agency"],
          ko: ["EU REACH 등록물질", "등록 현황을 확인할 수 없습니다"], en: [/REACH registered substances/, /registration status is unknown/] }, hangul: "report" },
    ],
  },
  {
    key: "intl_reg_add", name: "Substance page: US DOT HMT + RQ, Japan PRTR/ISHL/CSCL priority, Canada NPRI via g/intl_reg_add shards",
    detect: [`${CHEMIP}/intl_reg_add.jsx`],
    requires: [`${CHEMIP}/intl_reg_add.jsx`, `${CHEMIP}/api_intl.jsx`, `${CHEMIP}/product_labels_en.jsx`],
    areas: ["p", "g"], dataFiles: ["g/intl_reg_add.json"],
    pages: [
      ...["74-85-1", "71-43-2", "7664-41-7", "50-00-0"].map(cas => ({
        path: `?view=product&pv=chemical&chem=${cas}&anchor=intl-regulation`, actions: [{ scroll: true }, { wait: 2500 }],
        allowHttp: [{ re: /\/data\/v1\/(oel|rel|tp|tx|pv|el|feed\/by-cas)\/[^/]+\.json/, status: 404 }],
        hangulExclude: ["#intl-regulation .pd-reg-entry", "#catrules .pd-reg-entry.muted"],
        expect: { any: [{ sel: "#intl-regulation" }, /UN\d{4}/, /match: /],
          ko: ["DOT 위험물 운송표", "일본"], en: [/DOT Hazardous Materials Table/, /Japan/] }, hangul: "report" })),
    ],
  },
];

const DEFAULTS = {
  langs: ["ko", "en"],
  widths: [1440, 390],
  heights: { 1440: 900, 390: 844 },
  timeoutMs: 30000,
  settleMs: 1500,
  hangulMax: 0,
};

module.exports = { SERVICES, STATIC_AREAS, ALLOW_HTTP, HANGUL_EXCLUDE, DEFAULTS, CHEMIP };
