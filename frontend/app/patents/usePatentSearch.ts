import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchJsonSafe, getErrorMessage } from '@/lib/http';

import type { ChemicalResolution, ChemicalSearchItem, Patent, SearchResponse } from './types';

interface UsePatentSearchOptions {
  limit?: number;
}

function normalizeValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
}

function shouldAttachLocalDb(keyword: string, chemical: ChemicalSearchItem | null): chemical is ChemicalSearchItem {
  if (!chemical) return false;

  const queryNorm = normalizeValue(keyword);
  if (!queryNorm || queryNorm.length < 2) return false;

  const candidates = [chemical.chem_id, chemical.cas_no, chemical.name, chemical.name_en]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => normalizeValue(value));

  return candidates.some((candidate) => candidate === queryNorm || candidate.includes(queryNorm) || queryNorm.includes(candidate));
}

export function usePatentSearch({ limit = 20 }: UsePatentSearchOptions = {}) {
  const autoQueryRef = useRef('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patent[]>([]);
  const [globalResults, setGlobalResults] = useState<Patent[]>([]);
  const [usptoResults, setUsptoResults] = useState<Patent[]>([]);
  const [resolvedChemical, setResolvedChemical] = useState<ChemicalResolution | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const doSearch = useCallback(
    async (keyword: string, page: number) => {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) return;

      setQuery(trimmedKeyword);
      setLoading(true);
      setError(null);
      setWarnings([]);
      setSearched(true);

      try {
        const localLimit = Math.min(limit, 12);
        const [patentResponse, chemicalResponse] = await Promise.all([
          fetchJsonSafe<SearchResponse>(`/api/patents?q=${encodeURIComponent(trimmedKeyword)}&page=${page}&limit=${limit}`),
          fetchJsonSafe<{ items?: ChemicalSearchItem[] }>(`/api/chemicals?q=${encodeURIComponent(trimmedKeyword)}&page=1&limit=1`),
        ]);

        const nextWarnings: string[] = [];

        if (patentResponse.ok && patentResponse.data) {
          setResults(patentResponse.data.results || []);
          setTotal(patentResponse.data.total || 0);
          setTotalPages(patentResponse.data.total_pages || 0);
          setCurrentPage(patentResponse.data.page || 1);
        } else {
          nextWarnings.push(`KIPRIS: ${getErrorMessage(patentResponse, `Server error (${patentResponse.status})`)}`);
          setResults([]);
          setTotal(0);
          setTotalPages(0);
          setCurrentPage(page);
        }

        const chemical =
          chemicalResponse.ok && chemicalResponse.data && Array.isArray(chemicalResponse.data.items)
            ? (chemicalResponse.data.items[0] ?? null)
            : null;

        let nextGlobalResults: Patent[] = [];
        let nextUsptoResults: Patent[] = [];

        if (shouldAttachLocalDb(trimmedKeyword, chemical)) {
          const nextResolvedChemical: ChemicalResolution = {
            chem_id: chemical.chem_id,
            name: chemical.name,
            name_en: chemical.name_en,
            cas_no: chemical.cas_no,
            source: chemical.source,
          };
          setResolvedChemical(nextResolvedChemical);

          const [globalResponse, usptoResponse] = await Promise.all([
            fetchJsonSafe<{ results?: Patent[] }>(`/api/patents/global/${encodeURIComponent(chemical.chem_id)}?page=1&limit=${localLimit}`),
            fetchJsonSafe<{ results?: Patent[] }>(`/api/patents/uspto/${encodeURIComponent(chemical.chem_id)}?page=1&limit=${localLimit}`),
          ]);

          if (globalResponse.ok && globalResponse.data) {
            nextGlobalResults = globalResponse.data.results || [];
          } else {
            nextWarnings.push(`Global DB: ${getErrorMessage(globalResponse, `Server error (${globalResponse.status})`)}`);
          }

          if (usptoResponse.ok && usptoResponse.data) {
            nextUsptoResults = usptoResponse.data.results || [];
          } else {
            nextWarnings.push(`USPTO DB: ${getErrorMessage(usptoResponse, `Server error (${usptoResponse.status})`)}`);
          }
        } else {
          setResolvedChemical(null);
        }

        setGlobalResults(nextGlobalResults);
        setUsptoResults(nextUsptoResults);
        setWarnings(nextWarnings);

        const hasAnyResults =
          (patentResponse.data?.results?.length ?? 0) > 0 ||
          nextGlobalResults.length > 0 ||
          nextUsptoResults.length > 0;

        if (!hasAnyResults && nextWarnings.length > 0) {
          setError('특허 검색 중 일부 소스 연결에 실패했습니다. 백엔드 상태를 확인해 주세요.');
        }
      } catch (err) {
        console.error(err);
        setError('A patent search error occurred. Please check the backend connection status.');
        setResults([]);
        setGlobalResults([]);
        setUsptoResults([]);
        setResolvedChemical(null);
        setWarnings([]);
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
    globalResults,
    usptoResults,
    resolvedChemical,
    warnings,
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
