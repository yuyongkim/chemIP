"""TerminologyDB building blocks (data/terminology.db). The class itself stays in backend/core/terminology_db.py.

| File | Role |
|---|---|
| `schema.py` | `SchemaMixin`: CREATE TABLE/INDEX, first-run FTS and alias index builds |
| `aliases.py` | `AliasStoreMixin`: alias rows, aliases of a chemical, exact alias hits |
| `chemicals.py` | `ChemicalStoreMixin`: chemical_terms insert/merge, metadata lookups, indexing keywords |
| `msds.py` | `MsdsStoreMixin`: msds_details rows, table counts |
| `search.py` | `SearchMixin`: synonym + alias + FTS search, merge and paging |
| `ranking.py` | pure scoring; weights in `backend/data/search/ranking.json` |
| `synonyms.py` | reads `backend/data/search/synonyms.jsonl` (registry names / cited synonyms per CAS) |

Drug/guide mappings, English MSDS and the AI cache are in backend/core/mapping_store.py (`MappingStoreMixin`).
Every mixin expects ``self.conn`` (sqlite3.Connection) from TerminologyDB.
"""
