"""Build the reliable term -> CAS dictionary from terminology.db (read-only).

Rules (see README): CAS numbers with a valid check digit; names/synonyms of length >= MIN_LATIN_LEN (Latin)
or >= MIN_CJK_LEN Hangul chars; no generic stoplist words; a non-CAS term claimed by more than one CAS is
dropped as ambiguous. Rows are keyed by CAS, never by chem_id.
"""
import collections
import json
import re
import sqlite3

import config
from cas import is_valid_cas
from script_class import normalize, script_of, count_script_chars

_ARTICLES = ("the ", "a ", "an ")
# Single alphabetic words with these endings are English words (participles, abstract nouns), not substances:
# 'cyclized', 'epoxidized', 'branched', 'coating', 'hardness'.
_ENGLISH_SUFFIXES = ("ed", "ing", "ness", "ment", "ity", "ism", "ist", "able", "ible", "ful", "less")
_TRAILING_GROUP = re.compile(r"^(.*?)(\s*)\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$")
_CODE_LIKE = re.compile(r"^[a-z]{0,4}[\d\s\-.,/:#()]+[a-z]?$")
# Substituent / radical fragments ('3-methyl', '2-hydroxyethyl', 'chloromethyl', '4-chlorophenyl', 'acetyloxy'):
# never a standalone substance name in running text.
_SUBSTITUENT = re.compile(r"(?:yl|yloxy|oxy|ylidene|amino|imino|oyl)$")
_EDGE_PUNCT = " \t,;:·•.-"
_PAIRS = ("()", "[]", "{}")
_COMMON_NAME_MARK = "관용명"
_TRUNCATED_END = (",", ";", "(")
# Names from these sources are IUPAC-style; a top-level ';' there separates constituents, not synonyms.
_NO_SYNONYM_SPLIT_SOURCES = ("ECHA", "KREACH")
_NCIS_SQL = "SELECT cas_no, name_kor, name_eng, name2_kor, name2_eng FROM ncis_substance"
_MSDS_EN_SQL = "SELECT cas_no, name_en FROM msds_english WHERE name_en IS NOT NULL AND name_en <> ''"


def open_ro(path):
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True)


def load_word_file(path):
    """Set of normalised words from a one-per-line file ('#' comments allowed)."""
    lines = path.read_text(encoding="utf-8").splitlines()
    return {normalize(x) for x in lines if x.strip() and not x.startswith("#")}


def load_stoplist(path=config.STOPLIST_FILE):
    return load_word_file(path)


_HANGUL_SHORT_ALLOW = load_word_file(config.HANGUL_SHORT_ALLOW_FILE)


def _balanced(s):
    return all(s.count(a) == s.count(b) for a, b in _PAIRS)


def split_top_level(s, sep=";"):
    """Split on sep only outside brackets: 'a; b (c;d)' -> ['a', 'b (c;d)']."""
    parts, depth, cur = [], 0, []
    for ch in s:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == sep and depth == 0:
            parts.append("".join(cur)); cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return [p.strip() for p in parts if p.strip()]


def split_variants(raw, split_synonyms=True):
    """One raw name string -> candidate surface forms.

    - top-level ';' separates synonyms (NCIS lists 'Benzol; Cyclohexatriene; ...')
    - a trailing '(...)' group preceded by a space, or written in another script ('벤젠 (Benzene)',
      '황산(SULFURIC ACID)'), is an alternative name -> both outer and inner are kept
    - an inner group that itself holds a ';' list is a component list of a multi-constituent substance
      ('... (chromium(3+);hydron;...)') -> the components are NOT names of this substance and are skipped
    """
    out = []
    text = (raw or "").replace("·", " ")
    for piece in (split_top_level(text) if split_synonyms else [text.strip()]):
        stack = [piece]
        while stack:
            s = stack.pop().strip()
            if not s:
                continue
            out.append(s)
            m = _TRAILING_GROUP.match(s)
            if m and m.group(1).strip():
                outer, space, inner = m.group(1).strip(), m.group(2), m.group(3).strip()
                if inner.startswith(_COMMON_NAME_MARK):     # '( 관용명 : Vinyl benzene )' -> 'Vinyl benzene'
                    inner = inner.split(":", 1)[-1].strip()
                if space or script_of(outer) != script_of(inner):
                    stack.append(outer)
                    if len(split_top_level(inner)) == 1:
                        stack.append(inner)
    return out


def reject_reason(term, stoplist):
    """None if the normalised term is acceptable, else a short reason code."""
    if not term:
        return "empty"
    if "관용명" in term or ":" in term or not _balanced(term):
        return "fragment"
    if not re.search(r"[^\W\d_]", term):
        return "no_letters"
    if _CODE_LIKE.match(term) or is_valid_cas(term):
        return "code_like"
    if script_of(term) == "latin" and " " not in term and _SUBSTITUENT.search(term):
        return "substituent_fragment"
    if term.startswith(_ARTICLES):
        return "fragment"
    if script_of(term) == "latin" and " " not in term and term.isalpha() and term.endswith(_ENGLISH_SUFFIXES):
        return "english_word"
    if len(term) > config.MAX_TERM_LEN:
        return "too_long"
    script = script_of(term)
    if script == "latin" and len(term) < config.MIN_LATIN_LEN:
        return "too_short"
    if (script == "hangul" and count_script_chars(term, "hangul") < config.MIN_CJK_LEN
            and term not in _HANGUL_SHORT_ALLOW):
        return "too_short"
    if script == "cjk" and count_script_chars(term, "cjk") < config.MIN_KANJI_KANA_LEN:
        return "too_short"
    if term in stoplist:
        return "stoplist"
    return None


def iter_raw_names(conn):
    """(cas, raw_name, split_synonyms) from chemical_terms (name, name_en), ncis_substance (Korean/English
    names and synonym lists), msds_english (name_en) and curated chemical_aliases.

    Only alias types in config.TRUSTED_ALIAS_TYPES are used. The 'derived'/'derived_en' aliases are
    machine-split fragments of long names (e.g. 'benzene' cut out of 'Benzene, 1,2-dimethyl-' and filed
    under xylene's CAS); they would make every parent name ambiguous, so they are skipped. The full names
    they were derived from are already read from chemical_terms.
    """
    for cas, name, name_en, source in conn.execute("SELECT cas_no, name, name_en, source FROM chemical_terms"):
        for raw in (name, name_en):
            if raw:
                yield (cas or "").strip(), raw, source not in _NO_SYNONYM_SPLIT_SOURCES
    for cas, *names in conn.execute(_NCIS_SQL):           # NCIS registry: Korean/English name + synonym lists
        for raw in names:
            if raw:
                yield (cas or "").strip(), raw, True
    for cas, name_en in conn.execute(_MSDS_EN_SQL):
        yield (cas or "").strip(), name_en, True
    marks = ",".join("?" * len(config.TRUSTED_ALIAS_TYPES))
    rows = conn.execute(f"SELECT cas_no, alias FROM chemical_aliases WHERE alias_type IN ({marks})",
                        config.TRUSTED_ALIAS_TYPES)
    for cas, alias in rows:
        if alias:
            yield (cas or "").strip(), alias, True


def full_names(conn):
    """{normalised registered name: {cas}} -> the 'full name' tier used to break ties.

    Registered names = chemical_terms.name / name_en, ncis_substance.name_kor / name_eng, msds_english.name_en.
    """
    tier0 = collections.defaultdict(set)
    queries = ("SELECT cas_no, name, name_en FROM chemical_terms",
               "SELECT cas_no, name_kor, name_eng FROM ncis_substance",
               "SELECT cas_no, name_en, NULL FROM msds_english WHERE name_en <> ''")
    for sql in queries:
        for cas, a, b in conn.execute(sql):
            for raw in (a, b):
                if raw:
                    tier0[normalize(raw)].add((cas or "").strip())
    return tier0


def load_substances(conn):
    """{cas: {name, name_en}} for every valid CAS in chemical_terms (first KOSHA row wins for display)."""
    subs = {}
    rows = conn.execute("SELECT cas_no, name, name_en, source FROM chemical_terms "
                        "ORDER BY CASE source WHEN 'KOSHA' THEN 0 ELSE 1 END, id")
    for cas, name, name_en, source in rows:
        cas = (cas or "").strip()
        if is_valid_cas(cas) and cas not in subs:
            subs[cas] = {"name": name, "name_en": name_en, "source": source}
    return subs


def resolve_owner(term, claimants, tier0, ncis_cas):
    """Single CAS for term, or None if ambiguous.

    1. claimed by one CAS -> kept
    2. several claimants -> kept only if exactly one carries it as a whole registered name
    3. still several -> kept only if exactly one of those is in the NCIS registry (Korean existing-chemicals
       inventory; e.g. 'ethylene' = 74-85-1, not the ECHA-only 87701-65-3)
    otherwise ambiguous and dropped.
    """
    if len(claimants) <= config.MAX_CAS_PER_TERM:
        return next(iter(claimants))
    exact = claimants & tier0.get(term, set())
    if len(exact) == 1:
        return next(iter(exact))
    registered = (exact or claimants) & ncis_cas
    return next(iter(registered)) if len(registered) == 1 and exact else None


def build(conn):
    """Return (term_to_cas, substances, report)."""
    stoplist = load_stoplist()
    substances = load_substances(conn)
    tier0 = full_names(conn)
    ncis_cas = {(c or "").strip() for (c,) in conn.execute("SELECT cas_no FROM ncis_substance")}
    owners = collections.defaultdict(set)
    reasons = collections.Counter()
    blockers = set()
    for cas, raw, split_synonyms in iter_raw_names(conn):
        if cas not in substances:
            reasons["substance_without_valid_cas"] += 1
            continue
        for variant in split_variants(raw, split_synonyms):
            if variant.rstrip().endswith(_TRUNCATED_END):   # cut-off text such as '(BENZENE, )'
                reasons["fragment"] += 1
                continue
            term = normalize(variant).strip(_EDGE_PUNCT)
            why = reject_reason(term, stoplist)
            if why:
                reasons[why] += 1
                if why == "stoplist" and " " in term:
                    blockers.add(term)
            else:
                owners[term].add(cas)
    term_to_cas, ambiguous, tie_broken = {}, {}, 0
    for term, claimants in owners.items():
        owner = resolve_owner(term, claimants, tier0, ncis_cas)
        if owner is None:
            ambiguous[term] = sorted(claimants)
        else:
            term_to_cas[term] = owner
            tie_broken += len(claimants) > 1
    # Dropped multi-word names still block shorter hits inside them ('titanium dioxide' must not yield 'titanium').
    blockers |= set(ambiguous)
    covered = collections.Counter(term_to_cas.values())
    report = {
        "substances_with_valid_cas": len(substances),
        "substances_with_name_terms": len(covered),
        "accepted_terms": len(term_to_cas),
        "multi_claim_terms_resolved": tie_broken,
        "ambiguous_terms_dropped": len(ambiguous),
        "blocker_terms": len(blockers),
        "rejections": dict(reasons.most_common()),
        "ambiguous_examples": sorted(ambiguous.items(), key=lambda kv: -len(kv[1]))[:300],
    }
    report["_blockers"] = sorted(blockers)
    return term_to_cas, substances, report


def write(term_to_cas, substances, report, out_dir=config.TERMS_DIR):
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "terms.json").write_text(json.dumps(term_to_cas, ensure_ascii=False), encoding="utf-8")
    (out_dir / "substances.json").write_text(json.dumps(substances, ensure_ascii=False), encoding="utf-8")
    blockers = report.pop("_blockers")
    (out_dir / "blockers.json").write_text(json.dumps(blockers, ensure_ascii=False), encoding="utf-8")
    (out_dir / "terms_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")


def load(out_dir=config.TERMS_DIR):
    term_to_cas = json.loads((out_dir / "terms.json").read_text(encoding="utf-8"))
    substances = json.loads((out_dir / "substances.json").read_text(encoding="utf-8"))
    return term_to_cas, substances


def load_blockers(out_dir=config.TERMS_DIR):
    return json.loads((out_dir / "blockers.json").read_text(encoding="utf-8"))
