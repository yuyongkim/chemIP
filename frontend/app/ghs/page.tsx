'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import Navbar from '@/components/Navbar';
import { GROUP_KO, useGhsIndex, type GhsCode } from '@/lib/ghs-codes';

type TypeFilter = 'all' | 'H' | 'P';

const GROUPS: Record<'H' | 'P', string[]> = {
  H: ['Physical', 'Health', 'Environmental'],
  P: ['General', 'Prevention', 'Response', 'Storage', 'Disposal'],
};

function CodeLinks({ codes, onJump }: { codes: string[]; onJump: (code: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((c) => (
        <a
          key={c}
          href={`#${c}`}
          onClick={() => onJump(c)}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        >
          {c}
        </a>
      ))}
    </div>
  );
}

function CodeRow({ c, active, onJump }: { c: GhsCode; active: boolean; onJump: (code: string) => void }) {
  const related = c.type === 'H' ? c.p_codes : c.h_codes;
  return (
    <div
      id={c.code}
      className={`scroll-mt-48 px-5 py-4 transition-colors ${active ? 'bg-amber-50' : ''} ${c.deleted ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-5">
        <div className="sm:w-40 flex-shrink-0">
          <a href={`#${c.code}`} onClick={() => onJump(c.code)} className="font-mono font-semibold text-blue-800 hover:underline break-all">
            {c.code}
          </a>
          <div className="text-xs text-gray-400 mt-0.5">
            {GROUP_KO[c.group] ?? c.group}
            {c.deleted && ' · 삭제됨'}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {c.ko && (
            <p className="text-gray-900">
              {c.ko}
              {c.ko_src === 'chemip' && <span className="ml-1.5 text-[11px] text-gray-400">(비공식 번역)</span>}
            </p>
          )}
          {c.en && <p className="text-sm text-gray-600">{c.en}</p>}
          {c.type === 'H' && (c.hazard_class || c.signal) && (
            <p className="text-xs text-gray-500">
              {[c.hazard_class, c.category, c.pictogram, c.signal, c.un_class && `UN ${c.un_class}`].filter(Boolean).join(' · ')}
            </p>
          )}
          {related && related.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] text-gray-400 mb-1">{c.type === 'H' ? '권고 예방조치문구' : '이 문구를 요구하는 유해·위험문구'}</div>
              <CodeLinks codes={related} onJump={onJump} />
            </div>
          )}
        </div>
        <div className="sm:w-28 flex-shrink-0 text-xs text-gray-400 sm:text-right tabular-nums">
          <div>PubChem {c.usage.pubchem.toLocaleString()}</div>
          <div>KOSHA {c.usage.kosha.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

export default function GhsCodesPage() {
  const index = useGhsIndex();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [group, setGroup] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Follow #CODE links (from the chemical detail page or related-code chips).
  useEffect(() => {
    if (!index) return;
    const jump = () => {
      const code = decodeURIComponent(window.location.hash.slice(1));
      if (!code) return;
      const target = index.byCode.get(code);
      if (!target) return;
      setQuery('');
      setType('all');
      setGroup(null);
      if (target.deleted) setShowDeleted(true);
      setActive(code);
      requestAnimationFrame(() => document.getElementById(code)?.scrollIntoView({ block: 'start' }));
    };
    jump();
    window.addEventListener('hashchange', jump);
    return () => window.removeEventListener('hashchange', jump);
  }, [index]);

  const filtered = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    return index.codes.filter((c) => {
      if (type !== 'all' && c.type !== type) return false;
      if (group && c.group !== group) return false;
      if (!showDeleted && c.deleted) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.en.toLowerCase().includes(q) ||
        c.ko.toLowerCase().includes(q) ||
        (c.hazard_class ?? '').toLowerCase().includes(q)
      );
    });
  }, [index, query, type, group, showDeleted]);

  const groups = type === 'all' ? [...GROUPS.H, ...GROUPS.P] : GROUPS[type];

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900">GHS 코드 사전</h1>
        <p className="text-sm text-gray-500 mt-1">
          유해·위험문구(H)와 예방조치문구(P) 코드의 국문·영문 문안, 분류 정보, 연결 코드, ChemIP 수록 물질 수
        </p>

        <div className="sticky top-16 z-10 bg-gray-50 pt-5 pb-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="코드 또는 문구 검색 (예: P305, 눈, flammable)"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            {(['all', 'H', 'P'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  setGroup(null);
                }}
                className={`px-3 py-1 rounded-md border ${type === t ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {t === 'all' ? '전체' : t === 'H' ? 'H 유해·위험문구' : 'P 예방조치문구'}
              </button>
            ))}
            <span className="w-px h-5 bg-gray-200 mx-1" />
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(group === g ? null : g)}
                className={`px-2.5 py-1 rounded-md text-xs ${group === g ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {GROUP_KO[g]}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
              <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
              삭제된 코드 포함
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {!index ? (
            <div className="p-8 text-center text-sm text-gray-400">불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">검색 결과가 없습니다.</div>
          ) : (
            filtered.map((c) => <CodeRow key={c.code} c={c} active={active === c.code} onJump={setActive} />)
          )}
        </div>

        {index && (
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-600">출처 · {filtered.length.toLocaleString()} / {index.codes.length.toLocaleString()}개 코드 · 생성 {index.generated}</p>
            <p>영문 문안·분류·연결 코드: {index.sources.en}</p>
            <p>국문 문안: {index.sources.ko}</p>
            <p>(비공식 번역): {index.sources.ko_chemip}</p>
            <p>물질 수: {index.sources.usage}</p>
          </div>
        )}
      </div>
    </main>
  );
}
