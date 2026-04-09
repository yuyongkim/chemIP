import Link from 'next/link';
import { ArrowRight, FileText, Shield } from 'lucide-react';
import { stripHtml } from '@/lib/sanitize';

interface Chemical {
    id: number;
    name: string;
    cas_no: string;
    chem_id: string | null;
    name_en?: string;
    source?: string;
    has_msds?: boolean;
}

export default function ChemicalCard({ chemical }: { chemical: Chemical }) {
    const chem = chemical;
    const hasMsds = !!chem.has_msds;
    const href = chem.chem_id ? `/chemical/${chem.chem_id}` : null;

    const content = (
        <div className={`group block bg-white p-5 rounded-xl border transition-all duration-200 relative ${
            hasMsds
                ? 'border-gray-100 hover:border-[#1e3a5f]/20 hover:shadow-[0_4px_12px_rgba(30,58,95,0.08)] active:scale-[0.99]'
                : 'border-gray-100 hover:border-gray-200 hover:shadow-[0_4px_12px_rgba(30,58,95,0.04)] active:scale-[0.99]'
        }`}>
            {href && (
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                    <ArrowRight className={`w-4 h-4 ${hasMsds ? 'text-[#1e3a5f]' : 'text-gray-400'}`} />
                </div>
            )}

            <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-lg flex-shrink-0 transition-colors duration-200 ${
                    hasMsds
                        ? 'bg-slate-50 group-hover:bg-slate-100'
                        : 'bg-gray-50'
                }`}>
                    {hasMsds
                        ? <Shield className="w-4 h-4 text-[#1e3a5f] group-hover:text-[#172554] transition-colors duration-200" />
                        : <FileText className="w-4 h-4 text-gray-300" />
                    }
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className={`text-sm font-semibold truncate pr-6 transition-colors duration-200 ${
                            hasMsds ? 'text-gray-900 group-hover:text-[#1e3a5f]' : 'text-gray-600'
                        }`}>
                            {stripHtml(chem.name)}
                        </h2>
                    </div>
                    {chem.name_en && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{stripHtml(chem.name_en)}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {hasMsds ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e3a5f] text-white">
                                MSDS
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-500">
                                GHS only
                            </span>
                        )}
                        {chem.source && chem.source !== 'KOSHA' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                                {chem.source}
                            </span>
                        )}
                        {chem.cas_no && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-gray-50 text-gray-600 tabular-nums">
                                {chem.cas_no}
                            </span>
                        )}
                        {chem.chem_id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-50/70 text-blue-600 tabular-nums">
                                {chem.chem_id}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}
