'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Navbar from '@/components/Navbar';

import HomeHero from './home/components/HomeHero';
import HomeLandingPanels from './home/components/HomeLandingPanels';
import HomeSearchTabs from './home/components/HomeSearchTabs';
import HomeChemicalsPanel from './home/components/HomeChemicalsPanel';
import HomeDrugsPanel from './home/components/HomeDrugsPanel';
import { useHomeSearch } from './home/useHomeSearch';
import type { HomeTab } from './home/types';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [activeTab, setActiveTab] = useState<HomeTab>('chemicals');
  const hasSearched = Boolean(initialQuery);

  const { results, total, loadingChemicals, unifiedDrugs, drugTotal, loadingDrugs } = useHomeSearch({
    query: initialQuery,
    page: initialPage,
  });

  const totalPages = Math.ceil(total / 12);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      router.push('/');
      return;
    }
    setActiveTab('chemicals');
    router.push(`/?q=${encodeURIComponent(query)}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/?q=${encodeURIComponent(initialQuery)}&page=${newPage}`);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <HomeHero initialQuery={initialQuery} onSearch={handleSearch} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!hasSearched && <HomeLandingPanels />}

        {hasSearched && (
          <div>
            <HomeSearchTabs activeTab={activeTab} total={total} drugTotal={drugTotal} onChange={setActiveTab} />

            {activeTab === 'chemicals' && (
              <HomeChemicalsPanel
                loading={loadingChemicals}
                query={initialQuery}
                results={results}
                total={total}
                currentPage={initialPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}

            {activeTab === 'drugs' && (
              <HomeDrugsPanel loading={loadingDrugs} query={initialQuery} unified={unifiedDrugs} total={drugTotal} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
