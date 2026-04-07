import { ExternalLink } from 'lucide-react';

import type { PriceItem } from '../types';
import { resolvePriceUrl } from '../utils';

interface PriceResultsProps {
  items: PriceItem[];
}

export default function PriceResults({ items }: PriceResultsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <a
          key={`${item.itemName}-${item.country}-${item.date}-${idx}`}
          href={resolvePriceUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-xl border border-amber-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-900">{item.itemName}</h3>
            {item.country && <span className="text-xs px-2 py-0.5 bg-amber-50 rounded-full text-amber-700">{item.country}</span>}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-600">{item.price || '-'}</span>
            <span className="text-sm text-gray-500">
              {item.currency || ''}
              {item.unit ? ` / ${item.unit}` : ''}
            </span>
          </div>
          {item.category && <p className="text-xs text-gray-500 mt-2">{item.category}</p>}
          {(item.date || item.newsUrl) && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">{item.date || ''}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                View Source
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
