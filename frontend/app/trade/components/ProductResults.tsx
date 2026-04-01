import { ExternalLink, MapPin } from 'lucide-react';

import type { ProductItem } from '../types';
import { buildProductPreview, resolveProductUrl, stripHtml } from '../utils';

interface ProductResultsProps {
  items: ProductItem[];
}

export default function ProductResults({ items }: ProductResultsProps) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const href = resolveProductUrl(item);
        const preview = buildProductPreview(item);
        const subtitle = stripHtml(item.newsBdt || '');

        return (
          <a
            key={`${item.newsTitl}-${item.cntryNm}-${item.newsWrtDt}-${idx}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">{stripHtml(item.newsTitl || 'Market News')}</h3>
                {subtitle && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{subtitle}</p>}

                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-gray-500 mb-1">Key Content</p>
                  <p className="text-sm text-gray-700 leading-6 line-clamp-4">{preview}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs px-2 py-1 bg-blue-50 rounded-full text-blue-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.cntryNm || 'Global'}
                </span>
                <span className="text-xs text-gray-400">{item.newsWrtDt}</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                  View Source
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
