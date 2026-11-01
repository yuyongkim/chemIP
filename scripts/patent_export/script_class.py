"""Unicode script classification and text normalisation shared by term building and matching."""
import unicodedata


def normalize(text):
    """NFKC (full-width -> ASCII etc.), lower case, single spaces."""
    return " ".join(unicodedata.normalize("NFKC", text or "").lower().split())


def is_hangul(ch):
    return "가" <= ch <= "힣" or "ᄀ" <= ch <= "ᇿ" or "㄰" <= ch <= "㆏"


def is_kanji_kana(ch):
    return "一" <= ch <= "鿿" or "぀" <= ch <= "ヿ" or "㐀" <= ch <= "䶿"


def script_of(term):
    """'hangul' if any Hangul, 'cjk' if any kanji/kana, else 'latin'."""
    if any(is_hangul(c) for c in term):
        return "hangul"
    if any(is_kanji_kana(c) for c in term):
        return "cjk"
    return "latin"


def count_script_chars(term, script):
    test = is_hangul if script == "hangul" else is_kanji_kana
    return sum(1 for c in term if test(c))
