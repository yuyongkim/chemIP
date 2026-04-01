import { Pill } from 'lucide-react';

interface DrugsInitialStateProps {
  onQuickSearch: (query: string) => void;
}

const SUGGESTED_DRUGS = ['Aspirin', 'Tylenol', 'Ibuprofen', 'Clopidogrel', 'Metformin'];

export default function DrugsInitialState({ onQuickSearch }: DrugsInitialStateProps) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
        <Pill className="w-10 h-10 text-emerald-300" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Search for Drug Information</h2>
      <p className="text-gray-500 mb-6">
        View MFDS, OpenFDA, and PubMed data alongside related patents and market information.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {SUGGESTED_DRUGS.map((name) => (
          <button
            key={name}
            onClick={() => onQuickSearch(name)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
