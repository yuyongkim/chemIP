'use client';

import Link from 'next/link';
import { useState } from 'react';

import { GHS_CODE_RE, GROUP_KO, extractCodes, useGhsIndex, type GhsIndex } from '@/lib/ghs-codes';

interface GhsStatementListProps {
  title: string;
  lines: string[];
}

function tooltip(index: GhsIndex | null, code: string): string | undefined {
  const c = index?.byCode.get(code);
  if (!c) return undefined;
  return [c.ko, c.en].filter(Boolean).join('\n');
}

function LinkedLine({ line, index }: { line: string; index: GhsIndex | null }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(GHS_CODE_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(line.slice(last, at));
    parts.push(
      <Link
        key={at}
        href={`/ghs#${m[0]}`}
        title={tooltip(index, m[0])}
        className="font-mono text-blue-700 hover:underline decoration-dotted underline-offset-2"
      >
        {m[0]}
      </Link>,
    );
    last = at + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <>{parts}</>;
}

export default function GhsStatementList({ title, lines }: GhsStatementListProps) {
  const index = useGhsIndex();
  const [open, setOpen] = useState(false);
  const codes = extractCodes(lines);

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-blue-900">
          {title} ({lines.length})
        </h3>
        {codes.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-blue-700 hover:text-blue-900 whitespace-nowrap"
            aria-expanded={open}
          >
            {open ? '코드 설명 접기' : `코드 설명 보기 (${codes.length})`}
          </button>
        )}
      </div>
      <ul className="list-disc list-inside text-sm text-gray-800 space-y-1 max-h-64 overflow-auto bg-white rounded-lg p-3 border border-blue-100">
        {lines.map((line, idx) => (
          <li key={idx}>
            <LinkedLine line={line} index={index} />
          </li>
        ))}
      </ul>

      {open && codes.length > 0 && (
        <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {codes.map((code) => {
                const c = index?.byCode.get(code);
                return (
                  <tr key={code} className="align-top">
                    <td className="py-2 pl-3 pr-2 whitespace-nowrap">
                      <Link href={`/ghs#${code}`} className="font-mono text-xs text-blue-700 hover:underline">
                        {code}
                      </Link>
                      {c?.group && <div className="text-[11px] text-gray-400 mt-0.5">{GROUP_KO[c.group] ?? c.group}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      {!index ? (
                        <span className="text-gray-400">…</span>
                      ) : c ? (
                        <>
                          {c.ko && (
                            <div className="text-gray-900">
                              {c.ko}
                              {c.ko_src === 'chemip' && <span className="ml-1 text-[10px] text-gray-400">(비공식 번역)</span>}
                            </div>
                          )}
                          {c.en && <div className="text-xs text-gray-500">{c.en}</div>}
                        </>
                      ) : (
                        <span className="text-gray-400">사전에 없는 코드</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
