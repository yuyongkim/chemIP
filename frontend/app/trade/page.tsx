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
import TradeHero from './components/TradeHero';
import TradeFilters from './components/TradeFilters';
import ProductResults from './components/ProductResults';
import StrategyBrief from './components/StrategyBrief';
import StrategyResults from './components/StrategyResults';
import PriceResults from './components/PriceResults';
import FraudResults from './components/FraudResults';

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
        onTabChange={onTabChange}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{visibleTotal}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-gray-500">Countries</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{countryCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500">{tab === 'strategy' ? 'Latest Update' : 'Query Criteria'}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {tab === 'strategy' ? strategyLastUpdated : tab === 'products' ? `Keyword: ${lastQuery || keyword}` : country || 'All Countries'}
            </p>
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
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-600">Loading data...</p>
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

