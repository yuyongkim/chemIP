import SearchBar from '@/components/SearchBar';
import PopularChemicals from '@/components/PopularChemicals';
import { Shield, FlaskConical, Globe2 } from 'lucide-react';

interface HomeHeroProps {
  initialQuery: string;
  onSearch: (query: string) => void;
}

export default function HomeHero({ initialQuery, onSearch }: HomeHeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-blue-50/30" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-100/30 via-transparent to-transparent rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-6 tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            9 Public Data Sources Integrated
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4 leading-[1.1]">
            Chemical Safety Data
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              All in One Place
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Search MSDS, patents, trade, and drug data with a single query.
            <br className="hidden sm:block" />
            AI cross-analyzes and summarizes the results for you.
          </p>

          <SearchBar onSearch={onSearch} initialValue={initialQuery} />
          <PopularChemicals onSearch={onSearch} />

          {/* Quick feature indicators */}
          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>MSDS 16 Sections</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              <span>350M+ Patents, 6 Jurisdictions</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>KOSHA Safety Guides</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
