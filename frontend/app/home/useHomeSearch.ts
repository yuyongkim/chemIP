import { useEffect, useState } from 'react';

import type { ChemSearchResult, UnifiedDrugResult, Chemical } from './types';
import { fetchJson } from './utils';

interface UseHomeSearchParams {
  query: string;
  page: number;
}

export function useHomeSearch({ query, page }: UseHomeSearchParams) {
  const [results, setResults] = useState<Chemical[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingChemicals, setLoadingChemicals] = useState(false);

  const [unifiedDrugs, setUnifiedDrugs] = useState<UnifiedDrugResult | null>(null);
  const [drugTotal, setDrugTotal] = useState(0);
  const [loadingDrugs, setLoadingDrugs] = useState(false);

  useEffect(() => {
    let canceled = false;

    const fetchData = async () => {
      if (!query) {
        setResults([]);
        setTotal(0);
        setUnifiedDrugs(null);
        setDrugTotal(0);
        return;
      }

      setLoadingChemicals(true);
      setLoadingDrugs(true);

      const [chemicalsRes, drugsRes] = await Promise.allSettled([
        fetchJson<ChemSearchResult>(`/api/chemicals?q=${encodeURIComponent(query)}&page=${page}&limit=24`),
        fetchJson<UnifiedDrugResult>(`/api/drugs/unified?q=${encodeURIComponent(query)}&limit=20`),
      ]);

      if (canceled) {
        return;
      }

      if (chemicalsRes.status === 'fulfilled') {
        setResults(Array.isArray(chemicalsRes.value.items) ? chemicalsRes.value.items : []);
        setTotal(chemicalsRes.value.total || 0);
      } else {
        setResults([]);
        setTotal(0);
      }
      setLoadingChemicals(false);

      if (drugsRes.status === 'fulfilled') {
        const ud = drugsRes.value;
        setUnifiedDrugs(ud);
        const mfdsTotal = ud.mfds?.total ?? 0;
        const fdaTotal = ud.openfda?.total ?? 0;
        const pmTotal = ud.pubmed?.count ?? 0;
        setDrugTotal(mfdsTotal + fdaTotal + pmTotal);
      } else {
        setUnifiedDrugs(null);
        setDrugTotal(0);
      }
      setLoadingDrugs(false);
    };

    void fetchData();

    return () => {
      canceled = true;
    };
  }, [page, query]);

  return {
    results,
    total,
    loadingChemicals,
    unifiedDrugs,
    drugTotal,
    loadingDrugs,
  };
}
