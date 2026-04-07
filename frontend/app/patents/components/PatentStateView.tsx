import { AlertCircle, Search } from 'lucide-react';

interface PatentStateViewProps {
  loading: boolean;
  error: string | null;
  searched: boolean;
  query: string;
  hasResults: boolean;
}

export default function PatentStateView({ loading, error, searched, query, hasResults }: PatentStateViewProps) {
  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Searching KIPRIS patents...</p>
        <p className="text-sm text-gray-500 mt-1">Querying patent databases across jurisdictions</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Failed</h3>
        <p className="text-gray-500 mb-4">{error}</p>
      </div>
    );
  }

  if (searched && !hasResults) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-4">
          No patent documents found for &quot;{query}&quot;.
        </p>
        <div className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-200 inline-block text-left">
          <p className="font-semibold mb-1">Troubleshooting:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Please check the spelling of your search term.</li>
            <li>The KIPRIS server may not be responding.</li>
            <li>Global Patent DB indexing may not be complete yet.</li>
          </ul>
        </div>
      </div>
    );
  }

  return null;
}
