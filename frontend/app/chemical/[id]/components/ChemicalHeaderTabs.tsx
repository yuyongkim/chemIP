import Link from 'next/link';

import type { ChemicalDetailTab } from '../types';

interface ChemicalHeaderTabsProps {
  chemId: string;
  chemicalName: string;
  activeTab: ChemicalDetailTab;
  onTabChange: (tab: ChemicalDetailTab) => void;
}

export default function ChemicalHeaderTabs({ chemId, chemicalName, activeTab, onTabChange }: ChemicalHeaderTabsProps) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100">
      <div className="flex justify-between items-start mb-5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{chemicalName}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/chemical/${chemId}/bilingual`}
            className="inline-flex items-center px-3.5 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
          >
            Bilingual page
          </Link>
          <button
            onClick={() => onTabChange('patents')}
            className="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-lg text-white bg-[#1e3a5f] hover:bg-[#172554] active:scale-[0.98] transition-all duration-150"
          >
            View patents
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100 -mx-8 px-8 overflow-x-auto">
        {[
          ['msds', 'MSDS data'],
          ['bilingual', 'Bilingual safety'],
          ['patents', 'Patents'],
          ['market', 'Trade & market'],
          ['guides', 'Safety guides'],
          ['drugs', 'Drugs'],
          ['regulation', 'KR regulation'],
          ['ai', 'AI analysis'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => onTabChange(id as ChemicalDetailTab)}
            className={`pb-3 px-3 text-sm font-medium transition-colors duration-150 relative whitespace-nowrap border-b-2 ${
              activeTab === id
                ? 'text-[#1e3a5f] border-[#1e3a5f]'
                : 'text-gray-400 hover:text-gray-600 border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
