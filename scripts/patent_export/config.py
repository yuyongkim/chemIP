"""All paths, thresholds and switches for the patent export pipeline. Every other module reads values from here."""
from pathlib import Path

# ---- inputs (opened read-only) ----
TERMS_DB = Path("G:/MSDS/data/terminology.db")
SOURCE_ROOT = Path("S:/특허 논문 DB/downloaded_patents")
# Lens.org-format jsonl.gz folders that are scanned. Folder name is kept per record as provenance ("src").
SOURCE_FOLDERS = ("CNIPA", "JPO", "EPO", "WIPO", "USPTO", "Other-Agencies")
SOURCE_GLOB = "*-patent-records-*.jsonl.gz"
# Never scanned: KIPRIS (no redistribution permission), derived/temp folders.
EXCLUDED_FOLDERS = ("KIPRIS", "output", "temp", "cache", "checkpoints", "processed", "results", "USPTO_TEST")

# ---- outputs (never on C:) ----
WORK_ROOT = Path("E:/dev-cache/chemip-patents")
TERMS_DIR = WORK_ROOT / "terms"            # terms.json + rejected-term report
MATCH_DIR = WORK_ROOT / "work" / "matches"  # one <folder>/<file>.matches.jsonl.gz per source file (resume unit)
BUCKET_DIR = WORK_ROOT / "work" / "buckets" # CAS-hashed partitions of all matches
OUT_VERSION = "v1"
OUT_DIR = WORK_ROOT / "out" / OUT_VERSION
LOG_DIR = WORK_ROOT / "logs"

# ---- term quality rules ----
MIN_LATIN_LEN = 5          # names/synonyms written in Latin script
MIN_CJK_LEN = 3            # Hangul syllables in the term. 2-syllable Hangul words collide with everyday words
                           # (요소 urea/element, 함유 'containing', 그리스 grease/Greece), so they need the allowlist:
HANGUL_SHORT_ALLOW_FILE = Path(__file__).with_name("hangul_short_allow.txt")
MIN_KANJI_KANA_LEN = 3     # Chinese/Japanese-only terms (no word boundaries in those scripts)
MAX_TERM_LEN = 100
TRUSTED_ALIAS_TYPES = ("ncis_synonym",)  # chemical_aliases types used as synonyms
MAX_CAS_PER_TERM = 1       # a non-CAS term claimed by more than this many CAS numbers is ambiguous -> dropped
STOPLIST_FILE = Path(__file__).with_name("stoplist_generic.txt")
# Corpus document-frequency cut, applied at shard time (no rescan needed to change it):
# a non-CAS term that is the best hit in more than this many source records (copper, silicon, lithium …)
# is too frequent for abstract mentions to mean much -> only TITLE hits are kept for it.
MAX_TERM_DF = 250_000

# ---- matching ----
MATCH_FIELDS = ("title", "abstract")  # claims/description are not scanned (too long, too noisy)
# Texts in these languages are skipped: every accepted term is Latin or Hangul script (terms report shows
# 0 kanji/kana/Cyrillic terms), so they cannot match. CN/JP records also carry an English title/abstract.
SKIP_TEXT_LANGS = ("zh", "ja", "ru", "uk", "bg", "be", "kk", "mn", "el", "ar", "fa", "he", "th", "ka", "hy")
# A Latin-script hit followed by one of these words names a structural motif or a different compound
# ('benzene ring', 'dodecyl benzene sulfonate', 'phenol groups'), not the substance -> hit rejected.
NON_SUBSTANCE_FOLLOWERS = ("ring", "rings", "nucleus", "nuclei", "skeleton", "moiety", "moieties", "group",
                           "groups", "radical", "radicals", "residue", "residues", "unit", "units",
                           "sulfonate", "sulfonates", "sulphonate", "sulfonic", "sulphonic", "derivative",
                           "derivatives", "analog", "analogs", "analogue", "analogues", "substituted",
                           "atom", "atoms", "ion", "ions", "cation", "cations", "anion", "anions",
                           "compound", "compounds", "salt", "salts", "complex", "complexes", "channel",
                           "channels")
NON_SUBSTANCE_FOLLOWER_PREFIXES = ("sulfon", "sulphon", "carboxyl", "carboxylic", "dicarbox")
# A Latin hit preceded by a substituent word names a different compound ('isopropyl benzene' = cumene,
# 'alkyl benzoate'); any previous word ending in '-yl' (len > 3) counts too.
SUBSTITUENT_PREFIX_WORDS = ("chloro", "bromo", "fluoro", "iodo", "nitro", "amino", "hydroxy", "methoxy",
                            "ethoxy", "cyano", "oxo", "thio", "keto", "perfluoro", "dichloro", "trichloro")
# A hit glued to a preceding ')', ']', '}' or '-' (any script), or a Latin hit followed by '(' / '[' / '-<digit>',
# is part of a longer systematic name ('1,4-di(pyridin-2-yl)benzene', ')벤젠', 'benzene-1,4-diol') -> rejected.
GLUED_BEFORE = ")]}-"
GLUED_AFTER = "(["
# Korean particles allowed directly after a Hangul term ("벤젠을", "벤젠으로").
HANGUL_PARTICLES = ("으로부터", "로부터", "에서는", "으로는", "에서", "에는", "으로", "이나", "이며", "이고",
                    "과의", "와의", "보다", "에의", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과",
                    "로", "도", "만", "및", "등")

# ---- record shaping ----
TITLE_MAX = 200
SNIPPET_MAX = 200
SNIPPET_BEFORE = 70
INDEX_TOP_RECENT = 20
MAX_RECORDS_PER_FILE = 20_000   # newest kept per <CAS>/<JUR>.json.gz; index.json keeps the full counts
BUCKETS = 128

# ---- politeness (the PC serves a live site) ----
WORKERS = 6
READ_MB_PER_S_PER_WORKER = 15   # compressed-input cap per worker -> <= 90 MB/s total on S:
BACKGROUND_PRIORITY = True       # workers: idle CPU class + low I/O priority (see throttle.py)
