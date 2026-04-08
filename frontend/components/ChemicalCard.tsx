import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { stripHtml } from '@/lib/sanitize';

interface Chemical {
    id: number;
    name: string;
    cas_no: string;
    chem_id: string;
    name_en?: string;
}

export default function ChemicalCard({ chemical }: { chemical: Chemical }) {
    const chem = chemical;
    return (
        <Link
            href={`/chemical/${chem.chem_id}`}
            className="group block bg-white p-5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] active:scale-[0.99] transition-all duration-200 relative"
        >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                <ArrowRight className="w-4 h-4 text-blue-500" />
            </div>

            <div className="flex items-start gap-3.5">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-200 flex-shrink-0">
                    <FileText className="w-4.5 h-4.5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate pr-6">
                        {stripHtml(chem.name)}
                    </h2>
                    {chem.name_en && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{stripHtml(chem.name_en)}</p>
                    )}
                    <div className="flex gap-1.5 mt-2.5">
                        {chem.cas_no && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-gray-50 text-gray-600 tabular-nums">
                                {chem.cas_no}
                            </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-50/70 text-blue-600 tabular-nums">
                            {chem.chem_id}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
