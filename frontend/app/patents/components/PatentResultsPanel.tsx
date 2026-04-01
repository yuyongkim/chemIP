import type { Patent } from '../types';
import PatentCard from './PatentCard';
import PatentPagination from './PatentPagination';
import PatentStateView from './PatentStateView';

interface PatentResultsPanelProps {
  query: string;
  loading: boolean;
  error: string | null;
  searched: boolean;
  results: Patent[];
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PatentResultsPanel({
  query,
  loading,
  error,
  searched,
  results,
  total,
  currentPage,
  totalPages,
  onPageChange,
}: PatentResultsPanelProps) {
  if (loading || error || (searched && results.length === 0)) {
    return <PatentStateView loading={loading} error={error} searched={searched} query={query} hasResults={results.length > 0} />;
  }
  if (results.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Search Results ({total})</h2>
        <span className="text-sm text-gray-500">
          Page {currentPage} / {totalPages}
        </span>
      </div>

      <div className="grid gap-6">
        {results.map((patent, idx) => (
          <PatentCard key={`${patent.patent_id || patent.applicationNumber || idx}-${idx}`} patent={patent} idx={idx} query={query} />
        ))}
      </div>

      <PatentPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
