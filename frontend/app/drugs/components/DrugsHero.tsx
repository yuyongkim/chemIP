import { Pill } from 'lucide-react';

import SearchBar from '@/components/SearchBar';

interface DrugsHeroProps {
  initialQuery: string;
  onSearch: (query: string) => void;
}

export default function DrugsHero({ initialQuery, onSearch }: DrugsHeroProps) {
  return (
    <div className="relative bg-white border-b border-gray-200 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-50"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <Pill className="w-4 h-4" />
            Unified Drug + OpenFDA + PubMed Search
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Drug <span className="text-emerald-600">Unified Search</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8">
            View MFDS approval/medication info, OpenFDA labels, and PubMed articles in one place.
          </p>
          <SearchBar onSearch={onSearch} initialValue={initialQuery} placeholder="Search drug name (e.g., Aspirin, Tylenol)" />
        </div>
      </div>
    </div>
  );
}
