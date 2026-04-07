import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

import type { ApprovalItem } from '../types';

interface ApprovalPanelProps {
  items: ApprovalItem[];
}

export default function ApprovalPanel({ items }: ApprovalPanelProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No results found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={`${item.itemName}-${idx}`} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            {item.itemImage ? (
              <Image
                src={item.itemImage}
                alt={item.itemName}
                width={80}
                height={80}
                loading="lazy"
                className="w-20 h-20 rounded-xl object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-10 h-10 text-blue-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{item.itemName}</h3>
              <p className="text-sm text-gray-500">{item.entpName}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.chart && <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">{item.chart}</span>}
                {item.storageMethod && <span className="text-xs px-2 py-1 bg-blue-50 rounded-full text-blue-600">{item.storageMethod}</span>}
                {item.validTerm && <span className="text-xs px-2 py-1 bg-green-50 rounded-full text-green-600">Validity: {item.validTerm}</span>}
                {item.cancelName && <span className="text-xs px-2 py-1 bg-red-50 rounded-full text-red-600">{item.cancelName}</span>}
              </div>
              {item.materialName && <p className="text-xs text-gray-500 mt-2 line-clamp-2">Ingredients: {item.materialName}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
