import { BookOpen, Globe2, ShieldCheck, Sparkles } from 'lucide-react';

import type { DrugTab, DrugSearchResult, OpenFDAResponse, PubMedResponse } from '../types';

interface DrugsTabsProps {
  tab: DrugTab;
  result: DrugSearchResult;
  openFdaResult: OpenFDAResponse | null;
  pubMedResult: PubMedResponse | null;
  onChange: (tab: DrugTab) => void;
}

export default function DrugsTabs({ tab, result, openFdaResult, pubMedResult, onChange }: DrugsTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <button
        onClick={() => onChange('easy')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          tab === 'easy'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        Easy Info ({result.easyInfo.total})
      </button>
      <button
        onClick={() => onChange('approval')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          tab === 'approval'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        Approval Info ({result.approval.total})
      </button>
      <button
        onClick={() => onChange('openfda')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          tab === 'openfda'
            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Globe2 className="w-4 h-4" />
        OpenFDA ({openFdaResult ? openFdaResult.total : '-'})
      </button>
      <button
        onClick={() => onChange('pubmed')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          tab === 'pubmed'
            ? 'bg-teal-600 text-white shadow-lg shadow-teal-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        PubMed ({pubMedResult ? pubMedResult.count : '-'})
      </button>
      <button
        onClick={() => onChange('related_patents')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          tab === 'related_patents'
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        Related Patents
      </button>
      <button
        onClick={() => onChange('related_market')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          tab === 'related_market'
            ? 'bg-amber-600 text-white shadow-lg shadow-amber-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Globe2 className="w-4 h-4" />
        Related Market/Trade
      </button>
    </div>
  );
}
