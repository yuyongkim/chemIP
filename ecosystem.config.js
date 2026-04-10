const path = require('path');

const ROOT = __dirname;
const FOOD_ROOT = path.resolve(__dirname, '..', 'food');

module.exports = {
  apps: [
    {
      name: 'Hub-Dashboard-9000',
      script: 'python',
      args: 'dashboard_server.py',
      cwd: ROOT,
      watch: false,
      env: {
        DASHBOARD_PORT: 9000,
      },
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'T3-ChemIP-Backend',
      script: 'python',
      args: '-m uvicorn backend.main:app --host 127.0.0.1 --port 7011 --reload --no-proxy-headers',
      cwd: ROOT,
      watch: ['backend'],
      ignore_watch: ['frontend/node_modules', 'data', 'logs', '.venv', 'archive', 'backups', '_archive'],
      env: {
        PORT: 7011,
        LOG_DIR: './logs',
        LLM_MODEL: 'gemma3:4b',
        LLM_MAX_TOKENS: '512',
        LLM_TIMEOUT_SECONDS: '25',
      },
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'T3-ChemIP-Frontend',
      script: 'node',
      args: './node_modules/next/dist/bin/next dev -p 7000',
      cwd: path.join(ROOT, 'frontend'),
      watch: ['app', 'components'],
      ignore_watch: ['node_modules', '.next', 'logs'],
      env: {
        PORT: 7000,
        BACKEND_ORIGIN: 'http://127.0.0.1:7011',
      },
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'T4-SoulsKitchen-Backend',
      script: 'python',
      args: '-m uvicorn backend.main:app --host 127.0.0.1 --port 8010 --reload',
      cwd: FOOD_ROOT,
      watch: ['backend'],
      ignore_watch: ['frontend/node_modules', 'data', 'logs', '.venv'],
      env: {
        PORT: 8010,
      },
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'T4-SoulsKitchen-Frontend',
      script: 'npm',
      interpreter: 'none',
      args: 'run dev -- --port 8002',
      cwd: path.join(FOOD_ROOT, 'frontend'),
      watch: ['src'],
      ignore_watch: ['node_modules', 'dist', 'logs'],
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8010/api',
      },
      max_restarts: 3,
      min_uptime: '10s',
    },
  ],
};
