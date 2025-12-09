import os
import sys
import sqlite3
import gzip
import time
import multiprocessing
import json
from queue import Empty
import ahocorasick

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.terminology_db import TerminologyDB

# Configuration
USPTO_DIR = r"S:\특허 논문 DB\downloaded_patents"
INDEX_DB_PATH = "data/uspto_index.db"
NUM_WORKERS = max(1, multiprocessing.cpu_count() - 1)

def init_db():
    conn = sqlite3.connect(INDEX_DB_PATH)
    cursor = conn.cursor()
    # Drop table to reset schema for new columns
    cursor.execute('DROP TABLE IF EXISTS patent_index')
    cursor.execute('''
        CREATE TABLE patent_index (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chem_id TEXT,
            patent_id TEXT,
            title TEXT,
            section TEXT,
            snippet TEXT,
            file_path TEXT,
            matched_term TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_chem_id ON patent_index (chem_id)')
    conn.commit()
    return conn

def worker_task(file_queue, result_queue, automaton, total_lines):
    """
    Worker process: reads files from queue, searches for keywords using Aho-Corasick, sends matches to result queue.
    """
    while True:
        try:
            file_path = file_queue.get_nowait()
        except Empty:
            break
            
        try:
            matches = []
            local_line_count = 0
            open_func = gzip.open if file_path.endswith(".gz") else open
            
            with open_func(file_path, 'rt', encoding='utf-8', errors='ignore') as f:
                # Try to detect format
                try:
                    first_char = f.read(1)
                except Exception:
                    first_char = ''
                f.seek(0)
                
                is_jsonl = first_char == '{'
                
                if is_jsonl:
                    for line_num, line in enumerate(f):
                        # Update progress
                        local_line_count += 1
                        if local_line_count % 10000 == 0:
                            with total_lines.get_lock():
                                total_lines.value += 10000
                            local_line_count = 0

                        try:
                            data = json.loads(line)
                            # Extract Metadata
                            doc_num = data.get('doc_number', '')
                            kind = data.get('kind', '')
                            jurisdiction = data.get('jurisdiction', 'Unknown')
                            patent_id = f"{jurisdiction}{doc_num}{kind}"
                            
                            # Extract Title
                            title = "No Title"
                            biblio = data.get('biblio', {})
                            invention_title = biblio.get('invention_title', [])
                            if isinstance(invention_title, list) and invention_title:
                                title = invention_title[0].get('text', 'No Title')
                            elif isinstance(invention_title, dict):
                                title = invention_title.get('text', 'No Title')
                            
                            # Extract Sections
                            sections = {}
                            
                            # 1. Abstract
                            abstract_data = data.get('abstract', [])
                            if isinstance(abstract_data, list):
                                sections['Abstract'] = " ".join([p.get('text', '') for p in abstract_data if isinstance(p, dict)])
                            
                            # 2. Claims
                            claims_data = data.get('claims', {}).get('claims', [])
                            if isinstance(claims_data, list):
                                sections['Claims'] = " ".join([c.get('claim_text', '') for c in claims_data if isinstance(c, dict)])
                                
                            # 3. Description
                            desc_data = data.get('description', {}).get('description_paragraphs', [])
                            if isinstance(desc_data, list):
                                sections['Description'] = " ".join([d.get('text', '') for d in desc_data if isinstance(d, dict)])
                            
                            # 4. Title
                            sections['Title'] = title

                            # 5. Fallback: Raw JSON
                            raw_json = json.dumps(data)
                            raw_lower = raw_json.lower()
                            
                            # Search using Aho-Corasick
                            # We search the entire raw_json once (or per section if we want to be precise)
                            # To match previous logic, let's search sections first, then raw_json if not found
                            
                            found_terms = set()
                            
                            # Helper to search text
                            def search_text(text, source_type):
                                text_lower = text.lower()
                                for end_index, (chem_id, original_term) in automaton.iter(text_lower):
                                    if original_term in found_terms: continue
                                    
                                    start_index = end_index - len(original_term) + 1
                                    
                                    # Boundary Check
                                    # Check char before
                                    if start_index > 0:
                                        char_before = text_lower[start_index - 1]
                                        if char_before.isalnum() or char_before == '-':
                                            continue
                                            
                                    # Check char after
                                    if end_index < len(text_lower) - 1:
                                        char_after = text_lower[end_index + 1]
                                        if char_after.isalnum() or char_after == '-':
                                            continue
                                            
                                    # Valid Match
                                    start = max(0, start_index - 75)
                                    end = min(len(text), end_index + 75)
                                    snippet = text[start:end].replace('\n', ' ')
                                    snippet = f"...{snippet}..."
                                    matches.append((chem_id, patent_id, title, source_type, snippet, file_path, original_term))
                                    found_terms.add(original_term)

                            # Search Sections
                            for section_name, content in sections.items():
                                if content:
                                    search_text(content, section_name)
                                    
                            # Search Metadata (Raw JSON) if not found
                            # Note: This might duplicate if term found in section AND metadata
                            # But we track found_terms to avoid duplicates per patent
                            if not found_terms:
                                search_text(raw_json, "Metadata")
                                    
                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            continue
                else:
                    # Fallback for plain text/XML
                    content = f.read()
                    # Just count lines roughly for progress
                    lines_in_file = content.count('\n')
                    with total_lines.get_lock():
                        total_lines.value += lines_in_file
                        
                    content_lower = content.lower()
                    for term, chem_id in term_map.items():
                        if term in content_lower:
                            patent_id = os.path.basename(file_path).split(".")[0]
                            idx = content_lower.find(term)
                            start = max(0, idx - 75)
                            end = min(len(content), idx + len(term) + 75)
                            snippet = content[start:end].replace('\n', ' ')
                            snippet = f"...{snippet}..."
                            matches.append((chem_id, patent_id, f"File: {os.path.basename(file_path)}", "FullText", snippet, file_path, term))
            
            # Flush remaining lines
            if local_line_count > 0:
                with total_lines.get_lock():
                    total_lines.value += local_line_count

            if matches:
                result_queue.put(matches)
                
        except Exception as e:
            print(f"CRITICAL ERROR processing {file_path}: {e}")
            pass

def writer_task(result_queue, stop_event):
    """
    Writer process: reads matches from queue and writes to SQLite.
    """
    conn = sqlite3.connect(INDEX_DB_PATH)
    cursor = conn.cursor()
    
    batch = []
    last_commit = time.time()
    
    while not stop_event.is_set() or not result_queue.empty():
        try:
            matches = result_queue.get(timeout=1)
            batch.extend(matches)
            
            if len(batch) >= 1000 or (time.time() - last_commit > 5 and batch):
                cursor.executemany('''
                    INSERT INTO patent_index (chem_id, patent_id, title, section, snippet, file_path, matched_term)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', batch)
                conn.commit()
                batch = []
                last_commit = time.time()
                
        except Empty:
            continue
            
    if batch:
        cursor.executemany('''
            INSERT INTO patent_index (chem_id, patent_id, title, section, snippet, file_path, matched_term)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', batch)
        conn.commit()
    
    conn.close()

def build_index():
    print(f"Starting Multiprocess Indexer with {NUM_WORKERS} workers...")
    
    # 1. Load Keywords
    print("Loading chemical keywords...")
    term_db = TerminologyDB()
    keywords = term_db.get_all_keywords()
    term_db.close()
    
    print("Building Aho-Corasick Automaton...")
    automaton = ahocorasick.Automaton()
    count = 0
    for item in keywords:
        if item['name']: 
            automaton.add_word(item['name'].lower(), (item['chem_id'], item['name']))
            count += 1
        if item['cas_no']: 
            automaton.add_word(item['cas_no'], (item['chem_id'], item['cas_no']))
            count += 1
            
    automaton.make_automaton()
    print(f"Automaton built with {count} terms.")

    # 2. Init DB
    init_db()
    
    # 3. Collect Files
    print(f"Scanning directory: {USPTO_DIR}")
    files = []
    total_size = 0
    for root, dirs, filenames in os.walk(USPTO_DIR):
        for f in filenames:
            if f.endswith(".gz") or f.endswith(".xml") or f.endswith(".txt"):
                full_path = os.path.join(root, f)
                files.append(full_path)
                total_size += os.path.getsize(full_path)
    
    # Sort by filename descending (assuming higher numbers/dates are newer)
    files.sort(reverse=True)
    
    print(f"Found {len(files)} files to process.")
    print(f"Total Size: {total_size / (1024*1024*1024):.2f} GB")
    
    # 4. Setup Queues
    manager = multiprocessing.Manager()
    file_queue = manager.Queue()
    result_queue = manager.Queue()
    stop_event = manager.Event()
    
    # Shared Line Counter
    total_lines = multiprocessing.Value('L', 0)
    
    for f in files:
        file_queue.put(f)
        
    # 5. Start Writer
    writer = multiprocessing.Process(target=writer_task, args=(result_queue, stop_event))
    writer.start()
    
    # 6. Start Workers
    workers = []
    for _ in range(NUM_WORKERS):
        p = multiprocessing.Process(target=worker_task, args=(file_queue, result_queue, automaton, total_lines))
        p.start()
        workers.append(p)
        
    # 7. Wait for completion
    start_time = time.time()
    while any(p.is_alive() for p in workers):
        time.sleep(2)
        remaining = file_queue.qsize()
        processed_files = len(files) - remaining
        elapsed = time.time() - start_time
        
        current_lines = total_lines.value
        lines_per_sec = current_lines / elapsed if elapsed > 0 else 0
        
        print(f"Files: {processed_files}/{len(files)} | Lines: {current_lines:,} ({lines_per_sec:,.0f} lines/sec)")
        
    stop_event.set()
    writer.join()
    
    print("Indexing Complete!")

if __name__ == "__main__":
    multiprocessing.freeze_support()
    build_index()
