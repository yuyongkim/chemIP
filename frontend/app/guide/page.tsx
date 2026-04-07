'use client';

import Navbar from '@/components/Navbar';
import { BookOpen, GitBranch, HardDrive, Server, Users, CheckCircle2, XCircle, Cloud, Terminal, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function OperationsGuidePage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.25),transparent_45%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.28),transparent_42%)]" />
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-300/20 text-violet-100 text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            {t('guide.badge')}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">{t('guide.title')}</h1>
          <p className="text-slate-200/90 max-w-2xl">
            {t('guide.subtitle')}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            {[
              { icon: <GitBranch className="w-4 h-4" />, label: 'Git Workflow' },
              { icon: <HardDrive className="w-4 h-4" />, label: 'Database' },
              { icon: <Server className="w-4 h-4" />, label: 'Backend' },
              { icon: <Users className="w-4 h-4" />, label: 'Onboarding' },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                {item.icon}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* Git Include/Exclude */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-violet-600" />
            {t('guide.git')}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {t('guide.tracked')}
              </h3>
              <div className="space-y-2 text-sm font-mono text-gray-700">
                {[
                  { name: 'backend/', desc: 'Backend source code' },
                  { name: 'frontend/', desc: 'Frontend source code' },
                  { name: 'scripts/', desc: 'Indexing scripts' },
                  { name: 'tests/', desc: 'Test code' },
                  { name: 'docs/', desc: 'Documentation' },
                  { name: '.gitignore', desc: 'Git exclusion config' },
                  { name: 'README.md', desc: 'Project description' },
                  { name: 'requirements.txt', desc: 'Python dependencies' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="font-semibold text-emerald-900">{item.name}</span>
                    <span className="text-xs text-emerald-600">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-red-800 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {t('guide.excluded')}
              </h3>
              <div className="space-y-2 text-sm font-mono text-gray-700">
                {[
                  { name: 'data/', desc: '140GB DB files', severity: 'high' },
                  { name: '.venv/', desc: 'Virtual environment', severity: 'med' },
                  { name: 'node_modules/', desc: 'npm packages', severity: 'med' },
                  { name: '.env', desc: 'API keys & secrets', severity: 'high' },
                  { name: '*.db', desc: 'Database files', severity: 'high' },
                  { name: '*.log', desc: 'Log files', severity: 'low' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                    <span className="font-semibold text-red-900">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">{item.desc}</span>
                      {item.severity === 'high' && (
                        <Shield className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Database Sharing */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            {t('guide.db')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              { method: 'NAS / Shared Drive', pro: 'Direct team access', con: 'No external access', icon: <Server className="w-5 h-5" /> },
              { method: 'Cloud (S3, GCS)', pro: 'Access from anywhere', con: 'Cost involved', icon: <Cloud className="w-5 h-5" /> },
              { method: 'External Drive', pro: 'Fastest transfer', con: 'Physical delivery', icon: <HardDrive className="w-5 h-5" /> },
              { method: 'Local Rebuild', pro: 'Always up-to-date', con: 'Takes 24-48 hours', icon: <Terminal className="w-5 h-5" /> },
            ].map((item) => (
              <div key={item.method} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 text-blue-600 mb-3">{item.icon}<span className="font-bold text-sm text-gray-900">{item.method}</span></div>
                <p className="text-xs text-emerald-600 mb-1">+ {item.pro}</p>
                <p className="text-xs text-red-500">- {item.con}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-slate-900 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 mb-3">Recommended: AWS S3</p>
            <pre className="text-sm text-slate-200 overflow-x-auto leading-relaxed">{`# Upload
aws s3 cp data/global_patent_index.db s3://your-bucket/msds-db/

# Download
aws s3 cp s3://your-bucket/msds-db/global_patent_index.db data/`}</pre>
          </div>
        </section>

        {/* Backend Operations */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-600" />
            {t('guide.backend')}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-4">{t('common.development')}</div>
              <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 overflow-x-auto leading-relaxed">{`cd G:\\MSDS
.\\.venv\\Scripts\\activate
uvicorn backend.main:app --reload --port 7010`}</pre>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-4">{t('common.production')}</div>
              <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 overflow-x-auto leading-relaxed">{`docker build -t chemip-backend .
docker run -d -p 7010:7010 \\
  -v /path/to/data:/app/data \\
  chemip-backend`}</pre>
            </div>
          </div>
        </section>

        {/* Team Onboarding */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {t('guide.onboarding')}
          </h2>
          <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {[
                { step: 1, title: 'Clone repository', cmd: 'git clone https://github.com/yuyongkim/chemIP.git && cd chemIP' },
                { step: 2, title: 'Python environment', cmd: 'python -m venv .venv && .\\.venv\\Scripts\\activate && pip install -r requirements.txt' },
                { step: 3, title: 'Configure secrets', cmd: 'cp .env.example .env\n# Fill in API keys (KOSHA, KIPRIS, KOTRA, etc.)' },
                { step: 4, title: 'Download database', cmd: 'aws s3 sync s3://bucket/msds-data/ data/' },
                { step: 5, title: 'Start frontend', cmd: 'cd frontend && npm install && npm run dev' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{item.title}</p>
                    <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">{item.cmd}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="pb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {t('guide.checklist')}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">{t('guide.beforePush')}</h3>
              <ul className="space-y-2">
                {[
                  '.gitignore includes data/, .env, *.db',
                  'No hardcoded API keys in source',
                  'requirements.txt is up to date',
                  'Tests pass (pytest)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">{t('guide.newMember')}</h3>
              <ul className="space-y-2">
                {[
                  'Git repository access granted',
                  '.env shared via secure channel',
                  '140GB DB transfer method decided',
                  'API key access confirmed',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
