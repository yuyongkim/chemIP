import { useCallback, useState } from 'react';

import {
  DEMO_FRAUD_ITEMS,
  DEMO_PRICE_ITEMS,
  DEMO_PRODUCT_ITEMS,
  DEMO_STRATEGY_ITEMS,
  PRODUCT_SEED_KEYWORDS,
} from './constants';
import type { FraudItem, PriceItem, ProductItem, StrategyItem, TabId } from './types';
import { dedupeProducts, fetchJsonSafe, filterProductsByKeyword, stripHtml } from './utils';

interface FetchDataParams {
  tab: TabId;
  country: string;
  keyword: string;
}

export function useTradeData() {
  const [rawData, setRawData] = useState<unknown[]>([]);
  const [productBaseData, setProductBaseData] = useState<ProductItem[]>([]);
  const [productBaseCountry, setProductBaseCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastQuery, setLastQuery] = useState('');
  const [fallbackNote, setFallbackNote] = useState('');

  const fetchData = useCallback(
    async ({ tab, country, keyword }: FetchDataParams) => {
      const c = country;
      const k = (keyword || '').trim();

      setLoading(true);
      setRawData([]);
      setFallbackNote('');

      try {
        if (tab === 'products') {
          const q = k;
          setLastQuery(q || 'All');

          const needReloadBase = c !== productBaseCountry || productBaseData.length === 0;
          let baseItems = productBaseData;

          if (needReloadBase) {
            const merged: ProductItem[] = [];
            for (const seed of PRODUCT_SEED_KEYWORDS) {
              const result = await fetchJsonSafe(
                `/api/trade/news?q=${encodeURIComponent(seed)}&country=${encodeURIComponent(c)}&page=1&limit=40`,
              );
              const payload = (result.data as { data?: unknown[] } | null) ?? null;
              const items = Array.isArray(payload?.data) ? (payload.data as ProductItem[]) : [];
              if (items.length > 0) {
                merged.push(...items);
              }
            }

            baseItems = dedupeProducts(merged);

            if (baseItems.length === 0) {
              const fallbackMerged: ProductItem[] = [];
              for (const seed of PRODUCT_SEED_KEYWORDS.slice(0, 3)) {
                const fallbackQuery = `${seed} ${c || 'global'} market trends`;
                const fallbackResult = await fetchJsonSafe(
                  `/api/trade/naver-news?q=${encodeURIComponent(fallbackQuery)}&limit=20&page=1`,
                );
                const fallbackPayload = (fallbackResult.data as { data?: unknown[] } | null) ?? null;
                const fallbackItems = Array.isArray(fallbackPayload?.data) ? (fallbackPayload.data as ProductItem[]) : [];
                if (fallbackItems.length > 0) {
                  fallbackMerged.push(...fallbackItems);
                }
              }
              baseItems = dedupeProducts(fallbackMerged);
              if (baseItems.length > 0) {
                setFallbackNote('Insufficient KOTRA data; showing alternative news sources.');
              }
            }

            if (baseItems.length === 0) {
              const filteredDemo = c ? DEMO_PRODUCT_ITEMS.filter((item) => item.cntryNm.includes(c)) : DEMO_PRODUCT_ITEMS;
              baseItems = filteredDemo.length > 0 ? filteredDemo : DEMO_PRODUCT_ITEMS;
              setFallbackNote('No live market data available; showing sample data.');
            }

            setProductBaseData(baseItems);
            setProductBaseCountry(c);
          }

          const filteredItems = filterProductsByKeyword(baseItems, q);
          if (q && filteredItems.length === 0 && baseItems.length > 0) {
            setRawData(baseItems);
            setTotal(baseItems.length);
            setFallbackNote(`No results for '${q}'; showing all ${baseItems.length} items.`);
            return;
          }

          setRawData(filteredItems);
          setTotal(filteredItems.length);
          return;
        }

        if (tab === 'strategy') {
          const result = await fetchJsonSafe(`/api/trade/strategy?country=${encodeURIComponent(c)}&limit=50&page=1`);
          const payload = (result.data as { data?: unknown[]; total?: number } | null) ?? null;
          const items = Array.isArray(payload?.data) ? (payload.data as StrategyItem[]) : [];
          if (result.ok && items.length > 0) {
            setRawData(items);
            setTotal(Number(payload?.total || items.length || 0));
            return;
          }

          const fallbackQuery = `${c || k || 'global'} market entry strategy analysis`;
          const fallbackResult = await fetchJsonSafe(`/api/trade/naver-news?q=${encodeURIComponent(fallbackQuery)}&limit=20&page=1`);
          const fallbackPayload = (fallbackResult.data as { data?: unknown[] } | null) ?? null;
          const fallbackItems = (Array.isArray(fallbackPayload?.data) ? (fallbackPayload.data as ProductItem[]) : []).map((n) => ({
            title: stripHtml(n.newsTitl || 'Market entry strategy reference'),
            country: c || n.cntryNm || 'Global',
            date: n.newsWrtDt || '',
            url: n.newsUrl || n.kotraNewsUrl || '',
            summary: stripHtml(n.cntntSumar || n.newsBdt || ''),
          }));
          setRawData(fallbackItems);
          setTotal(fallbackItems.length);
          if (fallbackItems.length > 0) {
            setFallbackNote(`No KOTRA strategy data; showing news-based references (query: ${fallbackQuery})`);
          } else {
            const filteredDemo = c ? DEMO_STRATEGY_ITEMS.filter((item) => item.country.includes(c)) : DEMO_STRATEGY_ITEMS;
            const demo = filteredDemo.length > 0 ? filteredDemo : DEMO_STRATEGY_ITEMS;
            setRawData(demo);
            setTotal(demo.length);
            if (demo.length > 0) {
              setFallbackNote('No live strategy data available; showing sample data.');
            } else if (!result.ok || !fallbackResult.ok) {
              setFallbackNote(`Strategy API error (${result.status || fallbackResult.status || 'network'})`);
            }
          }
          return;
        }

        if (tab === 'prices') {
          const result = await fetchJsonSafe(`/api/trade/prices?country=${encodeURIComponent(c)}&limit=50&page=1`);
          const payload = (result.data as { data?: unknown[]; total?: number } | null) ?? null;
          const items = Array.isArray(payload?.data) ? (payload.data as PriceItem[]) : [];
          if (result.ok && items.length > 0) {
            setRawData(items);
            setTotal(Number(payload?.total || items.length || 0));
            return;
          }

          const fallbackQuery = `${c || 'global'} ${k || 'prices'} exchange rate market trends`;
          const fallbackResult = await fetchJsonSafe(`/api/trade/naver-news?q=${encodeURIComponent(fallbackQuery)}&limit=20&page=1`);
          const fallbackPayload = (fallbackResult.data as { data?: unknown[] } | null) ?? null;
          const fallbackItems = (Array.isArray(fallbackPayload?.data) ? (fallbackPayload.data as ProductItem[]) : []).map((n) => ({
            itemName: stripHtml(n.newsTitl || 'Price-related news'),
            price: '-',
            unit: '',
            country: c || n.cntryNm || 'Global',
            currency: '',
            category: 'News-based price trends',
            newsUrl: n.newsUrl || n.kotraNewsUrl || '',
            date: n.newsWrtDt || '',
            source: n.source || 'Naver',
          }));
          setRawData(fallbackItems);
          setTotal(fallbackItems.length);
          if (fallbackItems.length > 0) {
            setFallbackNote(`No KOTRA price data; showing Naver news as fallback (query: ${fallbackQuery})`);
          } else {
            const filteredDemo = c ? DEMO_PRICE_ITEMS.filter((item) => (item.country || '').includes(c)) : DEMO_PRICE_ITEMS;
            const demo = filteredDemo.length > 0 ? filteredDemo : DEMO_PRICE_ITEMS;
            setRawData(demo);
            setTotal(demo.length);
            if (demo.length > 0) {
              setFallbackNote('No live price data available; showing sample data.');
            } else if (!result.ok || !fallbackResult.ok) {
              setFallbackNote(`Price data API error (${result.status || fallbackResult.status || 'network'})`);
            }
          }
          return;
        }

        const result = await fetchJsonSafe('/api/trade/fraud?limit=50&page=1');
        const payload = (result.data as { data?: unknown[]; total?: number } | null) ?? null;
        const items = Array.isArray(payload?.data) ? (payload.data as FraudItem[]) : [];
        if (items.length > 0) {
          setRawData(items);
          setTotal(Number(payload?.total || items.length || 0));
        } else {
          const filteredDemo = c ? DEMO_FRAUD_ITEMS.filter((item) => (item.country || '').includes(c)) : DEMO_FRAUD_ITEMS;
          const demo = filteredDemo.length > 0 ? filteredDemo : DEMO_FRAUD_ITEMS;
          setRawData(demo);
          setTotal(demo.length);
          if (demo.length > 0) {
            setFallbackNote('No live trade fraud data available; showing sample data.');
          } else if (!result.ok) {
            setFallbackNote(`Trade fraud API error (${result.status || 'network'})`);
          }
        }
      } catch (error) {
        console.error(error);
        setRawData([]);
        setTotal(0);
        setFallbackNote('');
      } finally {
        setLoading(false);
      }
    },
    [productBaseCountry, productBaseData],
  );

  return {
    rawData,
    loading,
    total,
    lastQuery,
    fallbackNote,
    fetchData,
  };
}
