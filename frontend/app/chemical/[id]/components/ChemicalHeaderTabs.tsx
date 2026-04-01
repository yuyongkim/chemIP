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
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-3xl font-bold text-gray-900">{chemicalName}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/chemical/${chemId}/bilingual`}
            className="inline-flex items-center px-4 py-2 border border-blue-200 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            Bilingual Page
          </Link>
          <button
            onClick={() => onTabChange('patents')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Related Patents
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-gray-200">
        {[
          ['msds', 'MSDS Data'],
          ['bilingual', 'Bilingual Safety'],
          ['patents', 'Patents'],
          ['market', 'Trade & Market'],
          ['guides', 'Safety Guides'],
          ['drugs', 'Drugs'],
          ['regulation', 'KR Regulation'],
          ['ai', 'AI Analysis'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => onTabChange(id as ChemicalDetailTab)}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative whitespace-nowrap border-b-2 ${
              activeTab === id
                ? id === 'ai'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-blue-600 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
