import { Pill } from 'lucide-react';

import SearchBar from '@/components/SearchBar';

interface DrugsHeroProps {
  initialQuery: string;
  onSearch: (query: string) => void;
}

export default function DrugsHero({ initialQuery, onSearch }: DrugsHeroProps) {
  return (
    <div id="main-content" className="relative bg-white border-b border-gray-100 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-white to-white" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold mb-6">
            <Pill className="w-3.5 h-3.5" />
            MFDS + OpenFDA + PubMed
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-[-0.025em] mb-4 leading-[1.08]">
            Drug <span className="text-emerald-600">unified search</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mb-8 leading-relaxed">
            View MFDS approval and medication info, OpenFDA labels, and PubMed articles in one place.
          </p>
          <SearchBar onSearch={onSearch} initialValue={initialQuery} placeholder="Search drug name (e.g., Aspirin, Tylenol)" />
        </div>
      </div>
    </div>
  );
}
