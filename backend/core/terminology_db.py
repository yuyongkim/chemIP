"""TerminologyDB: the connection to data/terminology.db, assembled from the mixins in backend/core/terminology/.

Import path is stable: ``from backend.core.terminology_db import TerminologyDB`` (routes, scripts/*,
scripts/static_export and scripts/seo_pages, which replace ``TerminologyDB.__init__`` for read-only access).
"""
import logging
import sqlite3

from backend.config.settings import settings
from backend.core.mapping_store import MappingStoreMixin
from backend.core.terminology.aliases import AliasStoreMixin
from backend.core.terminology.chemicals import ChemicalStoreMixin
from backend.core.terminology.msds import MsdsStoreMixin
from backend.core.terminology.schema import SchemaMixin
from backend.core.terminology.search import SearchMixin

logger = logging.getLogger(__name__)


class TerminologyDB(SchemaMixin, AliasStoreMixin, ChemicalStoreMixin, MsdsStoreMixin, SearchMixin, MappingStoreMixin):
    def __init__(self, db_path=None):
        if db_path is None:
            db_path = settings.TERMINOLOGY_DB_PATH
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA busy_timeout=5000")
        self.create_tables()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

    def close(self):
        self.conn.close()
