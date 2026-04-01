import { BarChart3, CheckCircle2, ExternalLink, FileText } from 'lucide-react';

import type { StrategyItem, StrategyPanel } from '../types';
import { resolveStrategyUrl } from '../utils';

interface StrategyChecklistItem {
  level: string;
  text: string;
}

interface StrategyResultsProps {
  strategyLatestYear: number | null;
  strategyRecentCount: number;
  strategyCountryStats: Array<[string, number]>;
  strategyThemeStats: Array<[string, number]>;
  strategyYearStats: Array<[number, number]>;
  strategyPanel: StrategyPanel;
  onStrategyPanelChange: (panel: StrategyPanel) => void;
  strategyChecklist: StrategyChecklistItem[];
  strategyDocPreview: StrategyItem[];
  strategyDataCount: number;
  showAllStrategyDocs: boolean;
  onToggleShowAllDocs: () => void;
  onSelectCoverageCountry: (country: string) => void;
}

export default function StrategyResults({
  strategyLatestYear,
  strategyRecentCount,
  strategyCountryStats,
  strategyThemeStats,
  strategyYearStats,
  strategyPanel,
  onStrategyPanelChange,
  strategyChecklist,
  strategyDocPreview,
  strategyDataCount,
  showAllStrategyDocs,
  onToggleShowAllDocs,
  onSelectCoverageCountry,
}: StrategyResultsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">Latest Strategy Year</div>
          <div className="text-2xl font-bold text-gray-900">{strategyLatestYear || '-'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">Recent 3-Year Strategy Count</div>
          <div className="text-2xl font-bold text-gray-900">{strategyRecentCount}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs text-gray-500 mb-1">Strategy Coverage Countries</div>
          <div className="text-2xl font-bold text-gray-900">{strategyCountryStats.length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => onStrategyPanelChange('checklist')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              strategyPanel === 'checklist'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Action Checklist
          </button>
          <button
            type="button"
            onClick={() => onStrategyPanelChange('coverage')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              strategyPanel === 'coverage'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Country Coverage
          </button>
          <button
            type="button"
            onClick={() => onStrategyPanelChange('documents')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              strategyPanel === 'documents'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            Source Documents
          </button>
        </div>

        {strategyPanel === 'checklist' && (
          <div className="space-y-2">
            {strategyChecklist.map((item) => (
              <div key={item.text} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] ${
                    item.level === '높음' || item.level === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {item.level === '높음' ? 'High' : item.level === '중간' ? 'Medium' : item.level}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {strategyPanel === 'coverage' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Strategy Coverage by Country
              </h3>
              <div className="flex flex-wrap gap-2">
                {strategyCountryStats.map(([name, count]) => (
                  <button
                    type="button"
                    key={`${name}-${count}`}
                    onClick={() => onSelectCoverageCountry(name === 'Global' ? '' : name)}
                    className="px-2.5 py-1 rounded-full text-xs border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  >
                    {name} {count}
                  </button>
                ))}
              </div>
            </div>

            {strategyThemeStats.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Key Themes</p>
                <div className="flex flex-wrap gap-2">
                  {strategyThemeStats.map(([name, count]) => (
                    <span key={`${name}-${count}`} className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-gray-700">
                      {name} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {strategyYearStats.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Strategies by Year</p>
                <div className="flex flex-wrap gap-2">
                  {strategyYearStats.map(([year, count]) => (
                    <span key={`${year}-${count}`} className="px-2.5 py-1 rounded-full text-xs bg-gray-50 border border-gray-200 text-gray-700">
                      {year}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {strategyPanel === 'documents' && (
          <div className="space-y-3">
            {strategyDocPreview.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 mb-1 inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-500" />
                      {item.title}
                    </h3>
                    {item.summary && <p className="text-sm text-gray-700 line-clamp-2">{item.summary}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-gray-500 shrink-0">
                    {item.country && (
                      <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                        {item.country}
                      </span>
                    )}
                    {item.date && <span>{item.date}</span>}
                    <a href={resolveStrategyUrl(item)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900">
                      Source
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {strategyDataCount > 5 && (
              <button
                type="button"
                onClick={onToggleShowAllDocs}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {showAllStrategyDocs ? 'Collapse Documents' : `Show ${strategyDataCount - 5} More Documents`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
