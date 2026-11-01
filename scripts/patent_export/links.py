"""Public viewer links for a publication number."""
import re

_PUB = re.compile(r"^[A-Z]{2}[A-Z]{0,2}\d")
_KIND_SUFFIX = re.compile(r"[A-Z]\d?$")
ESPACENET = "https://worldwide.espacenet.com/patent/search?q=pn%3D{pid}"
PATENTSCOPE = "https://patentscope.wipo.int/search/en/detail.jsf?docId={core}"


def viewer_link(patent_id):
    """Espacenet (EPO) for all offices; WIPO Patentscope for WO publications."""
    if not _PUB.match(patent_id or ""):
        return None
    if patent_id.startswith("WO"):
        return PATENTSCOPE.format(core=_KIND_SUFFIX.sub("", patent_id))
    return ESPACENET.format(pid=patent_id)
