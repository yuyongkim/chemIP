import { ExternalLink, ShieldAlert } from 'lucide-react';

import type { FraudItem } from '../types';
import { resolveFraudUrl } from '../utils';

interface FraudResultsProps {
  items: FraudItem[];
}

export default function FraudResults({ items }: FraudResultsProps) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <a
          key={`${item.title}-${item.date}-${item.country}-${idx}`}
          href={resolveFraudUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-xl border border-rose-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 mb-1">{item.title || 'Trade Fraud Case'}</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {item.country && <span className="text-xs px-2 py-0.5 bg-rose-50 rounded-full text-rose-700">{item.country}</span>}
                {item.category && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-700">{item.category}</span>}
                {item.amount && <span className="text-xs px-2 py-0.5 bg-amber-50 rounded-full text-amber-700">Damage: {item.amount}</span>}
                {item.date && <span className="text-xs text-gray-400">{item.date}</span>}
              </div>
              {item.content && <p className="text-sm text-gray-700 line-clamp-4">{item.content}</p>}
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                View Source
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
