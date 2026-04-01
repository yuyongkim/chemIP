import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';

interface MarketNews {
  newsTitl: string;
  newsWrtDt: string;
  newsWirtNm: string;
  cntryNm: string;
  newsBdt: string;
  fileUrl?: string;
  newsUrl?: string;
  kotraNewsUrl?: string;
  cntntSumar?: string;
  source?: string;
}

interface MarketNewsProps {
  keyword: string;
}

interface SafeJsonFetchResult {
  ok: boolean;
  status: number;
  data: unknown;
}

function extractItems(payload: unknown): MarketNews[] {
  if (Array.isArray(payload)) return payload as MarketNews[];
  if (payload && typeof payload === 'object') {
    const rec = payload as Record<string, unknown>;
    if (Array.isArray(rec.data)) return rec.data as MarketNews[];
    if (Array.isArray(rec.results)) return rec.results as MarketNews[];
  }
  return [];
}

function cleanText(v: string): string {
  return (v || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJsonSafely(url: string): Promise<SafeJsonFetchResult> {
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!text) return { ok: res.ok, status: res.status, data: null };
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, data: null };
    }
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function extractSearchTerms(raw: string): string[] {
  const terms: string[] = [];
  const add = (value: string) => {
    const text = cleanText(value);
    if (!text || text.length < 2) return;
    if (!terms.includes(text)) terms.push(text);
  };

  const normalized = cleanText(raw);
  add(normalized);

  const paren = Array.from(normalized.matchAll(/\(([^)]+)\)/g)).map((m) => cleanText(m[1]));
  paren.forEach(add);

  add(cleanText(normalized.replace(/\([^)]*\)/g, ' ')));

  normalized
    .replace(/[()]/g, ' ')
    .split(/[,/;|]/)
    .map(cleanText)
    .forEach(add);

  const englishPhrases = Array.from(normalized.matchAll(/[A-Za-z][A-Za-z0-9\- ]{2,}/g)).map((m) => cleanText(m[0]));
  englishPhrases.forEach(add);

  const koreanChunks = Array.from(normalized.matchAll(/[가-힣]{2,}/g)).map((m) => cleanText(m[0]));
  koreanChunks.forEach(add);

  return terms
    .filter((x) => x.length >= 2)
    .sort((a, b) => Math.abs(a.length - 8) - Math.abs(b.length - 8))
    .slice(0, 12);
}

function buildIntelligenceFallbackTerms(keyword: string, searchedTerms: string[]): string[] {
  const base = ['chemical market trends', 'chemical materials industry trends', 'battery materials market', 'semiconductor materials market', 'China chemical market'];
  const q = cleanText(keyword).toLowerCase();
  const extra: string[] = [];

  if (q.includes('란타넘') || q.includes('lanthanum')) {
    extra.push('rare earth market trends', 'lanthanum market trends', 'rare earth supply chain');
  }
  if (q.includes('황산') || q.includes('sulfate') || q.includes('sulfuric')) {
    extra.push('sulfuric acid market trends', 'inorganic chemical raw materials market', 'electrolyte materials market');
  }

  return Array.from(new Set([...searchedTerms, ...extra, ...base])).slice(0, 12);
}

export default function MarketNewsSection({ keyword }: MarketNewsProps) {
  const [news, setNews] = useState<MarketNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usedTerm, setUsedTerm] = useState('');
  const [searchedTerms, setSearchedTerms] = useState<string[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      if (!keyword) return;
      setLoading(true);
      setError('');
      setNews([]);
      setUsedTerm('');

      const terms = extractSearchTerms(keyword);
      setSearchedTerms(terms);

      try {
        let foundItems: MarketNews[] = [];
        let matchedTerm = '';

        for (const term of terms) {
          if (!term) continue;
          const newsResult = await fetchJsonSafely(`/api/trade/news?q=${encodeURIComponent(term)}&page=1`);
          const items = newsResult.ok ? extractItems(newsResult.data) : [];
          if (items.length > 0) {
            foundItems = items;
            matchedTerm = term;
            break;
          }

          // Fallback to Naver News if KOTRA has no result for this term
          const naverResult = await fetchJsonSafely(`/api/trade/naver-news?q=${encodeURIComponent(term)}&page=1&limit=8`);
          if (naverResult.ok) {
            const naverItems = extractItems(naverResult.data);
            if (naverItems.length > 0) {
              foundItems = naverItems;
              matchedTerm = term;
              break;
            }
          }
        }

        // If no result from direct chemical terms, run broader intelligence fallback terms.
        if (foundItems.length === 0) {
          const broadTerms = buildIntelligenceFallbackTerms(keyword, terms);
          for (const term of broadTerms) {
            const newsResult = await fetchJsonSafely(`/api/trade/news?q=${encodeURIComponent(term)}&page=1`);
            if (newsResult.ok) {
              const items = extractItems(newsResult.data);
              if (items.length > 0) {
                foundItems = items;
                matchedTerm = term;
                setSearchedTerms(broadTerms);
                break;
              }
            }

            const naverResult = await fetchJsonSafely(`/api/trade/naver-news?q=${encodeURIComponent(term)}&page=1&limit=8`);
            if (naverResult.ok) {
              const naverItems = extractItems(naverResult.data);
              if (naverItems.length > 0) {
                foundItems = naverItems;
                matchedTerm = term;
                setSearchedTerms(broadTerms);
                break;
              }
            }
          }
        }

        setNews(foundItems);
        setUsedTerm(matchedTerm);
      } catch (err) {
        console.error(err);
        setError('Failed to load market trends.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [keyword]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) return <div className="text-red-500 p-4 text-sm">{error}</div>;

  if (news.length === 0) {
    const suggestions = (searchedTerms.length > 0 ? searchedTerms : [keyword]).slice(0, 4);
    return (
      <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="text-gray-700 text-sm">No recent market news found for &quot;{keyword}&quot;.</div>
        <div className="text-xs text-gray-500">Expanded search terms: {suggestions.join(', ')}</div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((term, idx) => {
            const q = `"${term}" market trends`;
            const href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
            const naverHref = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(q)}`;
            return (
              <div key={`${term}-${idx}`} className="flex items-center gap-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100"
                >
                  Google: {term}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <a
                  href={naverHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100"
                >
                  Naver: {term}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Newspaper className="w-5 h-5 text-blue-600" />
        Global Market Trends (KOTRA)
      </h3>
      {searchedTerms.length > 0 && (
        <div className="text-xs text-gray-500">
          Generated keywords: {searchedTerms.join(' -> ')}
        </div>
      )}
      {usedTerm && usedTerm !== keyword && (
        <div className="text-xs text-gray-500">Matched with fallback keyword: &quot;{usedTerm}&quot;</div>
      )}
      {usedTerm && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(`"${usedTerm}" market trends`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-100"
          >
            Google quick search
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
          <a
            href={`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(`"${usedTerm}" market trends`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full hover:bg-green-100"
          >
            Naver quick search
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {news.map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${item.source === 'Naver' ? 'text-green-700 bg-green-50' : 'text-blue-600 bg-blue-50'}`}>
                {item.source === 'Naver' ? 'Naver' : (item.cntryNm || 'Global')}
              </span>
              <span className="text-xs text-gray-400">{item.newsWrtDt}</span>
            </div>
            <h4 className="font-bold text-gray-800 mb-2 line-clamp-2">{item.newsTitl}</h4>
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">{(item.cntntSumar || item.newsBdt)?.replace(/<[^>]*>?/gm, '')}</p>

            {(item.kotraNewsUrl || item.newsUrl) && (
              <a
                href={item.kotraNewsUrl || item.newsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mt-auto"
              >
                {item.source === 'Naver' ? 'Read source article' : 'Read on KOTRA'}
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
