"""Quick DB recovery script - run standalone"""
import sqlite3, os, shutil

db_path = r'G:\MSDS\data\terminology.db'
new_path = r'G:\MSDS\data\terminology_new.db'
bak_path = r'G:\MSDS\data\terminology_bak.db'

# Remove WAL/SHM 
for ext in ['-wal', '-shm', '-journal']:
    p = db_path + ext
    if os.path.exists(p):
        os.remove(p)
        print(f'Removed {p}')

# Remove old new
if os.path.exists(new_path):
    os.remove(new_path)

print(f'DB size: {os.path.getsize(db_path)/1024/1024:.2f} MB')

# Try reading
old = sqlite3.connect(db_path)
try:
    count = old.execute('SELECT count(*) FROM chemical_terms').fetchone()[0]
    print(f'chemical_terms: {count} rows')
    
    rows = old.execute('SELECT id, name, cas_no, description, name_en FROM chemical_terms').fetchall()
    print(f'Read all {len(rows)} rows OK')
    
    # Read msds_details
    try:
        details = old.execute('SELECT chem_id, section_no, xml_data FROM msds_details').fetchall()
        print(f'msds_details: {len(details)} rows')
    except:
        details = []
        print('msds_details: could not read')
    
    old.close()
    
    # Create new clean DB
    new = sqlite3.connect(new_path)
    new.execute('CREATE TABLE chemical_terms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cas_no TEXT, description TEXT, name_en TEXT)')
    new.executemany('INSERT INTO chemical_terms (id, name, cas_no, description, name_en) VALUES (?,?,?,?,?)', rows)
    
    new.execute('CREATE VIRTUAL TABLE chemical_terms_fts USING fts5(name, cas_no, description, name_en, content=chemical_terms, content_rowid=id)')
    new.execute('INSERT INTO chemical_terms_fts (rowid, name, cas_no, description, name_en) SELECT id, name, cas_no, description, name_en FROM chemical_terms')
    
    new.execute('CREATE TABLE IF NOT EXISTS patent_terms (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, applicant TEXT, date TEXT, description TEXT)')
    new.execute('CREATE TABLE IF NOT EXISTS msds_details (id INTEGER PRIMARY KEY AUTOINCREMENT, chem_id TEXT NOT NULL, section_no INTEGER NOT NULL, xml_data TEXT, UNIQUE(chem_id, section_no))')
    
    for d in details:
        try:
            new.execute('INSERT OR IGNORE INTO msds_details (chem_id, section_no, xml_data) VALUES (?,?,?)', d)
        except:
            pass
    
    new.commit()
    
    # Verify
    check = new.execute('PRAGMA integrity_check').fetchone()
    ct = new.execute('SELECT count(*) FROM chemical_terms').fetchone()[0]
    print(f'New DB integrity: {check[0]}')
    print(f'New DB chemicals: {ct}')
    
    for q in ['Toluene', '벤젠']:
        r = new.execute('SELECT count(*) FROM chemical_terms_fts WHERE chemical_terms_fts MATCH ?', (f'"{q}"*',)).fetchone()[0]
        print(f'  Search "{q}": {r} results')
    
    new.close()
    
    # Swap files
    shutil.move(db_path, bak_path)
    shutil.move(new_path, db_path)
    print(f'\\nSwapped: old→{bak_path}, new→{db_path}')
    print('Recovery complete!')
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
    old.close()
