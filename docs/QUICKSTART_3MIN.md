# 3-Minute Quickstart

## 1) Install

```bash
pip install -r requirements.txt
cd frontend
npm install
```

## 2) Configure

- Copy `.env.example` to `.env`
- Fill required API keys

## 3) Run

Windows:

```bat
start_all.bat
```

Linux/macOS:

```bash
bash start_all.sh
```

## 4) Verify

- Frontend: `http://localhost:7000`
- Backend health: `http://127.0.0.1:7010/health`
- Backend ready: `http://127.0.0.1:7010/ready`
