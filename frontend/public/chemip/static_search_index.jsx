// 정적 검색 · 색인 읽기와 FTS5 흉내 — 시범 static_search.py 의 StaticIndex(파일 접근·FTS 부분)를 옮겼다.
// 파일은 직접 받지 않는다. 생성할 때 load(rel) → Promise<객체|null> 를 넘겨받는다(api_static.jsx 가 fetch 로 채운다).
// FTS5 규칙: unicode61 토큰, 질의 '"<q>"* OR <q>*', 문법 오류면 정확한 구, bm25(k1=1.2, b=0.75) 를 구마다 더한다,
// 정렬은 KOSHA 먼저 → 점수 → rowid.

const SSI_K1 = 1.2;
const SSI_B = 0.75;
const SSI_TOKEN_CHAR = new RegExp("[\\p{L}\\p{N}\\p{Co}]", "u");
const SSI_MARK = new RegExp("\\p{Mn}", "gu");
const SSI_BAREWORD_OK = new RegExp("^[A-Za-z0-9_\\x1a\\u0080-\\u{10ffff}]+$", "u");
const SSI_FTS_SPECIAL = new RegExp("[\"'()*+\\-^~]", "g");
const SSI_FTS_KEYWORDS = new Set(["AND", "OR", "NOT", "NEAR"]);

function ssiFnv1a32(s) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(s)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h >>> 0;
}

// unicode61 remove_diacritics=1: U+2000 아래(라틴 등)만 분해해 결합 부호를 지운다. 한글은 분해하지 않는다.
function ssiFold(ch) {
  if (ch.codePointAt(0) < 0x2000) ch = ch.normalize("NFD").replace(SSI_MARK, "") || ch;
  return ch.toLowerCase();
}

// 글자(L*)·숫자(N*)·사용자 영역(Co)만 토큰 글자, 나머지는 구분자.
function ssiTokenize(text) {
  const out = [];
  let cur = "";
  for (const ch of String(text)) {
    if (SSI_TOKEN_CHAR.test(ch)) cur += ssiFold(ch);
    else if (cur) { out.push(cur); cur = ""; }
  }
  if (cur) out.push(cur);
  return out;
}

function ssiOwn(obj, key) {
  return obj && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

function ssiDecode(flat) {
  const out = new Map();
  let i = 0, d = 0;
  while (i < flat.length) {
    d += flat[i];
    const n = flat[i + 1];
    out.set(d, flat.slice(i + 2, i + 2 + n));
    i += 2 + n;
  }
  return out;
}

class StaticSearchIndex {
  constructor(load) {
    this.load = load;
    this.manifest = null;
    this.avgdl = 0;
    this._postings = new Map();
    this._prefix = new Map();
    this._docmeta = null;
  }

  async init() {
    if (!this.manifest) {
      const m = await this.load(STATIC_LAYOUT.search.manifest);
      if (!m || !m.shards) throw new Error("static search: manifest missing");
      this.manifest = m;
      this.avgdl = m.n_token / m.n_row;
    }
    return this;
  }

  async docmeta() {
    if (!this._docmeta) this._docmeta = (await this.load(STATIC_LAYOUT.search.docmeta)) || [];
    return this._docmeta;
  }

  async aliasShard(norm) {
    return (await this.load(STATIC_LAYOUT.search.aliasShard(ssiFnv1a32(norm) % this.manifest.alias_buckets))) || {};
  }

  async doc(docId) {
    const bucket = (await this.load(STATIC_LAYOUT.search.docBucket(Math.floor(docId / this.manifest.bucket)))) || {};
    return ssiOwn(bucket, String(docId));
  }

  shardsFor(prefix, exact) {
    const files = [];
    Object.entries(this.manifest.shards).forEach(([key, nums]) => {
      if (prefix.startsWith(key) || (!exact && key.startsWith(prefix))) nums.forEach(n => files.push(STATIC_LAYOUT.search.tokenShard(n)));
    });
    return files;
  }

  async postings(token, prefix) {
    const cache = prefix ? this._prefix : this._postings;
    if (cache.has(token)) return cache.get(token);
    const merged = new Map();
    const shards = await Promise.all(this.shardsFor(token, !prefix).map(rel => this.load(rel)));
    shards.forEach(shard => {
      Object.entries(shard || {}).forEach(([t, flat]) => {
        if (prefix ? !t.startsWith(token) : t !== token) return;
        ssiDecode(flat).forEach((ps, d) => {
          if (!merged.has(d)) merged.set(d, []);
          merged.get(d).push(...ps);
        });
      });
    });
    cache.set(token, merged);
    return merged;
  }

  // doc → 구(phrase)가 나온 횟수
  async phraseHits(toks, prefixLast) {
    const hits = new Map();
    if (!toks.length) return hits;
    const lists = await Promise.all(toks.map((t, i) => this.postings(t, prefixLast && i === toks.length - 1)));
    lists[0].forEach((first, d) => {
      if (!lists.every(l => l.has(d))) return;
      const sets = lists.map(l => new Set(l.get(d)));
      let n = 0;
      first.forEach(p => {
        for (let k = 1; k < toks.length; k++) if (!sets[k].has(p + 4 * k)) return;
        n += 1;
      });
      if (n) hits.set(d, n);
    });
    return hits;
  }

  async fts(query, limit) {
    const safe = saStrip(saCollapseWs(String(query).replace(SSI_FTS_SPECIAL, " ")));
    if (!safe) return [];
    const words = safe.split(" ");
    const syntaxOk = words.every(w => SSI_BAREWORD_OK.test(w)) && !words.some(w => SSI_FTS_KEYWORDS.has(w));
    const p0 = await this.phraseHits(ssiTokenize(safe), syntaxOk);
    const phrases = [p0];
    const matched = new Set(p0.keys());
    if (syntaxOk) {
      let andSet = null;
      for (let i = 0; i < words.length; i++) {
        const toks = ssiTokenize(words[i]);
        if (!toks.length) continue; // 토큰 글자가 없는 낱말('·' 등)은 FTS5 가 버린다
        const h = await this.phraseHits(toks, i === words.length - 1);
        phrases.push(h);
        andSet = andSet === null ? new Set(h.keys()) : new Set([...andSet].filter(d => h.has(d)));
      }
      (andSet || []).forEach(d => matched.add(d));
    }
    if (!matched.size) return [];
    const nRow = this.manifest.n_row;
    const idfs = phrases.map(h => {
      const idf = Math.log((nRow - h.size + 0.5) / (h.size + 0.5));
      return idf > 0 ? idf : 1e-6;
    });
    const docmeta = await this.docmeta();
    const scored = [];
    matched.forEach(d => {
      const meta = d < docmeta.length ? docmeta[d] : 0;
      const dl = Math.floor(meta / 2);
      let s = 0;
      phrases.forEach((h, i) => {
        const f = h.get(d) || 0;
        if (f) s += idfs[i] * (f * (SSI_K1 + 1)) / (f + SSI_K1 * (1 - SSI_B + SSI_B * dl / this.avgdl));
      });
      scored.push([meta & 1 ? 0 : 1, -s, d]);
    });
    scored.sort((a, b) => (a[0] - b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || (a[2] - b[2]));
    return scored.slice(0, limit).map(x => x[2]);
  }
}

Object.assign(window, { StaticSearchIndex, ssiTokenize, ssiFnv1a32, ssiOwn });
