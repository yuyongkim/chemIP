import type { ChemicalResolution, Patent } from '../types';
import PatentCard from './PatentCard';
import PatentPagination from './PatentPagination';
import PatentStateView from './PatentStateView';

interface PatentResultsPanelProps {
  query: string;
  loading: boolean;
  error: string | null;
  warnings: string[];
  searched: boolean;
  results: Patent[];
  globalResults: Patent[];
  usptoResults: Patent[];
  resolvedChemical: ChemicalResolution | null;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PatentResultsPanel({
  query,
  loading,
  error,
  warnings,
  searched,
  results,
  globalResults,
  usptoResults,
  resolvedChemical,
  total,
  currentPage,
  totalPages,
  onPageChange,
}: PatentResultsPanelProps) {
  const hasAnyResults = results.length > 0 || globalResults.length > 0 || usptoResults.length > 0;

  if (loading || error || (searched && !hasAnyResults)) {
    return <PatentStateView loading={loading} error={error} searched={searched} query={query} hasResults={hasAnyResults} />;
  }
  if (!hasAnyResults) return null;

  return (
    <div className="space-y-6">
      {resolvedChemical && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <span className="font-semibold">Local patent DB attached:</span>{' '}
          {resolvedChemical.name_en ? `${resolvedChemical.name_en} / ` : ''}
          {resolvedChemical.name}
          {' · '}
          <span className="font-mono">{resolvedChemical.chem_id}</span>
          {resolvedChemical.cas_no ? (
            <>
              {' · '}
              CAS <span className="font-mono">{resolvedChemical.cas_no}</span>
            </>
          ) : null}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warnings.join(' | ')}
        </div>
      )}

      {globalResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Global Patent DB ({globalResults.length})</h2>
            <span className="text-sm text-gray-500">Local index</span>
          </div>
          <div className="grid gap-6">
            {globalResults.map((patent, idx) => (
              <PatentCard key={`global-${patent.patent_id || patent.applicationNumber || idx}-${idx}`} patent={patent} idx={idx} query={query} />
            ))}
          </div>
        </section>
      )}

      {usptoResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">USPTO Local DB ({usptoResults.length})</h2>
            <span className="text-sm text-gray-500">Local index</span>
          </div>
          <div className="grid gap-6">
            {usptoResults.map((patent, idx) => (
              <PatentCard key={`uspto-${patent.patent_id || patent.applicationNumber || idx}-${idx}`} patent={patent} idx={idx} query={query} />
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">KIPRIS Live ({total})</h2>
            <span className="text-sm text-gray-500">
              Page {currentPage} / {totalPages}
            </span>
          </div>

          <div className="grid gap-6">
            {results.map((patent, idx) => (
              <PatentCard key={`kipris-${patent.patent_id || patent.applicationNumber || idx}-${idx}`} patent={patent} idx={idx} query={query} />
            ))}
          </div>

          <PatentPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </section>
      )}
    </div>
  );
}
