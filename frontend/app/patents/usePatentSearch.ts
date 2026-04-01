import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchJsonSafe, getErrorMessage } from '@/lib/http';

import type { Patent, SearchResponse } from './types';

interface UsePatentSearchOptions {
  limit?: number;
}

export function usePatentSearch({ limit = 20 }: UsePatentSearchOptions = {}) {
  const autoQueryRef = useRef('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const doSearch = useCallback(
    async (keyword: string, page: number) => {
      if (!keyword.trim()) return;

      setQuery(keyword);
      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const result = await fetchJsonSafe<SearchResponse>(`/api/patents?q=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`);
        if (!result.ok || !result.data) {
          throw new Error(getErrorMessage(result, `Server error (${result.status})`));
        }

        setResults(result.data.results || []);
        setTotal(result.data.total || 0);
        setTotalPages(result.data.total_pages || 0);
        setCurrentPage(result.data.page || 1);
      } catch (err) {
        console.error(err);
        setError('A patent search error occurred. Please check the backend connection status.');
        setResults([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  const handleSearch = useCallback(
    (keyword: string) => {
      setCurrentPage(1);
      void doSearch(keyword, 1);
    },
    [doSearch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
      void doSearch(query, newPage);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [doSearch, query, totalPages],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const keyword = (params.get('q') || '').trim();
    if (!keyword) {
      autoQueryRef.current = '';
      return;
    }

    const parsedPage = Number.parseInt(params.get('page') || '1', 10);
    const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const signature = `${keyword}::${page}`;
    if (autoQueryRef.current === signature) {
      return;
    }

    autoQueryRef.current = signature;
    void doSearch(keyword, page);
  }, [doSearch]);

  return {
    query,
    results,
    loading,
    error,
    searched,
    currentPage,
    totalPages,
    total,
    handleSearch,
    handlePageChange,
  };
}
