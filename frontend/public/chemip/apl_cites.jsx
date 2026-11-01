// 적용 법규 판정기 · 근거 조문 목록(key → { ko, en, url }) — 판정 이유마다 이 key 하나를 붙이고 화면·CSV 가 여기서 이름·주소를 읽는다.
// 주소는 law.go.kr 한글 법령주소(법령/<법령명>/<조문>, 행정규칙/<이름>). 조문·별표 번호는 2026-10-24 받은 law.go.kr 원문으로 확인했다
// (산안법령·위험물법령: S:\chemip_trade_controls_raw\kr_safety\2026-10-24, 화학물질관리법 시행규칙: …\kr_env\law\279031.xml, 시행 2025-10-01,
//  규정수량 고시: law.go.kr 행정규칙 「유해화학물질의 규정수량에 관한 규정」 화학물질안전원고시 제2026-4호 별표 2·3·4, 2026-10-31 받음).

const APL_LAW_URL = "https://www.law.go.kr/법령/";
const APL_ADMRUL_URL = "https://www.law.go.kr/행정규칙/";

const APL_CITES = {
  // 산업안전보건법(PSM)
  psm_act44: { ko: "산업안전보건법 제44조(공정안전보고서의 작성·제출)", en: "OSH Act, Art. 44 (process safety report)", url: `${APL_LAW_URL}산업안전보건법/제44조` },
  psm_dec43_1: { ko: "산업안전보건법 시행령 제43조제1항·별표 13", en: "OSH Act Enforcement Decree, Art. 43(1) and Annex 13", url: `${APL_LAW_URL}산업안전보건법시행령/제43조` },
  psm_dec43_2: { ko: "산업안전보건법 시행령 제43조제2항(제외 설비)", en: "OSH Act Enforcement Decree, Art. 43(2) (excluded facilities)", url: `${APL_LAW_URL}산업안전보건법시행령/제43조` },
  psm_b13_n5: { ko: "시행령 별표 13 비고 5(하루 최대 제조·취급·저장량)", en: "Decree Annex 13, note 5 (maximum daily quantity)", url: `${APL_LAW_URL}산업안전보건법시행령/제43조` },
  psm_b13_n6: { ko: "시행령 별표 13 비고 6(순도 100 % 기준, 농도가 정해진 물질은 그 농도 기준)", en: "Decree Annex 13, note 6 (100 % purity basis; listed concentration for listed solutions)", url: `${APL_LAW_URL}산업안전보건법시행령/제43조` },
  psm_b13_n7: { ko: "시행령 별표 13 비고 7(R = ΣCn/Tn ≥ 1)", en: "Decree Annex 13, note 7 (R = ΣCn/Tn ≥ 1)", url: `${APL_LAW_URL}산업안전보건법시행령/제43조` },
  psm_b13_flam: { ko: "시행령 별표 13 제1·2호, 비고 1·3·4(인화성 가스·액체)", en: "Decree Annex 13, items 1–2 and notes 1, 3, 4 (flammable gas and liquid)", url: `${APL_LAW_URL}산업안전보건법시행령/제43조` },
  // 화학물질관리법
  cca_act23: { ko: "화학물질관리법 제23조(화학사고예방관리계획서의 작성·제출)", en: "Chemicals Control Act, Art. 23 (chemical accident prevention plan)", url: `${APL_LAW_URL}화학물질관리법/제23조` },
  cca_r19_2: { ko: "화학물질관리법 시행규칙 제19조제2항제2호(하위 규정수량 미만 제외)", en: "Chemicals Control Act Enforcement Rule, Art. 19(2)2 (below the lower quantity: exempt)", url: `${APL_LAW_URL}화학물질관리법시행규칙/제19조` },
  cca_r19_8: { ko: "화학물질관리법 시행규칙 제19조제8항(주요취급시설 = 상위 규정수량 이상)", en: "Enforcement Rule, Art. 19(8) (major handling facility = upper quantity or more)", url: `${APL_LAW_URL}화학물질관리법시행규칙/제19조` },
  cca_r_b4n2: { ko: "화학물질관리법 시행규칙 별표 4 비고 2(1군·2군 사업장 구분)", en: "Enforcement Rule, Annex 4, note 2 (tier 1 / tier 2 sites)", url: `${APL_LAW_URL}화학물질관리법시행규칙/제19조` },
  cca_r23_2: { ko: "화학물질관리법 시행규칙 제23조제2항(정기검사 주기)", en: "Enforcement Rule, Art. 23(2) (periodic inspection interval)", url: `${APL_LAW_URL}화학물질관리법시행규칙/제23조` },
  cca_r23_12: { ko: "화학물질관리법 시행규칙 제23조제12항(최하위 규정수량 미만)", en: "Enforcement Rule, Art. 23(12) (below the lowest quantity)", url: `${APL_LAW_URL}화학물질관리법시행규칙/제23조` },
  cca_r27: { ko: "화학물질관리법 시행규칙 제27조제1항제1호·제7항(영업허가·영업신고)", en: "Enforcement Rule, Art. 27(1)1 and 27(7) (business permit / notification)", url: `${APL_LAW_URL}화학물질관리법시행규칙/제27조` },
  cca_notice: { ko: "「유해화학물질의 규정수량에 관한 규정」(화학물질안전원고시) 별표 2·3", en: "NICS notice on prescribed quantities of hazardous chemicals, Annexes 2–3", url: `${APL_ADMRUL_URL}유해화학물질의규정수량에관한규정` },
  cca_notice_b4: { ko: "「유해화학물질의 규정수량에 관한 규정」 제4조·별표 4(최대보유량 산정)", en: "NICS quantity notice, Art. 4 and Annex 4 (maximum holding)", url: `${APL_ADMRUL_URL}유해화학물질의규정수량에관한규정` },
  // 위험물안전관리법
  hz_act5: { ko: "위험물안전관리법 제5조(지정수량 이상 저장·취급, 제5항 배수 합산)", en: "Dangerous Substances Act, Art. 5 (designated quantity; 5(5) sum of multiples)", url: `${APL_LAW_URL}위험물안전관리법/제5조` },
  hz_act4: { ko: "위험물안전관리법 제4조(지정수량 미만 — 시·도 조례)", en: "Dangerous Substances Act, Art. 4 (below the designated quantity: local ordinance)", url: `${APL_LAW_URL}위험물안전관리법/제4조` },
  hz_act6: { ko: "위험물안전관리법 제6조(제조소등 설치허가)", en: "Dangerous Substances Act, Art. 6 (installation permit)", url: `${APL_LAW_URL}위험물안전관리법/제6조` },
  hz_dec_b1: { ko: "위험물안전관리법 시행령 제3조·별표 1(위험물 및 지정수량)", en: "Dangerous Substances Act Enforcement Decree, Art. 3 and Annex 1", url: `${APL_LAW_URL}위험물안전관리법시행령/제3조` },
  hz_act15: { ko: "위험물안전관리법 제15조·시행령 제13조·별표 6(안전관리자)", en: "Act Art. 15; Decree Art. 13 and Annex 6 (safety manager)", url: `${APL_LAW_URL}위험물안전관리법/제15조` },
  hz_dec15: { ko: "위험물안전관리법 제17조·시행령 제15조(예방규정)", en: "Act Art. 17; Decree Art. 15 (prevention rules)", url: `${APL_LAW_URL}위험물안전관리법시행령/제15조` },
  hz_dec16: { ko: "위험물안전관리법 시행령 제16조(정기점검)", en: "Decree Art. 16 (periodic self-inspection)", url: `${APL_LAW_URL}위험물안전관리법시행령/제16조` },
  hz_dec17: { ko: "위험물안전관리법 시행령 제17조(정기검사, 50만 L 이상 옥외탱크저장소)", en: "Decree Art. 17 (periodic inspection, outdoor tanks of 500,000 L or more)", url: `${APL_LAW_URL}위험물안전관리법시행령/제17조` },
  hz_dec18: { ko: "위험물안전관리법 제19조·시행령 제18조·별표 8(자체소방대)", en: "Act Art. 19; Decree Art. 18 and Annex 8 (on-site fire brigade)", url: `${APL_LAW_URL}위험물안전관리법시행령/제18조` },
  hz_rule_b6: { ko: "위험물안전관리법 시행규칙 별표 6 Ⅸ제1호가목·제2호(옥외탱크저장소 방유제 110 %·100 %)", en: "Enforcement Rule, Annex 6 IX 1(a) and 2 (outdoor tank dike 110 % / 100 %)", url: `${APL_LAW_URL}위험물안전관리법시행규칙/제30조` },
  hz_rule_b4: { ko: "위험물안전관리법 시행규칙 별표 4 Ⅸ제1호나목(제조소 옥외 취급탱크 방유제 50 %·10 %)", en: "Enforcement Rule, Annex 4 IX 1(b) (process tank dike 50 % + 10 %)", url: `${APL_LAW_URL}위험물안전관리법시행규칙/제28조` },
  cca_r_b5: { ko: "화학물질관리법 시행규칙 별표 5 제1호(방류벽 등 집수설비) — 용량 기준은 취급시설 고시 확인 필요", en: "Chemicals Control Act Enforcement Rule, Annex 5 (dikes); capacity detail in the facility notice, to be confirmed", url: `${APL_LAW_URL}화학물질관리법시행규칙/제21조` },
};

function aplCite(key) {
  const c = APL_CITES[key];
  return c ? { key, name: tr(c.ko, c.en), url: c.url } : null;
}

Object.assign(window, { APL_CITES, aplCite });
