import { ExternalLink, FileSearch } from 'lucide-react';

import type { GuideRecommendation } from '../types';

interface GuideRecommendationsPanelProps {
  loading: boolean;
  error: string;
  recommendations: GuideRecommendation[];
}

export default function GuideRecommendationsPanel({ loading, error, recommendations }: GuideRecommendationsPanelProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Related KOSHA Guides</h2>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading guide recommendations...</div>
      )}

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
            <div key={guide.guide_no} className="rounded-xl border border-gray-200 p-4">
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
                    className="inline-flex items-center text-xs font-medium text-indigo-700 hover:text-indigo-900"
                  >
                    Open
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                ) : null}
              </div>

              {guide.match_terms && guide.match_terms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {guide.match_terms.slice(0, 4).map((term) => (
                    <span key={`${guide.guide_no}-${term}`} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {term}
                    </span>
                  ))}
                </div>
              )}

              {(guide.snippet || guide.text_preview) && (
                <p className="mt-2 text-xs text-gray-600 line-clamp-3">{guide.snippet || guide.text_preview}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

