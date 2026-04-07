import Link from 'next/link';
import { ArrowUpRight, Building2, BookOpen, ExternalLink } from 'lucide-react';

import type { UnifiedDrugResult, FdaItem, PubmedArticle } from '../types';
import { stripHtml } from '../utils';

interface HomeDrugsPanelProps {
  loading: boolean;
  query: string;
  unified: UnifiedDrugResult | null;
  total: number;
}

export default function HomeDrugsPanel({ loading, query, unified, total }: HomeDrugsPanelProps) {
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-3">Searching MFDS + OpenFDA + PubMed...</p>
      </div>
    );
  }

  if (!unified || total === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No drug results found for &quot;{query}&quot;.</p>
        <Link href="/drugs" className="text-sm text-emerald-600 hover:underline mt-2 inline-block">
          Search again on the Drugs page
        </Link>
      </div>
    );
  }

  const mfdsItems = unified.mfds?.items ?? [];
  const fdaItems = unified.openfda?.items ?? [];
  const pubmedArticles = unified.pubmed?.articles ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{total}</span> drug results
          <span className="text-xs text-gray-500 ml-2">(MFDS {mfdsItems.length} · FDA {fdaItems.length} · PubMed {pubmedArticles.length})</span>
        </p>
        <Link href="/drugs" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
          Go to Drugs page
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* MFDS Section */}
      {mfdsItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            MFDS (Korea FDA)
          </h3>
          <div className="space-y-3">
            {mfdsItems.map((item, idx) => (
              <div key={`mfds-${idx}`} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-base font-bold text-gray-900">{item.itemName}</h4>
                <p className="text-sm text-gray-500">{item.entpName}</p>
                {item.efcyQesitm && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{stripHtml(item.efcyQesitm)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OpenFDA Section */}
      {fdaItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            OpenFDA
          </h3>
          <div className="space-y-3">
            {fdaItems.map((item: FdaItem, idx: number) => {
              const brand = item.openfda?.brand_name?.[0] || '';
              const generic = item.openfda?.generic_name?.[0] || '';
              const mfr = item.openfda?.manufacturer_name?.[0] || '';
              const indication = item.indications_and_usage?.[0] || '';
              return (
                <div key={`fda-${idx}`} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <h4 className="text-base font-bold text-gray-900">{brand || generic || 'Unknown'}</h4>
                  </div>
                  {mfr && <p className="text-xs text-gray-500 mt-0.5">{mfr}</p>}
                  {indication && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{stripHtml(indication)}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PubMed Section */}
      {pubmedArticles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            PubMed
          </h3>
          <div className="space-y-3">
            {pubmedArticles.map((art: PubmedArticle) => (
              <div key={art.pmid} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
                    >
                      {art.title}
                      <ExternalLink className="w-3 h-3 inline ml-1 opacity-40" />
                    </a>
                    <p className="text-xs text-gray-500 mt-1">{art.source} &middot; {art.pubdate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
