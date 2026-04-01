import { AlertCircle, BookOpen, CheckCircle, FileText } from 'lucide-react';

import type { Patent } from '../types';
import { buildHighlightKeywords, getPatentSourceUrl, highlightText } from '../utils';

interface PatentCardProps {
  patent: Patent;
  idx: number;
  query: string;
}

export default function PatentCard({ patent, idx, query }: PatentCardProps) {
  const patentId = patent.patent_id || patent.applicationNumber || `patent-${idx}`;
  const title = patent.title || patent.inventionTitle || `Patent ${patentId}`;
  const highlightKeywords = buildHighlightKeywords(query, patent.matched_term);
  const sourceUrl = getPatentSourceUrl(patent, query);

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all p-6 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {patent.jurisdiction && (
            <span
              className={`px-2 py-1 text-xs font-bold rounded-md ${
                patent.jurisdiction === 'US'
                  ? 'bg-blue-100 text-blue-700'
                  : patent.jurisdiction === 'EP'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {patent.jurisdiction}
            </span>
          )}
          {patent.registerStatus && (
            <span className={`px-2 py-1 text-xs font-bold rounded-md ${patent.registerStatus === '등록' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {patent.registerStatus === '등록' ? 'Registered' : patent.registerStatus === '공개' ? 'Published' : patent.registerStatus}
            </span>
          )}
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{highlightText(title, highlightKeywords)}</h3>
        </div>
        <span className="text-xs font-mono text-gray-400 whitespace-nowrap ml-4">{patentId}</span>
      </div>

      {patent.matched_term && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
            Key Match: {highlightText(patent.matched_term, highlightKeywords)}
          </span>
        </div>
      )}

      {(patent.applicantName || patent.applicationDate) && (
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          {patent.applicantName && <span>Applicant: {patent.applicantName}</span>}
          {patent.applicationDate && <span>Filing Date: {patent.applicationDate}</span>}
        </div>
      )}

      <div className="mb-4">
        {patent.section && (
          <div className="text-sm text-gray-600 mb-2 font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Section: {patent.section}
          </div>
        )}
        {patent.snippet && (
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed font-mono text-xs">
            &quot;...{highlightText(patent.snippet, highlightKeywords)}...&quot;
          </p>
        )}
        {patent.abstract && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap">
            {highlightText(patent.abstract, highlightKeywords)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          {patent.category === 'usage' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <CheckCircle className="w-3 h-3" /> Usage
            </span>
          )}
          {patent.category === 'exclusion' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
              <AlertCircle className="w-3 h-3" /> Exclusion
            </span>
          )}
          {patent.category === 'mention' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">Mention</span>
          )}
        </div>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          View on KIPRIS <FileText className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
