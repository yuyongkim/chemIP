import Link from 'next/link';

import GhsStatementList from '@/components/GhsStatementList';

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
        <GhsStatementList title="Hazard Statements" lines={safety.hazard_statements} />
      )}
      {safety.precautionary_statements.length > 0 && (
        <GhsStatementList title="Precautionary Statements" lines={safety.precautionary_statements} />
      )}
      <p className="mt-3 text-xs text-gray-500">
        출처: PubChem GHS Classification (ECHA C&amp;L 신고 등 제출기관별 집계) ·{' '}
        <Link href="/ghs" className="text-blue-700 hover:underline">GHS 코드 사전</Link>
      </p>
    </div>
  );
}
