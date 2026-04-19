from __future__ import annotations

from backend.core.terminology_db import TerminologyDB


def main() -> None:
    with TerminologyDB() as db:
        db.conn.execute("DELETE FROM chemical_aliases")
        db.conn.commit()
        db.sync_aliases()
        count = db.conn.execute("SELECT COUNT(*) FROM chemical_aliases").fetchone()[0]
        print(f"chemical_aliases rebuilt: {count}")


if __name__ == "__main__":
    main()
