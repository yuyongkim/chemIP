// 혼합물 GHS 분류 · 예시(ECHA 「Guidance on the Application of the CLP Criteria」 예제의 성분·함량·분류를 그대로). 이름은 지침의 영문 이름.
// 화면의 "예시 불러오기" 와 시험(frontend/scripts/tests/test_safety_tools.cjs)이 같은 자료를 쓴다. 행 모양은 mixghs_view.jsx 의 행과 같다.

const MIXGHS_EXAMPLES = {
  // Part 3 v5.0, 3.1.5.3.1 Example 11 — ATEmix 148 mg/kg bw → Acute Tox. 3 (oral)
  acute: [
    { name: "Ingredient 1", c: "4", typed: "Acute Tox. 3 H301\noral: ATE = 125 mg/kg bw" },
    { name: "Ingredient 2", c: "92", typed: "", unknownAcute: true },
    { name: "Ingredient 3", c: "3", typed: "Acute Tox. 4 H302\noral: ATE = 1500 mg/kg bw" },
    { name: "Ingredient 4", c: "0.9", typed: "", unknownAcute: true },
    { name: "Ingredient 5", c: "0.2", typed: "Acute Tox. 2 H300\noral: ATE = 10 mg/kg bw" },
  ],
  // Part 3 v5.0, 3.2.5.2.1 Example 4 — Skin Corr. 1 sum 0.94 (no), Skin Irrit. 2 sum 3.46 (yes)
  skin: [
    { name: "Substance A", c: "3.8", typed: "Skin Irrit. 2" },
    { name: "Substance B", c: "0.5", typed: "" },
    { name: "Base E", c: "5.4", typed: "Skin Corr. 1B\nSkin Corr. 1B; H314: C ≥ 10 %\nSkin Irrit. 2; H315: 5 % ≤ C < 10 %" },
    { name: "Substance D", c: "4", typed: "" },
    { name: "Substance F", c: "2", typed: "Skin Corr. 1B" },
    { name: "Water", c: "84.3", typed: "" },
  ],
  // Parts 4-5 v4.0, 4.1.4.7.1 Example A — Acute: 13 (< 25, not classified); Chronic 2: 113 (≥ 25)
  aquatic: [
    { name: "Astralamid", c: "1", typed: "Aquatic Acute 1 M=10\nAquatic Chronic 1 M=10" },
    { name: "Bastralamid", c: "3", typed: "Aquatic Acute 1 M=1\nAquatic Chronic 2" },
    { name: "Castralamid", c: "10", typed: "Aquatic Chronic 2" },
    { name: "Dastralamid", c: "10", typed: "Aquatic Chronic 3" },
    { name: "Estralamid", c: "66", typed: "" },
    { name: "Festralamid", c: "10", typed: "" },
  ],
};

Object.assign(window, { MIXGHS_EXAMPLES });
