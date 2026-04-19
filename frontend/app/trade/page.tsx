'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { TrendingUp, DollarSign, ShieldAlert, MapPin, Tag, BarChart3, Sparkles } from 'lucide-react';

import type { PriceItem, ProductItem, StrategyItem, TabConfig, TabId, StrategyPanel, FraudItem } from './types';
import { COUNTRIES, TAB_DESCRIPTIONS } from './constants';
import { buildDynamicPriceKeywords, buildDynamicProductKeywords, stripHtml, toDateValue } from './utils';
import { useTradeData } from './useTradeData';
import { useStrategyInsights } from './useStrategyInsights';
import nextDynamic from 'next/dynamic';
import TradeHero from './components/TradeHero';
import TradeFilters from './components/TradeFilters';
const ProductResults = nextDynamic(() => import('./components/ProductResults'));
const StrategyBrief = nextDynamic(() => import('./components/StrategyBrief'));
const StrategyResults = nextDynamic(() => import('./components/StrategyResults'));
const PriceResults = nextDynamic(() => import('./components/PriceResults'));
const FraudResults = nextDynamic(() => import('./components/FraudResults'));

export const dynamic = 'force-dynamic';

const TABS: TabConfig[] = [
  { id: 'products', label: 'Products DB', icon: <Tag className="w-4 h-4" /> },
  { id: 'strategy', label: 'Market Strategy', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'prices', label: 'Price Info', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'fraud', label: 'Trade Fraud', icon: <ShieldAlert className="w-4 h-4" /> },
];

function TradePageClient() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>('products');
  const [country, setCountry] = useState('');
  const [keyword, setKeyword] = useState('');

  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'country'>('date_desc');
  const [fraudCategory, setFraudCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [strategyPanel, setStrategyPanel] = useState<StrategyPanel>('checklist');
  const [showAllStrategyDocs, setShowAllStrategyDocs] = useState(false);

  const { rawData, loading, lastQuery, fallbackNote, fetchData } = useTradeData();

  const activeTab = TABS.find((item) => item.id === tab) || TABS[0];
  const countryOptions = useMemo(() => COUNTRIES.filter(Boolean), []);
  const productKeywordChips = useMemo(() => buildDynamicProductKeywords(keyword), [keyword]);
  const priceKeywordChips = useMemo(() => buildDynamicPriceKeywords(keyword), [keyword]);

  useEffect(() => {
    const q = (searchParams.get('q') || '').trim();
    const c = (searchParams.get('country') || '').trim();
    setKeyword(q);
    setCountry(c);
    void fetchData({ tab: 'products', country: c, keyword: q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const {
    strategyData,
    strategyCountryStats,
    strategyYearStats,
    strategyThemeStats,
    strategyLatestYear,
    strategyRecentCount,
    strategyBrief,
    strategyLastUpdated,
    strategyChecklist,
    strategyDocPreview,
  } = useStrategyInsights({
    rawData,
    sortBy,
    dateFrom,
    dateTo,
    showAllStrategyDocs,
  });

  const priceData = useMemo(() => {
    const items = rawData as PriceItem[];
    return items.filter((item) => !country || (item.country || '').includes(country));
  }, [rawData, country]);

  const fraudData = useMemo(() => {
    const items = (rawData as FraudItem[]).map((item) => ({
      ...item,
      content: stripHtml(item.content || ''),
      date: item.incidentPeriod || item.date || '',
    }));
    return items.filter((item) => {
      const passCategory = !fraudCategory || (item.category || '').includes(fraudCategory);
      const dv = toDateValue(item.date || '');
      const from = dateFrom ? toDateValue(dateFrom) : 0;
      const to = dateTo ? toDateValue(dateTo) : Number.MAX_SAFE_INTEGER;
      const passDate = dv === 0 || (dv >= from && dv <= to);
      const passCountry = !country || (item.country || '').includes(country);
      return passCategory && passDate && passCountry;
    });
  }, [rawData, fraudCategory, dateFrom, dateTo, country]);

  const countryCount = useMemo(() => {
    const source =
      tab === 'strategy' ? strategyData : tab === 'fraud' ? fraudData : tab === 'prices' ? priceData : (rawData as ProductItem[]);
    const set = new Set(
      source
        .map((item: StrategyItem | FraudItem | PriceItem | ProductItem) =>
          'country' in item ? item.country : 'cntryNm' in item ? item.cntryNm : '',
        )
        .filter(Boolean),
    );
    return set.size;
  }, [tab, rawData, strategyData, fraudData, priceData]);

  const visibleTotal = useMemo(() => {
    if (tab === 'strategy') return strategyData.length;
    if (tab === 'prices') return priceData.length;
    if (tab === 'fraud') return fraudData.length;
    return (rawData as ProductItem[]).length;
  }, [tab, rawData, strategyData, priceData, fraudData]);

  const onTabChange = (nextTab: TabId) => {
    setTab(nextTab);
    setShowAllStrategyDocs(false);
    setStrategyPanel('checklist');
    void fetchData({ tab: nextTab, country, keyword });
  };

  const onCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    void fetchData({ tab, country: nextCountry, keyword });
  };

  const onKeywordSearch = (nextKeyword: string) => {
    setKeyword(nextKeyword);
    void fetchData({ tab: 'products', country, keyword: nextKeyword });
  };

  const onKeywordChipClick = (chip: string) => {
    const nextKeyword = chip.trim();
    if (!nextKeyword) return;

    setKeyword(nextKeyword);
    if (tab === 'products' || tab === 'prices') {
      void fetchData({ tab, country, keyword: nextKeyword });
    }
  };

  const onRefresh = () => {
    void fetchData({ tab, country, keyword });
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <TradeHero
        tab={tab}
        tabs={TABS}
        tabDescriptions={TAB_DESCRIPTIONS}
        total={visibleTotal}
        countryCount={countryCount}
        lastQuery={lastQuery}
        keyword={keyword}
        country={country}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150 ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'strategy' && (
          <StrategyBrief
            brief={strategyBrief}
            lastUpdated={strategyLastUpdated}
            documentCount={strategyData.length}
            country={country}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100/80 px-4 py-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total</p>
              <p className="text-lg font-bold text-gray-900 font-mono tabular-nums">{visibleTotal}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100/80 px-4 py-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <MapPin className="w-4 h-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Countries</p>
              <p className="text-lg font-bold text-gray-900 font-mono tabular-nums">{countryCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100/80 px-4 py-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{tab === 'strategy' ? 'Latest update' : 'Query criteria'}</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {tab === 'strategy' ? strategyLastUpdated : tab === 'products' ? `Keyword: ${lastQuery || keyword}` : country || 'All countries'}
              </p>
            </div>
          </div>
        </div>

        <TradeFilters
          tab={tab}
          country={country}
          keyword={keyword}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sortBy={sortBy}
          fraudCategory={fraudCategory}
          countryOptions={countryOptions}
          productKeywordChips={productKeywordChips}
          priceKeywordChips={priceKeywordChips}
          onCountryChange={onCountryChange}
          onKeywordSearch={onKeywordSearch}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onSortByChange={setSortBy}
          onFraudCategoryChange={setFraudCategory}
          onRefresh={onRefresh}
          onKeywordChipClick={onKeywordChipClick}
        />

        {!loading && fallbackNote && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {fallbackNote}
          </div>
        )}

        {loading && (
          <div className="space-y-4 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-5 w-16 rounded" />
                </div>
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && tab === 'products' && <ProductResults items={rawData as ProductItem[]} />}

        {!loading && tab === 'strategy' && (
          <StrategyResults
            strategyLatestYear={strategyLatestYear}
            strategyRecentCount={strategyRecentCount}
            strategyCountryStats={strategyCountryStats}
            strategyThemeStats={strategyThemeStats}
            strategyYearStats={strategyYearStats}
            strategyPanel={strategyPanel}
            onStrategyPanelChange={setStrategyPanel}
            strategyChecklist={strategyChecklist}
            strategyDocPreview={strategyDocPreview}
            strategyDataCount={strategyData.length}
            showAllStrategyDocs={showAllStrategyDocs}
            onToggleShowAllDocs={() => setShowAllStrategyDocs((prev) => !prev)}
            onSelectCoverageCountry={(selectedCountry) => {
              setCountry(selectedCountry);
              void fetchData({ tab: 'strategy', country: selectedCountry, keyword });
            }}
          />
        )}

        {!loading && tab === 'prices' && <PriceResults items={priceData} />}

        {!loading && tab === 'fraud' && <FraudResults items={fraudData} />}

        {!loading &&
          ((tab === 'strategy' && strategyData.length === 0) ||
            (tab === 'prices' && priceData.length === 0) ||
            (tab === 'fraud' && fraudData.length === 0) ||
            (tab === 'products' && (rawData as ProductItem[]).length === 0)) && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">{activeTab.icon}</div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">No {activeTab.label} data available</h2>
              <p className="text-gray-500">Try adjusting filters or changing the country/keyword.</p>
            </div>
          )}
      </div>
    </main>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading page...</div>}>
      <TradePageClient />
    </Suspense>
  );
}


