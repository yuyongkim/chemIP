import Link from 'next/link';

interface MarketTabToolbarProps {
  marketKeyword: string;
  chemicalName: string;
  pinnedKeyword: string;
  onUnpin: () => void;
}

export default function MarketTabToolbar({
  marketKeyword,
  chemicalName,
  pinnedKeyword,
  onUnpin,
}: MarketTabToolbarProps) {
  return (
    <>
      <div className="mb-4">
        <Link
          href={`/trade?q=${encodeURIComponent(marketKeyword || chemicalName)}`}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        >
          View details on Trade Dashboard
        </Link>
      </div>
      {pinnedKeyword && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Pinned: {pinnedKeyword}</span>
          <button onClick={onUnpin} className="text-gray-500 hover:text-gray-700 underline">
            Unpin
          </button>
        </div>
      )}
    </>
  );
}
