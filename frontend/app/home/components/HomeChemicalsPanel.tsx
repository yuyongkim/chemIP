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
      <div className="text-center py-16">
        <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No chemical results found for &quot;{query}&quot;.</p>
        <p className="text-sm text-gray-400 mt-2">Try cross-checking in the Drugs tab.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{total}</span> chemicals found
        </p>
        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">Related patents/market tabs available on detail page</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((chem) => (
          <ChemicalCard key={chem.id} chemical={chem} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-900 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-900 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 transition-colors flex items-center gap-1"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
