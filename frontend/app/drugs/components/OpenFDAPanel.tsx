import type { OpenFDAResponse } from '../types';
import { firstLine } from '../utils';

interface OpenFDAPanelProps {
  panelLoading: boolean;
  result: OpenFDAResponse | null;
}

export default function OpenFDAPanel({ panelLoading, result }: OpenFDAPanelProps) {
  if (panelLoading && !result) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <div className="inline-block w-6 h-6 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-500">Querying OpenFDA...</p>
      </div>
    );
  }

  if (!result || result.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No OpenFDA results found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {result.items.map((item, idx) => (
        <div key={`openfda-${idx}`} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">
            {(item.openfda?.brand_name && item.openfda.brand_name[0]) || 'Unknown brand'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Generic: {(item.openfda?.generic_name && item.openfda.generic_name[0]) || '-'}
          </p>
          <p className="text-sm text-gray-500">
            Manufacturer: {(item.openfda?.manufacturer_name && item.openfda.manufacturer_name[0]) || '-'}
          </p>
          {firstLine(item.indications_and_usage) && (
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">{firstLine(item.indications_and_usage)}</p>
          )}
          {firstLine(item.warnings) && (
            <div className="bg-red-50 rounded-xl p-4 mt-3">
              <p className="text-sm text-red-700 leading-relaxed">{firstLine(item.warnings)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
