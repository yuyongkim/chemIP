'use client';

import { useEffect, useState } from 'react';

// Built by scripts/build_ghs_code_index.py → public/data/ghs_codes.json
export interface GhsCode {
  code: string;
  type: 'H' | 'P';
  group: string;
  en: string;
  ko: string;
  ko_src: '' | 'kosha' | 'chemip';
  deleted: boolean;
  rev: number | null;
  usage: { pubchem: number; kosha: number };
  hazard_class?: string;
  category?: string;
  un_class?: string;
  pictogram?: string;
  signal?: string;
  p_codes?: string[];
  h_codes?: string[];
}

export interface GhsIndex {
  generated: string;
  sources: Record<string, string>;
  codes: GhsCode[];
  byCode: Map<string, GhsCode>;
}

export const GHS_CODE_RE = /[HP]\d{3}(?:\+[HP]\d{3})*/g;

export const GROUP_KO: Record<string, string> = {
  General: '일반',
  Prevention: '예방',
  Response: '대응',
  Storage: '저장',
  Disposal: '폐기',
  Physical: '물리적 위험',
  Health: '건강 유해성',
  Environmental: '환경 유해성',
};

let cache: Promise<GhsIndex> | null = null;

export function loadGhsIndex(): Promise<GhsIndex> {
  if (!cache) {
    cache = fetch('/data/ghs_codes.json')
      .then((r) => {
        if (!r.ok) throw new Error(`ghs_codes.json ${r.status}`);
        return r.json();
      })
      .then((d) => ({ ...d, byCode: new Map(d.codes.map((c: GhsCode) => [c.code, c])) }))
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

export function useGhsIndex(): GhsIndex | null {
  const [index, setIndex] = useState<GhsIndex | null>(null);
  useEffect(() => {
    let alive = true;
    loadGhsIndex().then((d) => alive && setIndex(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

/** Unique codes in order of first appearance across the given lines. */
export function extractCodes(lines: string[]): string[] {
  const seen = new Set<string>();
  for (const line of lines) for (const m of line.match(GHS_CODE_RE) ?? []) seen.add(m);
  return [...seen];
}
