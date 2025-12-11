# Database Setup Guide | 데이터베이스 설정 가이드

This document explains how the 140GB+ Global Patent Index database is connected and managed in this project.

이 문서는 140GB 이상의 글로벌 특허 인덱스 데이터베이스가 어떻게 연결되고 관리되는지 설명합니다.

---

## English

### Overview

The ChemIP-Platform uses a **large-scale SQLite database** (~140GB) to store and query patent data from multiple global authorities. Due to its size, this database cannot be pushed to Git and must be generated locally or obtained from a backup.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Raw Patent Data Source                      │
│        S:\특허 논문 DB\downloaded_patents (~1.6TB)               │
│  ├── USPTO/    (US Patent Office)                               │
│  ├── EPO/      (European Patent Office)                         │
│  ├── WIPO/     (World IP Organization)                          │
│  ├── JPO/      (Japan Patent Office)                            │
│  ├── KIPRIS/   (Korea IP Rights Info Service)                   │
│  └── CNIPA/    (China National IP Administration)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ scripts/build_global_index.py
                              │ (Multiprocessing + Aho-Corasick)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              data/global_patent_index.db (~140GB)               │
│  ├── patent_index (patent_id, title, jurisdiction, etc.)        │
│  └── chemical_matches (keyword, snippet, file_path, etc.)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Backend API (FastAPI)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│                 GET /api/global/patents/{chem_id}               │
└─────────────────────────────────────────────────────────────────┘
```

### Database File Location

| File | Size | Description |
|------|------|-------------|
| `data/global_patent_index.db` | ~140GB | Main patent search index |
| `data/terminology.db` | ~300MB | Chemical terminology lookup |
| `data/uspto_index.db` | ~6GB | Legacy USPTO-only index |

### How to Build the Index

1. **Ensure raw patent data is available** at `S:\특허 논문 DB\downloaded_patents`
2. **Run the indexing script**:

   ```bash
   python scripts/build_global_index.py
   ```

3. **Monitor progress** (optional):

   ```bash
   python scripts/monitor_indexing.py
   ```

4. **Verify the index**:

   ```bash
   python scripts/verify_global_index.py
   ```

> ⚠️ **Warning**: Full indexing takes **24-48 hours** depending on hardware.

### Technical Details

| Component | Technology |
|-----------|------------|
| **Indexing Engine** | Aho-Corasick Algorithm (multi-pattern search) |
| **Parallelization** | Python `multiprocessing` (CPU cores - 1) |
| **File Format** | JSONL (gzipped) |
| **Database** | SQLite with Write-Ahead Logging (WAL) |
| **Search Query** | SQL LIKE + FTS5 (when available) |

### Why Git Cannot Handle This

- **GitHub Limit**: 100MB per file (Git LFS: 2GB)
- **Our DB Size**: ~140GB
- **Solution**: Generate locally or use external storage (NAS, Cloud)

### Backup & Restore

**Backup**:

```bash
# Copy to external drive
xcopy /E /H data\global_patent_index.db E:\backups\
```

**Restore**:

```bash
# Copy from backup
xcopy /E /H E:\backups\global_patent_index.db data\
```

---

## 한국어

### 개요

ChemIP-Platform은 여러 글로벌 특허청의 특허 데이터를 저장하고 검색하기 위해 **대용량 SQLite 데이터베이스**(~140GB)를 사용합니다. 파일 크기 때문에 Git에 푸시할 수 없으며, 로컬에서 직접 생성하거나 백업에서 복원해야 합니다.

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                      원본 특허 데이터 소스                        │
│        S:\특허 논문 DB\downloaded_patents (~1.6TB)               │
│  ├── USPTO/    (미국 특허청)                                     │
│  ├── EPO/      (유럽 특허청)                                     │
│  ├── WIPO/     (세계지식재산기구)                                 │
│  ├── JPO/      (일본 특허청)                                     │
│  ├── KIPRIS/   (한국 특허정보원)                                  │
│  └── CNIPA/    (중국 국가지식산권국)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ scripts/build_global_index.py
                              │ (멀티프로세싱 + Aho-Corasick)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              data/global_patent_index.db (~140GB)               │
│  ├── patent_index (patent_id, title, jurisdiction 등)           │
│  └── chemical_matches (keyword, snippet, file_path 등)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Backend API (FastAPI)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│                 GET /api/global/patents/{chem_id}               │
└─────────────────────────────────────────────────────────────────┘
```

### 데이터베이스 파일 위치

| 파일 | 크기 | 설명 |
|------|------|------|
| `data/global_patent_index.db` | ~140GB | 메인 특허 검색 인덱스 |
| `data/terminology.db` | ~300MB | 화학물질 용어 조회 |
| `data/uspto_index.db` | ~6GB | 레거시 USPTO 전용 인덱스 |

### 인덱스 빌드 방법

1. **원본 특허 데이터 확인**: `S:\특허 논문 DB\downloaded_patents` 경로에 데이터가 있어야 함
2. **인덱싱 스크립트 실행**:

   ```bash
   python scripts/build_global_index.py
   ```

3. **진행 상황 모니터링** (선택):

   ```bash
   python scripts/monitor_indexing.py
   ```

4. **인덱스 검증**:

   ```bash
   python scripts/verify_global_index.py
   ```

> ⚠️ **주의**: 전체 인덱싱은 하드웨어에 따라 **24~48시간** 소요됩니다.

### 기술 세부 사항

| 구성 요소 | 기술 |
|-----------|------|
| **인덱싱 엔진** | Aho-Corasick 알고리즘 (다중 패턴 검색) |
| **병렬 처리** | Python `multiprocessing` (CPU 코어 - 1) |
| **파일 형식** | JSONL (gzip 압축) |
| **데이터베이스** | SQLite + WAL (Write-Ahead Logging) |
| **검색 쿼리** | SQL LIKE + FTS5 (가능한 경우) |

### Git으로 관리할 수 없는 이유

- **GitHub 제한**: 파일당 100MB (Git LFS: 2GB)
- **DB 크기**: ~140GB
- **해결책**: 로컬 생성 또는 외부 저장소 사용 (NAS, 클라우드)

### 백업 및 복원

**백업**:

```bash
# 외장 드라이브로 복사
xcopy /E /H data\global_patent_index.db E:\backups\
```

**복원**:

```bash
# 백업에서 복사
xcopy /E /H E:\backups\global_patent_index.db data\
```

---

## Data Flow Summary | 데이터 흐름 요약

```
1. Raw Patents (1.6TB JSONL.gz)
       ↓
2. Indexing Script (build_global_index.py)
   - Aho-Corasick multi-pattern matching
   - Multiprocessing for speed
       ↓
3. SQLite Database (140GB)
   - patent_index table
   - chemical_matches table
       ↓
4. FastAPI Backend
   - Query optimization
   - Response caching
       ↓
5. Next.js Frontend
   - User search interface
   - Real-time results
```

---

## Contact | 문의

For database backup access or technical questions, contact the project maintainer.

데이터베이스 백업 접근 또는 기술적 질문은 프로젝트 관리자에게 문의하세요.
