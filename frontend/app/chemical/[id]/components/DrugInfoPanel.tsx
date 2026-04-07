'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Pill, ExternalLink, RefreshCw, BookOpen, Building2, FileText } from 'lucide-react';

import { fetchJsonSafe } from '@/lib/http';

import type { ChemicalDrugsResponse, DrugMfdsItem, DrugFdaItem, DrugPubmedArticle } from '../types';

interface DrugInfoPanelProps {
  chemId: string;
  chemicalName: string;
}

type DrugSubTab = 'mfds' | 'openfda' | 'pubmed';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function MfdsCard({ item }: { item: DrugMfdsItem }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {item.ITEM_IMAGE && (
          <Image src={item.ITEM_IMAGE} alt={item.ITEM_NAME || ''} width={64} height={64} loading="lazy" className="w-16 h-16 object-contain rounded-lg bg-gray-50 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-gray-900 truncate">{item.ITEM_NAME || 'Unnamed'}</h4>
          <p className="text-sm text-gray-500 mt-0.5">{item.ENTP_NAME || ''}</p>
          {item.efcyQesitm && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{stripHtml(item.efcyQesitm)}</p>
          )}
          {item.atpnQesitm && (
            <p className="text-xs text-amber-700 mt-1 line-clamp-1">Caution: {stripHtml(item.atpnQesitm)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FdaCard({ item }: { item: DrugFdaItem }) {
  const openfda = item.openfda || {};
  const brandName = openfda.brand_name?.[0] || '';
  const genericName = openfda.generic_name?.[0] || '';
  const manufacturer = openfda.manufacturer_name?.[0] || '';
  const indication = item.indications_and_usage?.[0] || '';

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <h4 className="text-base font-bold text-gray-900 truncate">{brandName || genericName || 'Unknown Drug'}</h4>
      </div>
      {genericName && brandName && (
        <p className="text-sm text-gray-500">{genericName}</p>
      )}
      {manufacturer && <p className="text-xs text-gray-500 mt-0.5">{manufacturer}</p>}
      {indication && (
        <p className="text-sm text-gray-700 mt-2 line-clamp-3">{stripHtml(indication)}</p>
      )}
    </div>
  );
}

function PubmedCard({ article }: { article: DrugPubmedArticle }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <BookOpen className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
          >
            {article.title}
            <ExternalLink className="w-3 h-3 inline ml-1 opacity-50" />
          </a>
          <p className="text-xs text-gray-500 mt-1">
            {article.source} &middot; {article.pubdate}
          </p>
          {article.authors.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {article.authors.slice(0, 3).join(', ')}{article.authors.length > 3 ? ' et al.' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DrugInfoPanel({ chemId, chemicalName }: DrugInfoPanelProps) {
  const [data, setData] = useState<ChemicalDrugsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<DrugSubTab>('mfds');

  const fetchDrugs = useCallback(async (refresh = false) => {
    setLoading(true);
    const url = `/api/chemicals/${encodeURIComponent(chemId)}/drugs${refresh ? '?refresh=true' : ''}`;
    const result = await fetchJsonSafe<ChemicalDrugsResponse>(url);
    if (result.ok && result.data) {
      setData(result.data);
    }
    setLoading(false);
  }, [chemId]);

  useEffect(() => {
    if (chemId) {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const url = `/api/chemicals/${encodeURIComponent(chemId)}/drugs`;
        const result = await fetchJsonSafe<ChemicalDrugsResponse>(url);
        if (!cancelled) {
          if (result.ok && result.data) {
            setData(result.data);
          }
          setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [chemId]);

  const mfdsCount = data?.mfds?.length ?? 0;
  const fdaCount = data?.openfda?.length ?? 0;
  const pubmedCount = data?.pubmed?.length ?? 0;

  const subTabs: { id: DrugSubTab; label: string; count: number; color: string }[] = [
    { id: 'mfds', label: 'MFDS', count: mfdsCount, color: 'emerald' },
    { id: 'openfda', label: 'OpenFDA', count: fdaCount, color: 'blue' },
    { id: 'pubmed', label: 'PubMed', count: pubmedCount, color: 'green' },
  ];

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Pill className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Drug Information</h2>
          <span className="text-sm text-gray-500">— {chemicalName}</span>
        </div>
        <button
          onClick={() => void fetchDrugs(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-3">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === tab.id
                ? tab.color === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : tab.color === 'blue'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                : 'text-gray-500 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              subTab === tab.id ? 'bg-white/60' : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Querying MFDS, OpenFDA, and PubMed...</p>
        </div>
      ) : (
        <>
          {subTab === 'mfds' && (
            mfdsCount > 0 ? (
              <div className="grid gap-4">
                {data!.mfds.map((item, i) => <MfdsCard key={item.ITEM_SEQ || i} item={item} />)}
              </div>
            ) : (
              <EmptyState source="MFDS" />
            )
          )}

          {subTab === 'openfda' && (
            fdaCount > 0 ? (
              <div className="grid gap-4">
                {data!.openfda.map((item, i) => <FdaCard key={item.id || i} item={item} />)}
              </div>
            ) : (
              <EmptyState source="OpenFDA" />
            )
          )}

          {subTab === 'pubmed' && (
            pubmedCount > 0 ? (
              <div className="grid gap-4">
                {data!.pubmed.map((art) => <PubmedCard key={art.pmid} article={art} />)}
              </div>
            ) : (
              <EmptyState source="PubMed" />
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ source }: { source: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <FileText className="w-12 h-12 text-gray-300 mb-3" />
      <p className="text-gray-500">No related drug results found from {source}.</p>
    </div>
  );
}
