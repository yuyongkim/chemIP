# ChemIP-Platform

Chemical Intellectual Property & Safety Data Platform.
This platform integrates **KOSHA MSDS data** with a **Global Patent Index** to provide comprehensive chemical safety and intellectual property information.

## Features

- **MSDS Search**: Real-time retrieval of Material Safety Data Sheets from KOSHA (Korea Occupational Safety and Health Agency).
- **Global Patent Search**: Index and search patents from major authorities (USPTO, EPO, WIPO, etc.) linked to chemical substances.
- **Chemical Information**: Detailed breakdown of 16 MSDS sections including hazards, first aid, and regulatory info.

## System Architecture

- **Backend**: Python (FastAPI)
- **Frontend**: TypeScript (Next.js 16, Tailwind CSS)
- **Database**: SQLite (Local Indexing)

## Setup

### 1. Prerequisites

- Python 3.8+
- Node.js 18+
- Git

### 2. Environment Variables

Create a `.env` file in the root directory with the following keys:

```env
# KOSHA API Key (Decoding)
KOSHA_SERVICE_KEY_DECODED="your_service_key_here"

# KIPRIS API Key (Optional)
KIPRIS_API_KEY="your_kipris_key_here"

# KOTRA API Key (Required for Market News)
KOTRA_API_KEY_DECODED="your_kotra_key_here"
```

### 3. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

## Data Indexing

Before running the server, you need to build the patent index.

### Build Global Patent Index

This script scans `S:\특허 논문 DB\downloaded_patents` and indexes patent data from all available jurisdictions (USPTO, EPO, WIPO, etc.).

```bash
python scripts/build_global_index.py
python scripts/build_global_index.py
```

> **Important:** The generated index file (`data/global_patent_index.db`) can be very large (>100GB). It is excluded from Git via `.gitignore`. You must rebuild it locally or download a backup if available.

*Note: This process may take a significant amount of time depending on the data size.*

### Verify Index

Check the status and statistics of the built index.

```bash
python scripts/verify_global_index.py
```

## Running Locally

### Start Backend Server

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### Start Frontend Server

```bash
cd frontend
npm run dev
```

Access the application at: [http://localhost:3000](http://localhost:3000)

## API Usage

### Chemical Search

- **Endpoint**: `GET /api/chemicals?keyword={term}`
- **Description**: Search for chemicals by name or CAS number.

### MSDS Details

- **Endpoint**: `GET /api/chemicals/{chem_id}`
- **Description**: Get full MSDS details for a specific chemical.

### Global Patent Search

- **Endpoint**: `GET /api/global/patents/{chem_id}`
- **Description**: Search for patents related to a chemical across all indexed jurisdictions.

### Market News (KOTRA)

- **Endpoint**: `GET /api/trade/news`
- **Description**: Retrieve overseas market news and commodity trends for chemicals.
