'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import Navbar from '@/components/Navbar';
import DetailSidebar from '@/components/DetailSidebar';
import SectionViewer from '@/components/SectionViewer';

// Dynamic imports for tab-based components (only loaded when tab is active)
const PatentViewer = dynamic(() => import('@/components/PatentViewer'));
const MarketNewsSection = dynamic(() => import('@/components/MarketNewsSection'));
const AIAnalysisSection = dynamic(() => import('@/components/AIAnalysisSection'));
const AIAssistantPanel = dynamic(() => import('@/components/AIAssistantPanel'));
const BilingualSafetyPanel = dynamic(() => import('@/components/BilingualSafetyPanel'));
const RegulationStatusPanel = dynamic(() => import('@/components/RegulationStatusPanel'));
const DrugInfoPanel = dynamic(() => import('./components/DrugInfoPanel'));
const GuideRecommendationsPanel = dynamic(() => import('./components/GuideRecommendationsPanel'));
const KoreanRegulationPanel = dynamic(() => import('./components/KoreanRegulationPanel'));

import { useCallback } from 'react';

import ChemicalHeaderTabs from './components/ChemicalHeaderTabs';
import EnglishSafetyCard from './components/EnglishSafetyCard';
import MarketTabToolbar from './components/MarketTabToolbar';
import { useChemicalDetail } from './useChemicalDetail';

export default function ChemicalDetail() {
  const params = useParams();
  const chemIdParam = String(params.id || '');
  const {
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
  } = useChemicalDetail({ chemIdParam });

  const scrollToSection = (seq: number) => {
    setActiveSection(seq);
    const element = document.getElementById(`section-${seq}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (!data) return;
    const { exportChemicalPdf } = await import('@/lib/pdf-report');
    await exportChemicalPdf({
      chemId: chemIdParam,
      chemicalName,
      sections: data.sections,
      english_safety: data.english_safety,
      meta: {
        chem_id: data.chem_id,
        name: data.name,
        name_en: data.name_en,
        cas_no: data.cas_no,
        source: data.source,
        is_kosha: data.is_kosha,
      },
    });
  }, [data, chemIdParam, chemicalName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="skeleton h-4 w-32 rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="hidden lg:block space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-9 rounded-lg" />
              ))}
            </div>
            <div className="col-span-1 lg:col-span-3 space-y-6">
              <div className="bg-white p-8 rounded-2xl border border-gray-100">
                <div className="skeleton h-7 w-64 rounded mb-4" />
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-8 w-20 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-3">
                <div className="skeleton h-5 w-48 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-3">
                <div className="skeleton h-5 w-40 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-2/3 rounded" />
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">Loading chemical data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center">Chemical not found</div>;
  }

  const englishSafety = data.english_safety;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {activeTab === 'msds' && data.is_kosha !== false && (
            <DetailSidebar sections={data.sections} activeSection={activeSection} onSectionClick={scrollToSection} />
          )}

          <div className={activeTab === 'msds' && data.is_kosha !== false ? 'col-span-1 lg:col-span-3 space-y-8' : 'col-span-4 space-y-8'}>
            <ChemicalHeaderTabs
              chemId={chemIdParam}
              chemicalName={chemicalName}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isKosha={data.is_kosha !== false}
              casNo={data.cas_no}
              source={data.source}
              onExportPdf={handleExportPdf}
            />

            {activeTab === 'msds' ? (
              <>
                {englishSafety && <EnglishSafetyCard safety={englishSafety} />}

                <RegulationStatusPanel sections={data.sections || []} />

                {(!data.sections || data.sections.length === 0) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                    <p className="text-amber-800 font-medium">MSDS section data is not yet cached</p>
                    <p className="text-amber-600 text-sm mt-1">If KOSHA API server is unreachable, only English safety data will be displayed</p>
                  </div>
                )}

                {data.sections?.map((section) => (
                  <SectionViewer key={section.section_seq} section={section} />
                ))}
              </>
            ) : activeTab === 'bilingual' ? (
              <BilingualSafetyPanel sections={data.sections || []} englishSafety={englishSafety} />
            ) : activeTab === 'patents' ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
                <PatentViewer query={chemicalName} chemId={data.chem_id} />
              </div>
            ) : activeTab === 'market' ? (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
                <MarketTabToolbar
                  marketKeyword={marketKeyword}
                  chemicalName={chemicalName}
                  pinnedKeyword={pinnedMarketKeyword}
                  onUnpin={clearPinnedKeyword}
                />
                <MarketNewsSection keyword={marketKeyword || chemicalName} />
              </div>
            ) : activeTab === 'guides' ? (
              <GuideRecommendationsPanel
                loading={guidesLoading}
                error={guidesError}
                recommendations={guideRecommendations}
              />
            ) : activeTab === 'drugs' ? (
              <DrugInfoPanel chemId={data.chem_id} chemicalName={chemicalName} />
            ) : activeTab === 'regulation' ? (
              <KoreanRegulationPanel chemId={data.chem_id} chemicalName={chemicalName} />
            ) : (
              <AIAnalysisSection
                chemId={data.chem_id}
                chemicalName={chemicalName}
                onSelectMarketKeyword={(term) => setMarketKeyword(term)}
                onOpenMarketTab={() => setActiveTab('market')}
                pinnedMarketKeyword={pinnedMarketKeyword}
                onPinMarketKeyword={savePinnedKeyword}
              />
            )}
          </div>
        </div>
      </div>
      <AIAssistantPanel chemId={chemIdParam} chemicalName={chemicalName} />
    </div>
  );
}
