import type { PubMedResponse } from '../types';

interface PubMedPanelProps {
  panelLoading: boolean;
  result: PubMedResponse | null;
}

export default function PubMedPanel({ panelLoading, result }: PubMedPanelProps) {
  if (panelLoading && !result) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <div className="inline-block w-6 h-6 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-500">Querying PubMed...</p>
      </div>
    );
  }

  if (!result || result.articles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">No PubMed results found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {result.articles.map((article) => (
        <a
          key={article.pmid}
          href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
          target="_blank"
          rel="noreferrer"
          className="block bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-base font-bold text-gray-900">{article.title || `PMID ${article.pmid}`}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {article.source || '-'} {article.pubdate ? `· ${article.pubdate}` : ''}
          </p>
          {article.authors.length > 0 && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{article.authors.join(', ')}</p>}
        </a>
      ))}
    </div>
  );
}
