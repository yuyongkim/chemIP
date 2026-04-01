import Image from 'next/image';
import { ChevronDown, ChevronUp, Pill } from 'lucide-react';

import type { EasyInfoItem } from '../types';
import { stripHtml } from '../utils';

interface EasyInfoPanelProps {
  items: EasyInfoItem[];
  expanded: number | null;
  onToggle: (idx: number) => void;
}

export default function EasyInfoPanel({ items, expanded, onToggle }: EasyInfoPanelProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">No results found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={`${item.itemName}-${idx}`} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => onToggle(idx)}>
            <div className="flex items-center gap-4">
              {item.itemImage ? (
                <Image
                  src={item.itemImage}
                  alt={item.itemName}
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 rounded-xl object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Pill className="w-8 h-8 text-emerald-300" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">{item.itemName}</h3>
                <p className="text-sm text-gray-500">{item.entpName}</p>
              </div>
            </div>
            {expanded === idx ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>

          {expanded === idx && (
            <div className="border-t border-gray-100 p-5 space-y-4">
              {item.efcyQesitm && (
                <div>
                  <h4 className="text-sm font-semibold text-emerald-700 mb-1">Efficacy / Effects</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{stripHtml(item.efcyQesitm)}</p>
                </div>
              )}
              {item.useMethodQesitm && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-700 mb-1">Dosage / Administration</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{stripHtml(item.useMethodQesitm)}</p>
                </div>
              )}
              {item.atpnWarnQesitm && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-1">Warnings</h4>
                  <p className="text-sm text-red-800 leading-relaxed">{stripHtml(item.atpnWarnQesitm)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
