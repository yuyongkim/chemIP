"""Table creation and one-time index builds (FTS, alias index) for TerminologyDB."""
import logging

logger = logging.getLogger("backend.core.terminology_db")  # same logger name as before the split


class SchemaMixin:
    """Expects ``self.conn`` and ``self._upsert_alias_rows`` (AliasStoreMixin)."""

    def create_tables(self):
        cursor = self.conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chemical_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                cas_no TEXT,
                description TEXT,
                name_en TEXT,
                source TEXT DEFAULT 'KOSHA',
                external_id TEXT
            )
        ''')

        for statement in (
            "ALTER TABLE chemical_terms ADD COLUMN name_en TEXT",
            "ALTER TABLE chemical_terms ADD COLUMN source TEXT DEFAULT 'KOSHA'",
            "ALTER TABLE chemical_terms ADD COLUMN external_id TEXT",
        ):
            try:
                cursor.execute(statement)
            except Exception:
                pass

        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS chemical_terms_fts USING fts5(
                name,
                cas_no,
                description,
                name_en,
                content='chemical_terms',
                content_rowid='id'
            )
        ''')

        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS chemical_aliases (
                canonical_id TEXT NOT NULL,
                alias TEXT NOT NULL,
                alias_norm TEXT NOT NULL,
                alias_type TEXT DEFAULT 'derived',
                chem_name TEXT,
                name_en TEXT,
                cas_no TEXT,
                source TEXT,
                confidence REAL DEFAULT 1.0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (canonical_id, alias_norm)
            )
            '''
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_aliases_alias_norm ON chemical_aliases(alias_norm)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_aliases_canonical_id ON chemical_aliases(canonical_id)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_terms_cas_no ON chemical_terms(cas_no)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_chemical_terms_source ON chemical_terms(source)"
        )

        # Patent Terms Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patent_terms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                term TEXT NOT NULL,
                definition TEXT,
                category TEXT
            )
        ''')
        
        # MSDS Details Table (Stores specific sections)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS msds_details (
                chem_id TEXT,
                section_seq INTEGER,
                section_name TEXT,
                content TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chem_id, section_seq)
            )
        ''')

        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS drug_mappings (
                chem_id TEXT NOT NULL,
                source TEXT NOT NULL,
                item_key TEXT NOT NULL,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chem_id, source, item_key)
            )
            '''
        )

        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS guide_mappings (
                chem_id TEXT NOT NULL,
                guide_no TEXT NOT NULL,
                guide_title TEXT,
                score INTEGER DEFAULT 0,
                match_terms TEXT,
                match_fields TEXT,
                guide_cas_numbers TEXT,
                guide_keywords TEXT,
                snippet TEXT,
                file_download_url TEXT,
                source TEXT DEFAULT 'kosha_guide',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (chem_id, guide_no)
            )
            '''
        )
        
        cursor.execute("UPDATE chemical_terms SET source = 'KOSHA' WHERE source IS NULL OR TRIM(source) = ''")

        self.conn.commit()
        self.sync_fts()
        self.sync_aliases()

    def sync_fts(self):
        """
        Syncs the FTS table with the main table.
        This is a simple rebuild strategy. For huge DBs, triggers are better.
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT count(*) FROM chemical_terms_fts")
        if cursor.fetchone()[0] == 0:
            logger.info("Building FTS index...")
            cursor.execute('''
                INSERT INTO chemical_terms_fts(rowid, name, cas_no, description, name_en)
                SELECT id, name, cas_no, description, name_en FROM chemical_terms
            ''')
            self.conn.commit()
            logger.info("FTS index built.")

    def sync_aliases(self) -> None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT 1 FROM chemical_aliases LIMIT 1")
        if cursor.fetchone():
            return

        logger.info("Building chemical alias index...")
        cursor.execute(
            '''
            SELECT id, name, cas_no, description, name_en, source
            FROM chemical_terms
            '''
        )
        rows = cursor.fetchall()
        for row in rows:
            self._upsert_alias_rows(
                row_id=row[0],
                name=row[1],
                cas_no=row[2],
                description=row[3],
                name_en=row[4],
                source=row[5],
            )
        self.conn.commit()
        logger.info("Chemical alias index built (%s chemicals).", len(rows))
