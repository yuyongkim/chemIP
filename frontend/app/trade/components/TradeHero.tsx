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
    <div id="main-content" className="relative overflow-hidden border-b border-gray-100">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-white to-gray-50/50" />
      <div className="absolute top-[-100px] right-[-50px] w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5 items-stretch">
          <section className="rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm p-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold mb-4">
              <Globe2 className="w-3.5 h-3.5" />
              Global market intelligence
            </div>
            <h1 className="text-3xl font-extrabold tracking-[-0.025em] text-gray-900 mb-3">KOTRA trade data hub</h1>
            <p className="text-gray-500 leading-relaxed">
              A unified view of news, strategies, pricing, and fraud risk for market entry decision-making.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((item) => (
                <button
                  key={`hero-${item.id}`}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    tab === item.id
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <aside className="rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm p-6">
            <p className="text-xs font-medium text-gray-400 mb-2">Current section</p>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">{activeTab.label}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{tabDescriptions[tab]}</p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-400 mb-1">Total</p>
                <p className="text-xl font-bold text-gray-900 font-mono tabular-nums">{total}</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-400 mb-1">Countries</p>
                <p className="text-xl font-bold text-gray-900 font-mono tabular-nums">{countryCount}</p>
              </div>
              <div className="col-span-2 rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-400 mb-1">Current filter</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {tab === 'products' ? `Keyword: ${lastQuery || keyword}` : country || 'All countries'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
