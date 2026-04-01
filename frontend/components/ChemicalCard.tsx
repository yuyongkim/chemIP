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
            className="group block bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-100 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-blue-500" />
            </div>

            <div className="flex items-start gap-4">
                <div className="p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div>
                    <h2 className="text-base font-medium text-gray-900 mb-0.5 group-hover:text-blue-600 transition-colors">
                        {stripHtml(chem.name)}
                    </h2>
                    {chem.name_en && (
                        <p className="text-sm text-gray-500 mb-1">{stripHtml(chem.name_en)}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                        {chem.cas_no && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                CAS: {chem.cas_no}
                            </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            ID: {chem.chem_id}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
