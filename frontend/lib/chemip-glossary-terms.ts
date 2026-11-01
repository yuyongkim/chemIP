// 용어사전 용어 key — sitemap 의 /chemip?view=glossary&term=<key> 절을 화면 자료 파일에서 바로 읽는다(목록을 베끼지 않는다).
// 규칙은 scripts/seo_pages/glossary_terms.py 와 같다(두 번째 사본: 정적 배포 sitemap 은 파이썬, PC 사이트 sitemap 은 이 파일).
// 순서: 약어(data.jsx GLOSSARY_KO, 소문자 key) → 계산기 용어(term_glossary.jsx TERM_GLOSSARY_KO) → 분류 자료
// (glossary_registry.jsx GLOSSARY_CATS → glossary_<k>.jsx GLOSSARY_<K>_KO). 용어사전 화면이 app.jsx 에 등록돼 있을 때만.
import fs from "node:fs";
import path from "node:path";

const UI_DIR = path.join(process.cwd(), "public", "chemip");
export const GLOSSARY_VIEW = "glossary";

const KEY_RE = /^ {2}([A-Za-z0-9_]+)\s*:\s*\{/gm;
const CAT_RE = /\{\s*k:\s*"([a-z0-9_]+)"\s*,\s*ko:\s*(GLOSSARY_[A-Z0-9_]+_KO)\b/g;

export function objectKeys(text: string, constName: string): string[] {
  const head = new RegExp(`^const ${constName}\\s*=\\s*\\{\\s*$`, "m").exec(text);
  if (!head) return [];
  const start = head.index + head[0].length;
  const end = text.indexOf("\n};", start);
  const body = text.slice(start, end >= 0 ? end : text.length);
  return [...body.matchAll(KEY_RE)].map((m) => m[1]);
}

export function abbrKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function read(name: string): string {
  try {
    return fs.readFileSync(path.join(UI_DIR, name), "utf8");
  } catch {
    return "";
  }
}

export function glossaryTermKeys(): string[] {
  if (!new RegExp(`\\{\\s*k:\\s*"${GLOSSARY_VIEW}"`).test(read("app.jsx"))) return [];
  const keys = objectKeys(read("data.jsx"), "GLOSSARY_KO").map(abbrKey);
  keys.push(...objectKeys(read("term_glossary.jsx"), "TERM_GLOSSARY_KO"));
  for (const [, cat, constName] of read("glossary_registry.jsx").matchAll(CAT_RE)) {
    keys.push(...objectKeys(read(`glossary_${cat}.jsx`), constName));
  }
  return [...new Set(keys)];
}
