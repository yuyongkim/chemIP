import SearchBar from '@/components/SearchBar';

interface PatentsHeroProps {
  query: string;
  onSearch: (query: string) => void;
}

export default function PatentsHero({ query, onSearch }: PatentsHeroProps) {
  return (
    <div className="relative bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-4 border border-indigo-100">
            Global Patent Index (144GB)
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Global Patent <span className="text-indigo-600">Search</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8">
            Search a 144GB global patent database for chemical usage and exclusion information.
            <br />
            (USPTO, EPO, WIPO, JPO, etc.)
          </p>

          <SearchBar onSearch={onSearch} initialValue={query} placeholder="Search patents by chemical name or keyword (e.g., Benzene, Aspirin)" />
        </div>
      </div>
    </div>
  );
}
