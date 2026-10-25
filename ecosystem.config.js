const path = require('path');

const ROOT = __dirname;
const FOOD_ROOT = path.resolve(__dirname, '..', 'food');

// 파이썬 앱은 venv 중계 python.exe를 거치면 PM2(콘솔 없음)가 자식 콘솔 창을 새로 띄운다.
// 실제 파이썬을 직접 실행하고, venv 패키지는 PYTHONPATH로 연결한다. 경로는 여기서만 정의한다.
const PYTHON = 'C:\\Program Files\\Python313\\python.exe';
const sitePackages = (root) => path.join(root, '.venv', 'Lib', 'site-packages');

module.exports = {
  apps: [
    {
      name: 'Hub-Dashboard-9000',
      script: PYTHON,
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
      script: PYTHON,
      args: '-m uvicorn backend.main:app --host 127.0.0.1 --port 7011 --no-proxy-headers',
      cwd: ROOT,
      watch: false,
      ignore_watch: ['frontend/node_modules', 'data', 'logs', '.venv', 'archive', 'backups', '_archive'],
      env: {
        PYTHONPATH: sitePackages(ROOT),
        PORT: 7011,
        LOG_DIR: './logs',
        LLM_MODEL: 'gemma3:4b',
        LLM_MAX_TOKENS: '512',
        LLM_TIMEOUT_SECONDS: '25',
      },
      autorestart: true,
      max_restarts: 100,
      min_uptime: '20s',
      exp_backoff_restart_delay: 200,
    },
    {
      name: 'T3-ChemIP-Frontend',
      script: 'node',
      args: './node_modules/next/dist/bin/next start -p 7000',
      cwd: path.join(ROOT, 'frontend'),
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs'],
      env: {
        PORT: 7000,
        BACKEND_ORIGIN: 'http://127.0.0.1:7011',
      },
      autorestart: true,
      max_restarts: 100,
      min_uptime: '20s',
      exp_backoff_restart_delay: 200,
    },
    {
      name: 'T4-SoulsKitchen-Backend',
      script: PYTHON,
      args: '-m uvicorn backend.main:app --host 127.0.0.1 --port 8010 --reload',
      cwd: FOOD_ROOT,
      watch: ['backend'],
      ignore_watch: ['frontend/node_modules', 'data', 'logs', '.venv'],
      env: {
        PYTHONPATH: sitePackages(FOOD_ROOT),
        PORT: 8010,
      },
      max_restarts: 3,
      min_uptime: '10s',
    },
    {
      name: 'T4-SoulsKitchen-Frontend',
      // npm.cmd는 cmd 콘솔 창을 만든다 -> node로 vite를 직접 실행
      script: 'node',
      args: './node_modules/vite/bin/vite.js --port 8002',
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
