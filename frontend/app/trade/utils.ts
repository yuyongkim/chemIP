import { PRICE_KEYWORDS, PRODUCT_KEYWORDS } from './constants';
import type { FraudItem, PriceItem, ProductItem, SafeJsonResult, StrategyItem } from './types';

export function stripHtml(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeExternalUrl(value?: string | null): string {
  const raw = stripHtml(value || '').trim();
  if (!raw) return '';

  const candidate = raw.startsWith('//') ? `https:${raw}` : raw;
  if (!/^https?:\/\//i.test(candidate)) return '';
  if (/^(javascript|data|file|about):/i.test(candidate)) return '';

  try {
    return new URL(candidate).toString();
  } catch {
    return '';
  }
}

function truncate(text: string, maxLength = 220): string {
  const normalized = stripHtml(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

export function buildProductPreview(item: ProductItem): string {
  const summary = truncate(item.cntntSumar || '', 240);
  if (summary) return summary;

  const body = truncate(item.newsBdt || '', 240);
  if (body) return body;

  return truncate(item.newsTitl || '', 160);
}

export function toSearchUrl(query: string): string {
  const q = stripHtml(query) || 'KOTRA trade information';
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function resolveProductUrl(item: ProductItem): string {
  return (
    sanitizeExternalUrl(item.kotraNewsUrl) ||
    sanitizeExternalUrl(item.newsUrl) ||
    toSearchUrl(`${item.newsTitl} ${item.cntryNm} KOTRA`)
  );
}

export function resolveStrategyUrl(item: StrategyItem): string {
  return sanitizeExternalUrl(item.url) || toSearchUrl(`${item.title} ${item.country} market entry strategy`);
}

export function resolvePriceUrl(item: PriceItem): string {
  return sanitizeExternalUrl(item.newsUrl) || toSearchUrl(`${item.itemName} ${item.country || ''} price information`);
}

export function resolveFraudUrl(item: FraudItem): string {
  return sanitizeExternalUrl(item.url) || toSearchUrl(`${item.title || 'trade fraud case'} ${item.country || ''}`);
}

export function toDateValue(v: string): number {
  if (!v) return 0;

  const normalized = stripHtml(v);
  const dateParts = normalized.match(/(20\d{2})\D+(\d{1,2})(?:\D+(\d{1,2}))?/);
  if (dateParts) {
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const day = Number(dateParts[3] || 1);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export async function fetchJsonSafe(url: string): Promise<SafeJsonResult> {
  try {
    const response = await fetch(url);
    const text = await response.text();

    if (!text) {
      return { ok: response.ok, status: response.status, data: null, errorText: '' };
    }

    try {
      const data = JSON.parse(text);
      return { ok: response.ok, status: response.status, data, errorText: '' };
    } catch {
      return { ok: response.ok, status: response.status, data: null, errorText: text };
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      errorText: error instanceof Error ? error.message : 'Unknown fetch error',
    };
  }
}

export function uniq(items: string[]): string[] {
  return Array.from(new Set(items.filter((x) => !!x && x.trim().length >= 2))).slice(0, 12);
}

export function extractSearchTerms(raw: string): string[] {
  const terms: string[] = [];

  const add = (value: string) => {
    const text = stripHtml(value).replace(/\s+/g, ' ').trim();
    if (!text || text.length < 2) return;
    if (!terms.includes(text)) terms.push(text);
  };

  const normalized = stripHtml(raw);
  if (!normalized) return [];

  add(normalized);
  add(normalized.replace(/\([^)]*\)/g, ' ').trim());

  Array.from(normalized.matchAll(/\(([^)]+)\)/g))
    .map((m) => stripHtml(m[1]).trim())
    .forEach(add);

  normalized
    .replace(/[()]/g, ' ')
    .split(/[,/;|]/)
    .map((x) => x.trim())
    .forEach(add);

  Array.from(normalized.matchAll(/[A-Za-z][A-Za-z0-9\- ]{2,}/g)).forEach((m) => add(m[0]));
  Array.from(normalized.matchAll(/[가-힣]{2,}/g)).forEach((m) => add(m[0]));

  return uniq(terms);
}

export function buildKeywordTokens(raw: string): string[] {
  const normalized = stripHtml(raw).toLowerCase().trim();
  if (!normalized) return [];
  const expanded = extractSearchTerms(raw).map((value) => stripHtml(value).toLowerCase().trim());
  return uniq([normalized, ...expanded]).filter((value) => value.length >= 2);
}

export function dedupeProducts(items: ProductItem[]): ProductItem[] {
  const map = new Map<string, ProductItem>();

  items.forEach((item) => {
    const key = `${stripHtml(item.newsTitl || '').toLowerCase()}|${stripHtml(item.cntryNm || '').toLowerCase()}|${stripHtml(item.newsWrtDt || '')}`;
    if (!map.has(key)) map.set(key, item);
  });

  return Array.from(map.values()).sort((a, b) => toDateValue(b.newsWrtDt || '') - toDateValue(a.newsWrtDt || ''));
}

export function filterProductsByKeyword(items: ProductItem[], rawKeyword: string): ProductItem[] {
  const tokens = buildKeywordTokens(rawKeyword);
  if (tokens.length === 0) return items;

  return items.filter((item) => {
    const haystack = [item.newsTitl, item.cntryNm, item.newsBdt, item.cntntSumar]
      .map((value) => stripHtml(value || ''))
      .join(' ')
      .toLowerCase();

    return tokens.some((token) => haystack.includes(token));
  });
}

export function buildDynamicProductKeywords(baseKeyword: string): string[] {
  const q = (baseKeyword || '').toLowerCase();
  const terms = extractSearchTerms(baseKeyword);
  const extra: string[] = [];

  if (q.includes('란탄') || q.includes('lanthanum')) extra.push('란탄', '희토류', '희토류 소재');
  if (q.includes('황산') || q.includes('sulfate') || q.includes('sulfuric')) extra.push('황산', '무기화학 소재', '유해물질 소재');
  if (q.includes('벤젠') || q.includes('benzene')) extra.push('석유화학', '방향족 화합물', '화학 소재');

  return uniq([...terms, ...extra, ...PRODUCT_KEYWORDS]);
}

export function buildDynamicPriceKeywords(baseKeyword: string): string[] {
  const terms = extractSearchTerms(baseKeyword);
  const expanded = terms.flatMap((t) => [`${t} price`, `${t} import unit price`]);
  return uniq([...expanded, ...PRICE_KEYWORDS]);
}

export function detectStrategyThemes(text: string): string[] {
  const raw = (text || '').toLowerCase();
  const tags: string[] = [];

  if (raw.includes('규제') || raw.includes('인증') || raw.includes('compliance')) tags.push('Regulation/Certification');
  if (raw.includes('유통') || raw.includes('채널') || raw.includes('파트너')) tags.push('Distribution/Partners');
  if (raw.includes('관세') || raw.includes('fta') || raw.includes('통관')) tags.push('Tariffs/Customs');
  if (raw.includes('리스크') || raw.includes('위험') || raw.includes('불확실')) tags.push('Risk');
  if (raw.includes('투자') || raw.includes('법인') || raw.includes('진출')) tags.push('Market Entry');
  if (raw.includes('소비') || raw.includes('수요') || raw.includes('시장')) tags.push('Market Demand');

  return uniq(tags).slice(0, 3);
}

export function pickYear(value: string): number | null {
  const m = (value || '').match(/(20\d{2})/);
  return m ? Number(m[1]) : null;
}
