'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FileSearch, Loader2 } from 'lucide-react';

import type { GuideRecommendation } from '../types';
import { fetchJsonSafe } from '@/lib/http';

interface GuideRecommendationsPanelProps {
  loading: boolean;
  error: string;
  recommendations: GuideRecommendation[];
}

interface GuideDetail {
  text?: string;
  char_count?: number;
  page_count?: number;
}

function GuideCard({ guide }: { guide: GuideRecommendation }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState('');

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (text === null && !loadingText) {
      setLoadingText(true);
      setTextError('');
      const result = await fetchJsonSafe<GuideDetail>(
        `/api/guides/${encodeURIComponent(guide.guide_no)}?include_text=true`,
      );
      if (result.ok && result.data?.text) {
        setText(result.data.text);
      } else {
        setTextError('본문을 불러오지 못했습니다.');
      }
      setLoadingText(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 break-words">
            {guide.title || guide.guide_no}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {guide.guide_no}
            {guide.ofanc_ymd ? ` • ${guide.ofanc_ymd}` : ''}
            {typeof guide.score === 'number' ? ` • score ${guide.score}` : ''}
          </div>
        </div>
        {guide.file_download_url ? (
          <a
            href={guide.file_download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium text-indigo-700 hover:text-indigo-900 shrink-0"
          >
            원문 PDF
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        ) : null}
      </div>

      {guide.match_terms && guide.match_terms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {guide.match_terms.slice(0, 4).map((term) => (
            <span
              key={`${guide.guide_no}-${term}`}
              className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              {term}
            </span>
          ))}
        </div>
      )}

      {!open && (guide.snippet || guide.text_preview) && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-3">{guide.snippet || guide.text_preview}</p>
      )}

      <button
        type="button"
        onClick={toggle}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900"
      >
        {open ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" /> 본문 접기
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" /> 본문 보기
          </>
        )}
      </button>

      {open && (
        <div className="mt-2">
          {loadingText && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 본문 불러오는 중…
            </div>
          )}
          {textError && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {textError}
            </div>
          )}
          {text && (
            <div className="max-h-[28rem] overflow-y-auto rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
              {text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuideRecommendationsPanel({ loading, error, recommendations }: GuideRecommendationsPanelProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Related KOSHA Guides</h2>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading guide recommendations...</div>}

      {!loading && error && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="text-sm text-gray-500">No related guide recommendation available for this chemical yet.</div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((guide) => (
            <GuideCard key={guide.guide_no} guide={guide} />
          ))}
        </div>
      )}
    </div>
  );
}
