"""Handling-site sources combined by backend/api/handlers_adapter.py (HandlingSiteAdapter).

| File | Role |
|---|---|
| `text.py` | pure helpers (CAS/term normalisation, numbers) and `TermMatchingMixin` |
| `prtr_cache.py` | `PrtrCacheMixin`: PRTR summary/facilities/aggregates from data/prtr/prtr_facilities.sqlite |
| `prtr_live.py` | `PrtrLiveMixin`: PRTR portal download + local summary workbook (cache first) |
| `gyeonggi.py` | `GyeonggiFacilitiesMixin`: Gyeonggi risk-management facilities |
| `accidents.py` | `ChemicalAccidentsMixin`: chemical accident cases (data.go.kr) |
"""
