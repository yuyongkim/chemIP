import type { ReactNode } from 'react';

import type { Patent } from './types';

export function buildHighlightKeywords(...values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    keywords.push(trimmed);
  };

  const addFromValue = (value: string) => {
    push(value);

    const casMatches = value.match(/\b\d{2,7}-\d{2}-\d\b/g) || [];
    casMatches.forEach(push);

    const bracketMatches = value.match(/\(([^)]+)\)/g) || [];
    for (const match of bracketMatches) {
      const inner = match.slice(1, -1);
      inner
        .split(/[,/;|]/)
        .map((item) => item.trim())
        .forEach(push);
    }
  };

  for (const value of values) {
    if (!value) continue;
    addFromValue(value);
  }

  return keywords.sort((a, b) => b.length - a.length);
}

export function highlightText(text: string | null | undefined, keywords: string[]): ReactNode {
  if (!text || keywords.length === 0) return text || '';

  const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const splitRegex = new RegExp(`(${pattern})`, 'gi');
  const exactRegex = new RegExp(`^(${pattern})$`, 'i');
  const parts = text.split(splitRegex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    exactRegex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded-sm font-semibold">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function normalizeKiprisQuery(query: string): string {
  const compact = query.replace(/\s+/g, '').trim();
  const match = compact.match(/^(\d{2})(\d{4})(\d{7})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return query.trim();
}

function isKiprisApplicationNumber(query: string): boolean {
  const compact = query.replace(/[\s-]/g, '').trim();
  return /^\d{13}$/.test(compact);
}

function buildKiprisSearchUrl(queryText: string): string {
  const normalized = normalizeKiprisQuery(queryText);
  const url = new URL('https://www.kipris.or.kr/khome/search/searchResult.do');
  url.searchParams.set('tab', 'patent');
  url.searchParams.set('queryText', normalized);
  if (isKiprisApplicationNumber(normalized)) {
    url.searchParams.set('strstat', 'SMART|AN|');
  }
  return url.toString();
}

export function getPatentSourceUrl(patent: Patent, query: string): string {
  if (patent.applicationNumber) {
    return buildKiprisSearchUrl(patent.applicationNumber);
  }
  if (patent.inventionTitle) {
    return buildKiprisSearchUrl(patent.inventionTitle);
  }
  if (patent.title) {
    return `https://patents.google.com/?q=${encodeURIComponent(patent.title)}`;
  }
  return buildKiprisSearchUrl(query);
}
