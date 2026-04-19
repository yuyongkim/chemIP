import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';

import type { ChemicalDetailTab } from '../types';

interface ChemicalHeaderTabsProps {
  chemId: string;
  chemicalName: string;
  activeTab: ChemicalDetailTab;
  onTabChange: (tab: ChemicalDetailTab) => void;
  isKosha?: boolean;
  casNo?: string;
  source?: string;
  onExportPdf?: () => Promise<void>;
}

export default function ChemicalHeaderTabs({ chemId, chemicalName, activeTab, onTabChange, isKosha = true, casNo, source, onExportPdf }: ChemicalHeaderTabsProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!onExportPdf || exporting) return;
    setExporting(true);
    try {
      await onExportPdf();
    } finally {
      setExporting(false);
    }
  };

  const allTabs: [string, string][] = [
    ['msds', 'MSDS data'],
    ['bilingual', 'Bilingual safety'],
    ['patents', 'Patents'],
    ['market', 'Trade & market'],
    ['guides', 'Safety guides'],
    ['drugs', 'Drugs'],
    ['regulation', 'Regulatory intel'],
    ['ai', 'AI analysis'],
  ];

  // Non-KOSHA chemicals have no MSDS sections — hide that tab
  const tabs = isKosha ? allTabs : allTabs.filter(([id]) => id !== 'msds');

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{chemicalName}</h1>
          {(casNo || source) && (
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              {casNo && <span>CAS {casNo}</span>}
              {source && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  source === 'KOSHA' ? 'bg-blue-50 text-blue-700' :
                  source === 'NCIS' ? 'bg-emerald-50 text-emerald-700' :
                  source === 'PubChem' ? 'bg-purple-50 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {source}
                </span>
              )}
            </div>
          )}
        </div>
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
          {onExportPdf && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-wait transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Generating...' : 'PDF Report'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-100 -mx-8 px-8 overflow-x-auto">
        {tabs.map(([id, label]) => (
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
