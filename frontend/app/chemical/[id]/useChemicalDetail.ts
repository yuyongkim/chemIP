import { useEffect, useMemo, useState } from 'react';

import { fetchJsonSafe } from '@/lib/http';

import type { ChemicalDetailData, ChemicalDetailTab, GuideRecommendation } from './types';

interface UseChemicalDetailParams {
  chemIdParam: string;
}

export function useChemicalDetail({ chemIdParam }: UseChemicalDetailParams) {
  const [data, setData] = useState<ChemicalDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [guidesError, setGuidesError] = useState('');
  const [guideRecommendations, setGuideRecommendations] = useState<GuideRecommendation[]>([]);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [marketKeyword, setMarketKeyword] = useState<string>('');
  const [pinnedMarketKeyword, setPinnedMarketKeyword] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ChemicalDetailTab>('msds');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await fetchJsonSafe<ChemicalDetailData>(`/api/chemicals/${chemIdParam}`);
        if (result.ok && result.data) {
          setData(result.data);
        } else {
          setData(null);
          console.error('Failed to fetch details', result.errorText || `HTTP ${result.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch details', error);
      } finally {
        setLoading(false);
      }
    };

    if (chemIdParam) {
      void fetchDetails();
    }
  }, [chemIdParam]);

  useEffect(() => {
    const fetchGuideRecommendations = async () => {
      if (!chemIdParam) return;
      setGuidesLoading(true);
      setGuidesError('');
      try {
        const result = await fetchJsonSafe<{ recommendations?: GuideRecommendation[] }>(
          `/api/guides/recommend/${encodeURIComponent(chemIdParam)}?limit=8`,
        );
        if (result.ok && result.data) {
          setGuideRecommendations(Array.isArray(result.data.recommendations) ? result.data.recommendations : []);
        } else {
          setGuideRecommendations([]);
          if (result.status !== 503 && result.status !== 404) {
            setGuidesError(result.errorText || `HTTP ${result.status}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch guide recommendations', error);
        setGuideRecommendations([]);
        setGuidesError('Failed to load guide recommendations');
      } finally {
        setGuidesLoading(false);
      }
    };

    void fetchGuideRecommendations();
  }, [chemIdParam]);

  useEffect(() => {
    if (!chemIdParam) return;
    try {
      const key = `marketKeyword:${chemIdParam}`;
      const saved = localStorage.getItem(key) || '';
      if (saved) {
        setPinnedMarketKeyword(saved);
        setMarketKeyword(saved);
      } else {
        setPinnedMarketKeyword('');
      }
    } catch {
      // no-op for environments where localStorage is unavailable
    }
  }, [chemIdParam]);

  const chemicalName = useMemo(() => {
    if (!data) return 'Chemical';
    const section1 = data.sections?.find((s) => s.section_seq === 1);
    if (!section1) return 'Chemical';

    for (const item of section1.content) {
      if ('itemDetail' in item && item.itemDetail) {
        // Strip HTML tags (e.g. <br/>) from chemical names
        return item.itemDetail.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
      }
    }

    return 'Chemical';
  }, [data]);

  const savePinnedKeyword = (term: string) => {
    setPinnedMarketKeyword(term);
    setMarketKeyword(term);
    try {
      localStorage.setItem(`marketKeyword:${chemIdParam}`, term);
    } catch {
      // ignore
    }
  };

  const clearPinnedKeyword = () => {
    setPinnedMarketKeyword('');
    try {
      localStorage.removeItem(`marketKeyword:${chemIdParam}`);
    } catch {
      // ignore
    }
  };

  return {
    data,
    loading,
    guidesLoading,
    guidesError,
    guideRecommendations,
    activeSection,
    setActiveSection,
    marketKeyword,
    setMarketKeyword,
    pinnedMarketKeyword,
    activeTab,
    setActiveTab,
    chemicalName,
    savePinnedKeyword,
    clearPinnedKeyword,
  };
}
