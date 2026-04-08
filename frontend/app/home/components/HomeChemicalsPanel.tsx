import { ArrowLeft, ArrowRight } from 'lucide-react';

import ChemicalCard from '@/components/ChemicalCard';

import type { Chemical } from '../types';

interface HomeChemicalsPanelProps {
  loading: boolean;
  query: string;
  results: Chemical[];
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function HomeChemicalsPanel({
  loading,
  query,
  results,
  total,
  currentPage,
  totalPages,
  onPageChange,
}: HomeChemicalsPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100">
            <div className="flex items-start gap-3.5">
              <div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="flex gap-1.5 mt-1">
                  <div className="skeleton h-5 w-20 rounded-md" />
                  <div className="skeleton h-5 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No chemical results found for &quot;{query}&quot;.</p>
        <p className="text-sm text-gray-500 mt-2">Try cross-checking in the Drugs tab.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900 font-mono tabular-nums">{total}</span> chemicals found
        </p>
        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">Patents and market data on detail page</span>
      </div>
      <div className="stagger-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((chem) => (
          <ChemicalCard key={chem.id} chemical={chem} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3.5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-150 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="px-3 py-2 text-sm text-gray-400 font-mono tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3.5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all duration-150 flex items-center gap-1"
          >
            Next
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
