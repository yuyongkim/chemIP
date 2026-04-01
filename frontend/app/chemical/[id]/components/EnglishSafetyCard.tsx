import type { EnglishSafety } from '../types';

interface EnglishSafetyCardProps {
  safety: EnglishSafety;
}

export default function EnglishSafetyCard({ safety }: EnglishSafetyCardProps) {
  return (
    <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 text-gray-900">
      <h2 className="text-lg font-bold text-blue-900 mb-4">PubChem Safety Data (English)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="font-semibold text-blue-900">Signal Word:</span> <span className="font-medium text-gray-900">{safety.signal_word || 'N/A'}</span>
        </div>
        <div>
          <span className="font-semibold text-blue-900">CAS:</span> <span className="font-medium text-gray-900">{safety.cas_no || 'N/A'}</span>
        </div>
        <div>
          <span className="font-semibold text-blue-900">Name (EN):</span> <span className="font-medium text-gray-900">{safety.name_en || 'N/A'}</span>
        </div>
        <div>
          <span className="font-semibold text-blue-900">PubChem CID:</span> <span className="font-medium text-gray-900">{safety.pubchem_cid ?? 'N/A'}</span>
        </div>
      </div>
      {safety.hazard_statements.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Hazard Statements ({safety.hazard_statements.length})</h3>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 max-h-64 overflow-auto bg-white rounded-lg p-3 border border-blue-100">
            {safety.hazard_statements.map((line, idx) => (
              <li key={`hz-${idx}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {safety.precautionary_statements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Precautionary Statements ({safety.precautionary_statements.length})</h3>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 max-h-64 overflow-auto bg-white rounded-lg p-3 border border-blue-100">
            {safety.precautionary_statements.map((line, idx) => (
              <li key={`pc-${idx}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
