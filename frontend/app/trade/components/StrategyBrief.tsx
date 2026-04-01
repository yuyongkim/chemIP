import { Sparkles } from 'lucide-react';

interface StrategyBriefData {
  headline: string;
  marketView: string;
  actionItems: string[];
  riskItems: string[];
}

interface StrategyBriefProps {
  brief: StrategyBriefData | null;
  lastUpdated: string;
  documentCount: number;
  country: string;
}

export default function StrategyBrief({ brief, lastUpdated, documentCount, country }: StrategyBriefProps) {
  if (!brief) return null;

  return (
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-emerald-900 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Executive Summary
        </h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-white text-emerald-800">Updated: {lastUpdated}</span>
          <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-white text-emerald-800">Documents: {documentCount}</span>
          <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-white text-emerald-800">Country: {country || 'All Countries'}</span>
        </div>
      </div>
      <p className="text-base font-bold text-gray-900 mb-1">{brief.headline}</p>
      <p className="text-sm text-gray-700 mb-4">{brief.marketView}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="text-xs font-semibold text-emerald-800 mb-2">Priority Action Items</p>
          <div className="space-y-2">
            {brief.actionItems.map((line, idx) => (
              <div key={line} className="text-sm text-gray-800 flex items-start gap-2">
                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[11px] ${idx === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  {idx === 0 ? 'High' : 'Medium'}
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="text-xs font-semibold text-emerald-800 mb-2">Key Risks</p>
          <div className="space-y-2">
            {brief.riskItems.map((line, idx) => (
              <div key={line} className="text-sm text-gray-800 flex items-start gap-2">
                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[11px] ${idx === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  {idx === 0 ? 'High' : 'Medium'}
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
