// GHS 그림문자·경고표지 만들기(public/chemip/ghs_*.jsx) 시험 — 화면 없이 순수 함수와 통합 검색 묶음.
// (1) 그림문자·신호어·H/P 문구 읽기, (2) MSDS 2항 → 입력 칸, (3) 문구표 채우기·번역·예방조치문구 줄이기·표지 내용,
// (4) 딥링크, (5) 통합 검색 묶음, (6) 그림 파일 9개·문구표 모양, (7) 실제 정적 자료(있으면) 2항 몇 건.
// 번역은 빌드와 같은 vendored Babel·설정. 화면 언어 ko·en 두 벌로 올린다.
//
//   node frontend/scripts/tests/test_ghs_label.cjs [--pages E:\dev-cache\chemip-static\out\v1\p]
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
const MODULES = [
  "lang.jsx", "ghs_labels.jsx", "ghs_labels_en.jsx", "ghs_helpers.jsx", "ghs_label_url.jsx", "ghs_label_build.jsx",
  "usearch_core.jsx", "usearch_provider_ghslabel.jsx",
];
const argPages = (() => { const i = process.argv.indexOf("--pages"); return i > 0 ? process.argv[i + 1] : "E:\\dev-cache\\chemip-static\\out\\v1\\p"; })();

function load(lang) {
  const sandbox = { console, URLSearchParams, URL, location: { search: `?lang=${lang}`, href: `http://t/chemip?lang=${lang}` } };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of MODULES) {
    const code = babel.transform(fs.readFileSync(path.join(CHEMIP, rel), "utf8"), { ...BABEL_OPTIONS, filename: rel }).code;
    vm.runInContext(code, ctx, { filename: rel });
  }
  return sandbox;
}

const results = [];
function check(name, ok, note = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? ` — ${note}` : ""}`);
}
const J = (v) => JSON.stringify(v);

// KOSHA 물질 상세 응답 모양(2항만) — 000001 염산 구아니딘 원문 그대로 일부
const SECTIONS = [
  { section_seq: 1, content: [{ msdsItemCode: "A02", msdsItemNameKor: "제품명", itemDetail: "염산 구아니딘" }] },
  { section_seq: 2, content: [
    { msdsItemCode: "B02", itemDetail: "급성 독성(경구) : 구분4|피부 부식성/피부 자극성 : 구분2" },
    { msdsItemCode: "B04", lev: "1" },
    { msdsItemCode: "B0402", itemDetail: "GHS07.gif|GHS11.gif" },
    { msdsItemCode: "B0404", itemDetail: "경고" },
    { msdsItemCode: "B0406", itemDetail: "H302 : 삼키면 유해함|H315 : 피부에 자극을 일으킴|H319 : 눈에 심한 자극을 일으킴" },
    { msdsItemCode: "B040802", itemDetail: "P261 : 분진·흄·가스·미스트·증기·스프레이의 흡입을 피하시오.|P264 : 취급 후에는 손을 철저히 씻으시오.|P270 : 이 제품을 사용할 때에는 먹거나, 마시거나 흡연하지 마시오.|P280 : 보호장갑을 착용하시오." },
    { msdsItemCode: "B040804", itemDetail: "P301+P312 : 삼켰다면:불편함을 느끼면 의료기관/의사/…의 진찰을 받으시오.|P302+P352 : 피부에 묻으면:다량의 물로 씻으시오.|P330 : 입을 씻어내시오." },
    { msdsItemCode: "B040806", itemDetail: "P405 : 잠금장치를 하여 저장하시오." },
    { msdsItemCode: "B040808", itemDetail: "P501 : 폐기물 관련 법령에 따라 내용물/용기를 폐기하시오" },
    { msdsItemCode: "B06", itemDetail: "자료없음" },
  ] },
];
const DETAIL = { chem_id: "000001", name: "염산 구아니딘 (Guanidinium chloride)", name_en: "Guanidinium chloride", cas_no: "50-01-1", sections: SECTIONS };
const PHRASES = {
  en: { H302: "Harmful if swallowed", H315: "Causes skin irritation", P301: "IF SWALLOWED:", P312: "Call a POISON CENTER/doctor if you feel unwell.",
    P264: "Wash hands thoroughly after handling.", P501: "Dispose of contents/container to ...", P102: "Keep out of reach of children." },
  ko: { H302: "삼키면 유해함", P264: "취급 후에는 손을 철저히 씻으시오.", P316: "즉시 응급 의료 도움을 받으시오." },
  ko_unofficial: ["P316"],
};

function main() {
  const W = load("ko");
  const WE = load("en");

  /* ── (1) 읽기 ── */
  check("그림문자: KOSHA 원문 'GHS02.gif|GHS07.gif|GHS08.gif'", J(W.ghsParsePictograms("GHS02.gif|GHS07.gif|GHS08.gif").codes) === J(["GHS02", "GHS07", "GHS08"]));
  const odd = W.ghsParsePictograms("ghs2, GHS 09 · GHS07.gif|GHS07.png|GHS11.gif");
  check("그림문자: 소문자·한 자리·공백·겹침·알 수 없는 코드", J(odd.codes) === J(["GHS02", "GHS09", "GHS07"]) && J(odd.unknown) === J(["GHS11"]), J(odd));
  check("그림문자: 빈 값·자료없음", W.ghsParsePictograms("자료없음").codes.length === 0 && W.ghsParsePictograms(null).codes.length === 0);
  check("그림문자 경로 한 곳", W.ghsPictogramSrc("GHS05") === "assets/ghs/GHS05.svg");
  check("신호어: 위험/경고/Danger/Warning/없음", W.ghsParseSignal("위험") === "danger" && W.ghsParseSignal("경고") === "warning"
    && W.ghsParseSignal("Danger") === "danger" && W.ghsParseSignal("warning") === "warning" && W.ghsParseSignal("자료없음") === "");
  const st = W.ghsParseStatements("H302 : 삼키면 유해함|H315 : 피부에 자극을 일으킴|H302 : 다시");
  check("H 문구: 'H302 : 문장' 줄, 같은 코드는 처음 것만", J(st) === J([{ code: "H302", text: "삼키면 유해함" }, { code: "H315", text: "피부에 자극을 일으킴" }]), J(st));
  const combo = W.ghsParseStatements("P305+P351+P338 : 눈에 묻으면: 몇 분간 물로 조심해서 씻으시오.");
  check("P 문구: 묶음 코드·문장 안 쌍점", combo[0].code === "P305+P351+P338" && combo[0].text.startsWith("눈에 묻으면:"), J(combo));
  const list = W.ghsParseStatements("P203, P210, P233, and P501");
  check("P 문구: 코드만 늘어놓은 줄(PubChem 모양) → 코드마다", J(list.map(x => x.code)) === J(["P203", "P210", "P233", "P501"]) && list.every(x => x.text === ""));
  const typed = W.ghsParseStatements("H225\nP 210 : 열을 피하시오\n화기 엄금\nH360FD : x\nH350i: y");
  check("직접 넣기: 코드만·공백 든 코드·코드 없는 줄·대소문자 뒤 글자", J(typed.map(x => x.code)) === J(["H225", "P210", "", "H360FD", "H350i"])
    && typed[2].text === "화기 엄금", J(typed));
  check("P 묶음: P1 일반·P2 예방·P3 대응·P4 저장·P5 폐기", ["P101", "P280", "P301+P312", "P405", "P501", "H302", ""].map(W.ghsPGroupOf).join(",")
    === "general,prevention,response,storage,disposal,,");

  /* ── (2) MSDS 2항 ── */
  const s2 = W.ghsSection2(SECTIONS);
  check("2항: 그림문자·알 수 없는 코드·신호어", J(s2.pictograms) === J(["GHS07"]) && J(s2.unknownPictograms) === J(["GHS11"]) && s2.signal === "warning" && s2.has);
  check("2항: H 3개, P 예방 4·대응 3·저장 1·폐기 1", s2.hazards.length === 3 && s2.precautions.prevention.length === 4 && s2.precautions.response.length === 3
    && s2.precautions.storage.length === 1 && s2.precautions.disposal.length === 1);
  check("2항 없음 → has false, 빈 목록", !W.ghsSection2([{ section_seq: 1, content: [] }]).has && W.ghsSection2(null).hazards.length === 0);
  const form = W.ghsFormFromSection2(s2, DETAIL, "ko");
  check("입력 칸: 이름 괄호 영문 떼기·CAS·그림문자", form.product === "염산 구아니딘" && form.cas === "50-01-1" && J(form.pictograms) === J(["GHS07"]));
  check("입력 칸: 영어 표지 이름 = name_en", W.ghsFormFromSection2(s2, DETAIL, "en").product === "Guanidinium chloride");
  check("입력 칸: H 칸은 'H302 : 문장' 줄", form.hazards.split("\n")[0] === "H302 : 삼키면 유해함" && form.hazards.split("\n").length === 3);

  /* ── (3) 문구표·번역·줄이기·표지 ── */
  check("문구표: 있는 코드", W.ghsPhraseFor("H302", "en", PHRASES).text === "Harmful if swallowed");
  const joined = W.ghsPhraseFor("P301+P312", "en", PHRASES);
  check("문구표: 묶음 코드가 없으면 낱개 문장 잇기", joined.text === "IF SWALLOWED: Call a POISON CENTER/doctor if you feel unwell." && !joined.fallback, J(joined));
  const fb = W.ghsPhraseFor("P102", "ko", PHRASES);
  check("문구표: 표지 언어 문장이 없으면 다른 언어(fallback)", fb.text === "Keep out of reach of children." && fb.fallback);
  check("문구표: 비공식 번역 표시", W.ghsPhraseFor("P316", "ko", PHRASES).unofficial && !W.ghsPhraseFor("P264", "ko", PHRASES).unofficial);
  check("문구표 없음 → 빈 문장", W.ghsPhraseFor("H302", "en", null).text === "");
  const tr = W.ghsTranslateText("H302 : 삼키면 유해함\nH319 : 눈에 심한 자극을 일으킴\n손으로 쓴 줄", "en", PHRASES);
  check("번역: 문구표에 있는 코드만 바꾸고 나머지 줄 그대로", tr === "H302 : Harmful if swallowed\nH319 : 눈에 심한 자극을 일으킴\n손으로 쓴 줄", tr);
  const tf = W.ghsTranslateForm(form, "en", PHRASES);
  check("번역: 입력 칸 전체(H·P 4칸)", tf.hazards.startsWith("H302 : Harmful") && tf.precautions.prevention.includes("P264 : Wash hands"));

  const items = (n, group) => Array.from({ length: n }, (_, i) => ({ code: `P${i}`, group }));
  const many = [...items(5, "prevention"), ...items(4, "response"), ...items(2, "storage"), ...items(1, "disposal")];
  const ab = W.ghsAbbreviate(many);
  check("줄이기: 12개 → 6개, 예방·대응·저장·폐기 하나 이상, 원래 순서", ab.shown.length === 6 && ab.omitted === 6
    && ["prevention", "response", "storage", "disposal"].every(g => ab.shown.some(x => x.group === g))
    && ab.shown.map(x => many.indexOf(x)).every((v, i, a) => i === 0 || a[i - 1] < v), J(ab.shown.map(x => x.group)));
  check("줄이기: 6개 이하면 그대로", W.ghsAbbreviate(items(6, "prevention")).omitted === 0);
  check("줄이기 기본값: A4 끔, A5·소형 켬", !W.ghsDefaultAbbreviate("a4") && W.ghsDefaultAbbreviate("a5") && W.ghsDefaultAbbreviate("small"));

  const supplier = { name: "(주)예시화학", address: "서울시", phone: "02-000-0000", emergency: "119" };
  const label = W.ghsBuildLabel({ form, supplier, lang: "ko", size: "a5", abbreviate: true, phrases: PHRASES });
  check("표지(ko·A5): 크기·이름·신호어·그림문자 대체 글", label.size.k === "a5" && label.product === "염산 구아니딘" && label.signal.text === "경고"
    && label.pictograms.length === 1 && label.pictograms[0].alt === "GHS07 경고(자극성 등)" && label.pictograms[0].src === "assets/ghs/GHS07.svg");
  check("표지(ko·A5): P 9개 → 6개 + MSDS 참고, 묶음 순서", label.precautionCount === 9 && label.omitted === 3 && label.seeSds
    && J(label.precautions.map(g => g.group)) === J(["prevention", "response", "storage", "disposal"]), J(label.precautions.map(g => [g.group, g.items.length])));
  check("표지(ko): 표지 글은 한국어", label.text.hazards === "유해·위험문구" && label.text.seeSds.includes("물질안전보건자료"));
  check("표지: 공급자·긴급 연락처", label.supplier.name === "(주)예시화학" && label.emergency === "119");
  const full = W.ghsBuildLabel({ form, supplier, lang: "ko", size: "a4", abbreviate: false, phrases: PHRASES });
  check("표지(A4, 줄이지 않음): P 9개 모두", full.precautions.reduce((n, g) => n + g.items.length, 0) === 9 && !full.seeSds);
  const enForm = W.ghsTranslateForm(W.ghsFormFromSection2(s2, DETAIL, "en"), "en", PHRASES);
  const en = W.ghsBuildLabel({ form: enForm, supplier: {}, lang: "en", size: "small", abbreviate: true, phrases: PHRASES });
  check("표지(en·소형): 영어 표지 글·신호어·그림문자 이름(화면 언어와 무관)", en.text.hazards === "Hazard statements" && en.signal.text === "Warning"
    && en.pictograms[0].alt === "GHS07 Harmful / irritant" && en.hazards[0].text === "Harmful if swallowed" && en.size.k === "small");
  check("표지: 빈 공급자 칸은 빈 글자(밑줄로 그림)", en.supplier.name === "" && en.emergency === "");
  const man = W.ghsBuildLabel({ form: { ...W.ghsEmptyForm(), hazards: "H302\nH999", precautions: { prevention: "P301+P312", response: "", storage: "", disposal: "" } }, lang: "en", size: "a5", abbreviate: true, phrases: PHRASES });
  check("직접 넣기: 코드만 → 문구표 문장, 모르는 코드는 빈 문장, P3xx 를 예방 칸에 적어도 대응 묶음", man.hazards[0].text === "Harmful if swallowed"
    && man.hazards[1].code === "H999" && man.hazards[1].text === "" && man.precautions[0].group === "response");
  check("직접 넣기: 9종 밖 그림문자 코드는 빼고 그림", W.ghsBuildLabel({ form: { ...W.ghsEmptyForm(), pictograms: ["GHS02", "GHS11"] }, lang: "ko", size: "a4" }).pictograms.length === 1);
  check("크기: 모르는 키 → 기본(A5)", W.ghsLabelSize("x").k === "a5");

  /* ── (4) 딥링크 ── */
  const href = W.ghsLabelHref({ chem: "000001", pict: ["GHS02", "GHS07"], size: "small", lang: "en" });
  check("딥링크 만들기", href === "?view=ghslabel&chem=000001&pict=GHS02%2CGHS07&size=small&llang=en", href);
  const rl = W.ghsLabelReadLink(href);
  check("딥링크 읽기(왕복)", rl.chem === "000001" && J(rl.pict) === J(["GHS02", "GHS07"]) && rl.size === "small" && rl.lang === "en", J(rl));
  const bad = W.ghsLabelReadLink("?view=ghslabel&size=a3&llang=fr&pict=GHS44");
  check("딥링크: 모르는 크기·언어·코드는 버림", bad.size === "" && bad.lang === "" && bad.pict.length === 0 && bad.chem === "");
  check("딥링크: 기본", W.ghsLabelHref() === "?view=ghslabel");

  /* ── (5) 통합 검색 묶음 ── */
  const run = (X, q) => X.USP_GHS_LABEL.search(X.usCleanQuery(q)).items.map(i => i.id);
  check("통합 검색: '경고표지' → 도구 첫째", run(W, "경고표지")[0] === "g:tool", J(run(W, "경고표지")));
  check("통합 검색: 'GHS label'(영어) → 도구 첫째, 한국어 화면에서도", run(W, "GHS label")[0] === "g:tool" && run(WE, "GHS label")[0] === "g:tool");
  check("통합 검색: 'GHS02' → 인화성 그림문자", run(W, "GHS02")[0] === "g:GHS02");
  check("통합 검색: '인화성'·'Corrosive' → 그 그림문자", run(W, "인화성")[0] === "g:GHS02" && run(WE, "Corrosive")[0] === "g:GHS05");
  check("통합 검색: 관계없는 말 → 없음", run(W, "레이놀즈").length === 0 && run(W, "  ").length === 0);
  const tool = W.USP_GHS_LABEL.search("경고표지").items[0];
  const toolEn = WE.USP_GHS_LABEL.search("GHS label").items[0];
  check("통합 검색: 결과 이름·주소(화면 언어)", tool.title === "경고표지(GHS 라벨) 만들기" && tool.href === "?view=ghslabel" && toolEn.title === "GHS label maker");
  check("통합 검색: 그림문자 결과 주소에 pict", W.USP_GHS_LABEL.search("GHS05").items[0].href === "?view=ghslabel&pict=GHS05");

  /* ── (6) 파일 ── */
  const dir = path.join(CHEMIP, "assets", "ghs");
  const svgs = W.GHS_PICTOGRAM_CODES.map(c => path.join(dir, `${c}.svg`));
  const svgOk = (f) => { const t = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : ""; return /<svg[\s>]/.test(t) && /viewBox=/.test(t) && !/<script|\son[a-z]+\s*=/i.test(t); };
  check("그림 파일 9개(SVG·viewBox, 스크립트·이벤트 속성 없음)", svgs.every(svgOk), svgs.filter(f => !svgOk(f)).map(f => path.basename(f)).join(", "));
  check("출처·라이선스 README", fs.existsSync(path.join(dir, "README.md")) && /UNECE/.test(fs.readFileSync(path.join(dir, "README.md"), "utf8")) && /Public domain/i.test(fs.readFileSync(path.join(dir, "README.md"), "utf8")));
  const pf = path.join(dir, "phrases.json");
  const ph = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, "utf8")) : null;
  check("문구표 모양: en·ko·ko_unofficial, H302·P501 두 언어", ph && ph.v === 1 && ph.en.H302 && ph.ko.H302 && ph.en.P501 && ph.ko.P501 && Array.isArray(ph.ko_unofficial)
    && !Object.values(ph.en).some(t => /^\(Deleted\)/.test(t)), ph ? `${Object.keys(ph.en).length} en / ${Object.keys(ph.ko).length} ko` : "없음");

  /* ── (7) 실제 정적 자료(있으면) ── */
  if (fs.existsSync(argPages)) {
    const files = fs.readdirSync(argPages).filter(f => /^\d{6}\.json$/.test(f)).slice(0, 4000).filter((_, i) => i % 20 === 0);
    let seen = 0, withPict = 0, okAll = true, firstBad = "";
    for (const f of files) {
      let buf = fs.readFileSync(path.join(argPages, f));
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = zlib.gunzipSync(buf);
      const page = JSON.parse(buf.toString("utf8"));
      const s = W.ghsSection2(page.detail.sections);
      if (!s.has) continue;
      seen += 1;
      const raw = W.ghsSection2Items(page.detail.sections)[W.GHS_MSDS_ITEMS.pictograms] || "";
      const n = (raw.match(/GHS0[1-9]/g) || []).length;
      if (n) withPict += 1;
      const lab = W.ghsBuildLabel({ form: W.ghsFormFromSection2(s, page.detail, "ko"), lang: "ko", size: "small", abbreviate: true, phrases: ph });
      const pCount = lab.precautions.reduce((k, g) => k + g.items.length, 0);
      const ok = s.pictograms.length === new Set(raw.match(/GHS0[1-9]/g) || []).size && pCount <= 6 && lab.hazards.every(h => h.code || h.text);
      if (!ok && okAll) { okAll = false; firstBad = f; }
    }
    check("실제 KOSHA 2항: 그림문자 수 = 원문 코드 수, 소형 표지 P ≤ 6, 빈 줄 없음", okAll && seen > 0, `${seen}건(그림문자 있음 ${withPict})${firstBad ? `, 첫 실패 ${firstBad}` : ""}`);
  } else {
    console.log(`SKIP 실제 정적 자료 — ${argPages} 없음`);
  }

  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
