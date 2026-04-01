import { Globe2 } from 'lucide-react';

import type { TabConfig, TabId } from '../types';

interface TradeHeroProps {
  tab: TabId;
  tabs: TabConfig[];
  tabDescriptions: Record<TabId, string>;
  total: number;
  countryCount: number;
  lastQuery: string;
  keyword: string;
  country: string;
  onTabChange: (id: TabId) => void;
}

export default function TradeHero({
  tab,
  tabs,
  tabDescriptions,
  total,
  countryCount,
  lastQuery,
  keyword,
  country,
  onTabChange,
}: TradeHeroProps) {
  const activeTab = tabs.find((item) => item.id === tab) || tabs[0];

  return (
    <div className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.28),transparent_45%),radial-gradient(circle_at_82%_12%,rgba(6,182,212,0.3),transparent_42%)]"></div>
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"></div>
      <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5 items-stretch">
          <section className="rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-300/20 text-emerald-100 text-xs font-semibold mb-4">
              <Globe2 className="w-3.5 h-3.5" />
              Global Market Intelligence
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">KOTRA Trade Data Analysis Hub</h1>
            <p className="text-slate-100/90">
              A unified view of news, strategies, pricing, and fraud risk for market entry decision-making.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((item) => (
                <button
                  key={`hero-${item.id}`}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === item.id
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-900'
                      : 'border-white/40 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <aside className="rounded-3xl border border-emerald-200/30 bg-black/30 p-6 backdrop-blur">
            <p className="text-xs font-semibold text-emerald-200 mb-2">Current Analysis Section</p>
            <h2 className="text-2xl font-bold text-white mb-2">{activeTab.label}</h2>
            <p className="text-sm text-slate-200">{tabDescriptions[tab]}</p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl bg-white/10 border border-white/20 p-3">
                <p className="text-[11px] text-slate-300 mb-1">Total</p>
                <p className="text-xl font-bold text-white">{total}</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/20 p-3">
                <p className="text-[11px] text-slate-300 mb-1">Countries</p>
                <p className="text-xl font-bold text-white">{countryCount}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-white/10 border border-white/20 p-3">
                <p className="text-[11px] text-slate-300 mb-1">Current Filter</p>
                <p className="text-sm font-semibold text-white">
                  {tab === 'products' ? `Keyword: ${lastQuery || keyword}` : country || 'All Countries'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
