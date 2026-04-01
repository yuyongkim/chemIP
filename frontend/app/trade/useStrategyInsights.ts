import { useMemo } from 'react';

import type { StrategyItem } from './types';
import { detectStrategyThemes, pickYear, stripHtml, toDateValue } from './utils';

type SortBy = 'date_desc' | 'date_asc' | 'country';

interface UseStrategyInsightsParams {
  rawData: unknown[];
  sortBy: SortBy;
  dateFrom: string;
  dateTo: string;
  showAllStrategyDocs: boolean;
}

export function useStrategyInsights({
  rawData,
  sortBy,
  dateFrom,
  dateTo,
  showAllStrategyDocs,
}: UseStrategyInsightsParams) {
  const strategyData = useMemo(() => {
    const items = (rawData as StrategyItem[]).map((item) => ({ ...item, summary: stripHtml(item.summary || '') }));
    const filtered = items.filter((item) => {
      const dv = toDateValue(item.date || '');
      const from = dateFrom ? toDateValue(dateFrom) : 0;
      const to = dateTo ? toDateValue(dateTo) : Number.MAX_SAFE_INTEGER;
      return dv === 0 || (dv >= from && dv <= to);
    });

    if (sortBy === 'country') return [...filtered].sort((a, b) => (a.country || '').localeCompare(b.country || ''));
    if (sortBy === 'date_asc') return [...filtered].sort((a, b) => toDateValue(a.date) - toDateValue(b.date));
    return [...filtered].sort((a, b) => toDateValue(b.date) - toDateValue(a.date));
  }, [rawData, sortBy, dateFrom, dateTo]);

  const strategyCountryStats = useMemo(() => {
    const map = new Map<string, number>();
    strategyData.forEach((item) => {
      const key = item.country || 'Global';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [strategyData]);

  const strategyYearStats = useMemo(() => {
    const map = new Map<number, number>();
    strategyData.forEach((item) => {
      const year = pickYear(`${item.date || ''} ${item.title || ''}`);
      if (year) map.set(year, (map.get(year) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]).slice(0, 6);
  }, [strategyData]);

  const strategyThemeStats = useMemo(() => {
    const map = new Map<string, number>();
    strategyData.forEach((item) => {
      detectStrategyThemes(`${item.title} ${item.summary || ''}`).forEach((tag) => {
        map.set(tag, (map.get(tag) || 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [strategyData]);

  const strategyLatestYear = useMemo(() => {
    if (strategyYearStats.length === 0) return null;
    return strategyYearStats[0][0];
  }, [strategyYearStats]);

  const strategyRecentCount = useMemo(() => {
    const nowYear = new Date().getFullYear();
    return strategyData.filter((item) => {
      const year = pickYear(`${item.date || ''} ${item.title || ''}`);
      return year ? year >= nowYear - 2 : false;
    }).length;
  }, [strategyData]);

  const strategyBrief = useMemo(() => {
    if (strategyData.length === 0) return null;

    const topCountries = strategyCountryStats.slice(0, 3).map(([name]) => name);
    const topThemes = strategyThemeStats.slice(0, 3).map(([name]) => name);

    return {
      headline: `Market entry strategy update as of ${strategyLatestYear || '-'}, focused on ${topCountries.join(', ') || 'key countries'}`,
      marketView: `Based on ${strategyRecentCount} strategy documents from the past 3 years, key issues include ${topThemes.join(', ') || 'market entry strategy'}.`,
      actionItems: [
        `Priority country: Finalize certification/customs requirements with ${topCountries[0] || 'key market'} as top priority`,
        'Channel strategy: Compare 2+ local partner/distribution channels, then enter with initial test volume',
        'Profitability check: Pre-apply exchange rate/logistics/payment sensitivity scenarios before contract',
      ],
      riskItems: [
        'Regulatory/certification delay risk: Pre-verify HS codes and permits',
        'Transaction terms risk: Staged payments recommended over advance/credit terms',
        'Operational risk: Avoid single distributor dependency, secure alternative channels',
      ],
    };
  }, [strategyData, strategyCountryStats, strategyThemeStats, strategyLatestYear, strategyRecentCount]);

  const strategyLastUpdated = useMemo(() => {
    const latest = strategyData
      .map((item) => item.date || '')
      .filter(Boolean)
      .sort((a, b) => toDateValue(b) - toDateValue(a))[0];
    return latest || `${strategyLatestYear || '-'}`;
  }, [strategyData, strategyLatestYear]);

  const strategyChecklist = useMemo(
    () => [
      { level: 'High', text: 'Pre-verify certification/customs requirements (HS codes/permits)' },
      { level: 'High', text: 'Incorporate payment/contract risk clauses (shipping/claims/exchange rate)' },
      { level: 'Medium', text: 'Compare 2+ local distribution/agent channels' },
      { level: 'Medium', text: 'Enter with small test volume + KPI verification' },
    ],
    [],
  );

  const strategyDocPreview = useMemo(
    () => (showAllStrategyDocs ? strategyData : strategyData.slice(0, 5)),
    [showAllStrategyDocs, strategyData],
  );

  return {
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
  };
}
