import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchJsonSafe, getErrorMessage } from '@/lib/http';

import type { DrugSearchResult, DrugTab, OpenFDAResponse, PubMedResponse } from './types';

export function useDrugSearch() {
  const autoQueryRef = useRef('');
  const openFdaLoadedQueryRef = useRef('');
  const pubMedLoadedQueryRef = useRef('');

  const [initialQuery, setInitialQuery] = useState('');
  const [result, setResult] = useState<DrugSearchResult | null>(null);
  const [openFdaResult, setOpenFdaResult] = useState<OpenFDAResponse | null>(null);
  const [pubMedResult, setPubMedResult] = useState<PubMedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelLoading, setPanelLoading] = useState<DrugTab | null>(null);
  const [tab, setTab] = useState<DrugTab>('easy');
  const [expanded, setExpanded] = useState<number | null>(null);

  const loadOpenFDA = useCallback(async (query: string) => {
    if (!query.trim()) return;
    if (openFdaLoadedQueryRef.current === query) return;

    setPanelLoading('openfda');
    try {
      const result = await fetchJsonSafe<OpenFDAResponse>(`/api/drugs/openfda?q=${encodeURIComponent(query)}&limit=10`);
      if (!result.ok || !result.data) {
        throw new Error(getErrorMessage(result, 'OpenFDA API failed'));
      }
      setOpenFdaResult(result.data);
      openFdaLoadedQueryRef.current = query;
    } catch (error) {
      console.error(error);
      setOpenFdaResult({ query, query_used: '', total: 0, items: [] });
    } finally {
      setPanelLoading(null);
    }
  }, []);

  const loadPubMed = useCallback(async (query: string) => {
    if (!query.trim()) return;
    if (pubMedLoadedQueryRef.current === query) return;

    setPanelLoading('pubmed');
    try {
      const result = await fetchJsonSafe<PubMedResponse>(`/api/drugs/pubmed?q=${encodeURIComponent(query)}&limit=10`);
      if (!result.ok || !result.data) {
        throw new Error(getErrorMessage(result, 'PubMed API failed'));
      }
      setPubMedResult(result.data);
      pubMedLoadedQueryRef.current = query;
    } catch (error) {
      console.error(error);
      setPubMedResult({ query, count: 0, ids: [], articles: [] });
    } finally {
      setPanelLoading(null);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setExpanded(null);
    setOpenFdaResult(null);
    setPubMedResult(null);
    openFdaLoadedQueryRef.current = '';
    pubMedLoadedQueryRef.current = '';

    try {
      const result = await fetchJsonSafe<DrugSearchResult>(`/api/drugs/search?q=${encodeURIComponent(query)}&limit=20`);
      if (!result.ok || !result.data) {
        throw new Error(getErrorMessage(result, 'Drug search failed'));
      }

      setResult(result.data);

      if (result.data.easyInfo.items.length > 0) setTab('easy');
      else if (result.data.approval.items.length > 0) setTab('approval');
      else setTab('openfda');
    } catch (error) {
      console.error(error);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const keyword = (params.get('q') || '').trim();
    setInitialQuery(keyword);
    if (!keyword) {
      autoQueryRef.current = '';
      return;
    }

    if (autoQueryRef.current === keyword) {
      return;
    }
    autoQueryRef.current = keyword;
    void handleSearch(keyword);
  }, [handleSearch]);

  useEffect(() => {
    if (!result) return;
    if (tab === 'openfda') {
      void loadOpenFDA(result.query);
    }
    if (tab === 'pubmed') {
      void loadPubMed(result.query);
    }
  }, [result, tab, loadOpenFDA, loadPubMed]);

  return {
    initialQuery,
    result,
    openFdaResult,
    pubMedResult,
    loading,
    panelLoading,
    tab,
    expanded,
    setTab,
    setExpanded,
    handleSearch,
  };
}
