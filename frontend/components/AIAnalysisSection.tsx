import { useState } from 'react';
import { AlertTriangle, Bot, Loader2, Pin, Sparkles } from 'lucide-react';

import { fetchJsonSafe, getErrorMessage } from '@/lib/http';

interface AIAnalysisProps {
  chemId: string;
  chemicalName: string;
  onSelectMarketKeyword?: (keyword: string) => void;
  onOpenMarketTab?: () => void;
  pinnedMarketKeyword?: string;
  onPinMarketKeyword?: (keyword: string) => void;
}

interface AnalysisSource {
  type?: string;
  id?: string;
  title?: string;
  url?: string;
  snippet?: string;
  match_terms?: string[];
  guide_cas_numbers?: string[];
}

interface GuideRecommendation {
  guide_no: string;
  title: string;
  score: number;
  file_download_url?: string;
  match_terms?: string[];
  guide_cas_numbers?: string[];
  snippet?: string;
}

interface AnalysisResponse {
  analysis?: string;
  confidence?: number;
  sources?: AnalysisSource[];
  guide_recommendations?: GuideRecommendation[];
  detail?: string;
  message?: string;
}

function cleanText(value: string): string {
  return (value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildKeywordCandidates(chemicalName: string, analysis: string): string[] {
  const terms: string[] = [];
  const add = (v: string) => {
    const t = cleanText(v);
    if (!t || t.length < 2) return;
    if (!terms.includes(t)) terms.push(t);
  };

  const normalized = cleanText(chemicalName);
  add(normalized);
  add(normalized.replace(/\([^)]*\)/g, ' '));

  const paren = Array.from(normalized.matchAll(/\(([^)]+)\)/g)).map((m) => cleanText(m[1]));
  paren.forEach(add);

  const english = Array.from(normalized.matchAll(/[A-Za-z][A-Za-z0-9\- ]{2,}/g)).map((m) => cleanText(m[0]));
  english.forEach(add);

  const korean = Array.from(normalized.matchAll(/[가-힣]{2,}/g)).map((m) => cleanText(m[0]));
  korean.forEach(add);

  const analysisText = cleanText(analysis);
  const bracketTerms = Array.from(analysisText.matchAll(/\[([^\]]+)\]/g)).map((m) => cleanText(m[1]));
  bracketTerms.forEach(add);

  return terms.slice(0, 8);
}

function isPatentSource(source: AnalysisSource): boolean {
  const type = (source.type || '').toLowerCase();
  return type.includes('patent');
}

export default function AIAnalysisSection({
  chemId,
  chemicalName,
  onSelectMarketKeyword,
  onOpenMarketTab,
  pinnedMarketKeyword,
  onPinMarketKeyword,
}: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [sources, setSources] = useState<AnalysisSource[]>([]);
  const [guideRecommendations, setGuideRecommendations] = useState<GuideRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const patentSources = sources.filter(isPatentSource);
  const supportingSources = sources.filter((source) => !isPatentSource(source));

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setConfidence(null);
    setSources([]);
    setGuideRecommendations([]);

    try {
      const result = await fetchJsonSafe<AnalysisResponse>('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chemId, chemicalName }),
      });

      if (result.ok && result.data) {
        const analysisText = result.data.analysis || '';
        setAnalysis(analysisText);
        setConfidence(typeof result.data.confidence === 'number' ? result.data.confidence : null);
        setSources(Array.isArray(result.data.sources) ? result.data.sources : []);
        setGuideRecommendations(Array.isArray(result.data.guide_recommendations) ? result.data.guide_recommendations : []);

        const candidates = buildKeywordCandidates(chemicalName, analysisText);
        if (candidates.length > 0) {
          onSelectMarketKeyword?.(candidates[0]);
        }
      } else {
        setError(getErrorMessage(result, 'Failed to generate analysis'));
      }
    } catch (err) {
      setError('Network error occurred.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[400px]">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Bot className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI Safety & Patent Analysis</h3>
          <p className="text-sm text-gray-500">Retrieval-assisted insight (MSDS + KOSHA Guide + Patent evidence)</p>
        </div>
      </div>

      {!analysis && !loading && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">
            Generate a comprehensive report combining MSDS evidence, KOSHA guide context, and patent signals for{' '}
            <strong>{chemicalName}</strong>.
          </p>
          <button
            onClick={handleAnalyze}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate AI Report
          </button>
          {error && (
            <div className="mt-4 text-red-500 text-sm flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
          <p className="text-gray-500">Analyzing chemical evidence...</p>
          <p className="text-xs text-gray-500 mt-2">This may take a few seconds.</p>
        </div>
      )}

      {analysis && (
        <div className="prose prose-sm max-w-none">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 mb-6 text-sm text-purple-800">
            <strong>Note:</strong> AI-generated content may contain inaccuracies. Please cross-reference with official MSDS and guide documents.
          </div>

          {confidence !== null && (
            <div className="mb-4 text-xs text-gray-600">
              Confidence: <span className="font-semibold text-gray-800">{Math.round(confidence * 100)}%</span>
            </div>
          )}

          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{analysis}</div>

          {guideRecommendations.length > 0 && (
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="text-sm font-semibold text-indigo-900 mb-2">Related KOSHA Guides</div>
              <div className="space-y-2">
                {guideRecommendations.slice(0, 4).map((guide) => (
                  <div key={guide.guide_no} className="bg-white border border-indigo-100 rounded-lg px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 break-words">{guide.title || guide.guide_no}</div>
                        <div className="text-xs text-gray-500">{guide.guide_no} • score {guide.score}</div>
                      </div>
                      {guide.file_download_url ? (
                        <a
                          href={guide.file_download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-700 hover:text-indigo-900"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                    {guide.match_terms && guide.match_terms.length > 0 && (
                      <div className="mt-1 text-[11px] text-indigo-700">Matched: {guide.match_terms.slice(0, 4).join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {patentSources.length > 0 && (
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-sm font-semibold text-amber-900 mb-2">Patent Signals</div>
              <div className="space-y-2">
                {patentSources.map((source, idx) => (
                  <div key={`${source.id || source.title || 'patent'}-${idx}`} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
                    <div className="text-xs font-semibold text-amber-700 mb-1">
                      {source.type === 'kipris_patent' ? 'KIPRIS' : 'Local Patent'}
                    </div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                      {source.title || source.id || 'Untitled patent'}
                    </div>
                    {source.snippet && (
                      <div className="mt-1 text-xs text-gray-600 leading-relaxed">
                        {source.snippet}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {supportingSources.length > 0 && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-sm font-semibold text-slate-900 mb-2">Supporting Evidence</div>
              <div className="space-y-2">
                {supportingSources.map((source, idx) => (
                  <div key={`${source.id || source.title || 'source'}-${idx}`} className="text-xs text-slate-700">
                    <div className="font-medium">
                      [{source.type || 'source'}] {source.title || source.id || 'Untitled source'}
                    </div>
                    {source.match_terms && source.match_terms.length > 0 && (
                      <div>Matched terms: {source.match_terms.join(', ')}</div>
                    )}
                    {source.guide_cas_numbers && source.guide_cas_numbers.length > 0 && (
                      <div>CAS in source: {source.guide_cas_numbers.slice(0, 6).join(', ')}</div>
                    )}
                    {source.snippet && <div className="text-slate-600">&quot;{source.snippet}&quot;</div>}
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-900">
                        Open source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm font-semibold text-gray-900 mb-2">Recommended Market Search Terms</div>
            <div className="flex flex-wrap gap-2">
              {buildKeywordCandidates(chemicalName, analysis).map((term, idx) => (
                <div key={`${term}-${idx}`} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 overflow-hidden">
                  <button
                    onClick={() => {
                      onSelectMarketKeyword?.(term);
                      onOpenMarketTab?.();
                    }}
                    className="text-xs font-medium px-3 py-1.5 text-blue-700 hover:bg-blue-100"
                  >
                    {term}
                  </button>
                  <button
                    onClick={() => onPinMarketKeyword?.(term)}
                    className={`px-2.5 py-1.5 border-l border-blue-200 ${
                      pinnedMarketKeyword === term ? 'bg-blue-200 text-blue-900' : 'text-blue-700 hover:bg-blue-100'
                    }`}
                    title={pinnedMarketKeyword === term ? 'Pinned' : 'Pin keyword'}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">Click a term to open Market. Click pin to keep it for this chemical.</div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
            <button onClick={handleAnalyze} className="text-sm text-purple-600 hover:text-purple-800 font-medium">
              Regenerate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
