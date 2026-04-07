'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
const PatentViewer = dynamic(() => import('@/components/PatentViewer'));
const MarketNewsSection = dynamic(() => import('@/components/MarketNewsSection'));

import DrugsHero from './components/DrugsHero';
import DrugsInitialState from './components/DrugsInitialState';
import DrugsTabs from './components/DrugsTabs';
const EasyInfoPanel = dynamic(() => import('./components/EasyInfoPanel'));
const ApprovalPanel = dynamic(() => import('./components/ApprovalPanel'));
const OpenFDAPanel = dynamic(() => import('./components/OpenFDAPanel'));
const PubMedPanel = dynamic(() => import('./components/PubMedPanel'));
import { useDrugSearch } from './useDrugSearch';

export default function DrugsPage() {
  const {
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
  } = useDrugSearch();

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <DrugsHero initialQuery={initialQuery} onSearch={handleSearch} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Searching...</p>
          </div>
        )}

        {result && !loading && (
          <>
            <DrugsTabs tab={tab} result={result} openFdaResult={openFdaResult} pubMedResult={pubMedResult} onChange={setTab} />

            {tab === 'easy' && (
              <EasyInfoPanel
                items={result.easyInfo.items}
                expanded={expanded}
                onToggle={(idx) => setExpanded(expanded === idx ? null : idx)}
              />
            )}

            {tab === 'approval' && <ApprovalPanel items={result.approval.items} />}

            {tab === 'openfda' && <OpenFDAPanel panelLoading={panelLoading === 'openfda'} result={openFdaResult} />}

            {tab === 'pubmed' && <PubMedPanel panelLoading={panelLoading === 'pubmed'} result={pubMedResult} />}

            {tab === 'related_patents' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
                <PatentViewer query={result.query} />
              </div>
            )}

            {tab === 'related_market' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
                <MarketNewsSection keyword={result.query} />
              </div>
            )}
          </>
        )}

        {!result && !loading && <DrugsInitialState onQuickSearch={handleSearch} />}
      </div>
    </main>
  );
}
