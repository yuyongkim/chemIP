import { Flame, Beaker, ShieldAlert, Info } from 'lucide-react';

interface PopularChemicalProps {
    onSearch: (query: string) => void;
}

export default function PopularChemicals({ onSearch }: PopularChemicalProps) {
    const popularItems = [
        {
            name: 'Benzene',
            cas: '71-43-2',
            desc: 'Carcinogen Cat. 1A',
            icon: ShieldAlert,
            color: 'text-red-600',
        },
        {
            name: 'Toluene',
            cas: '108-88-3',
            desc: 'Flammable Liquid',
            icon: Flame,
            color: 'text-orange-600',
        },
        {
            name: 'Sulfuric Acid',
            cas: '7664-93-9',
            desc: 'Skin Corrosion',
            icon: Beaker,
            color: 'text-yellow-600',
        },
        {
            name: 'Acetone',
            cas: '67-64-1',
            desc: 'Eye Irritant',
            icon: Info,
            color: 'text-blue-600',
        }
    ];

    return (
        <div className="w-full max-w-3xl mx-auto mt-10">
            <p className="mb-4 text-xs font-medium tracking-[0.14em] uppercase text-slate-400">
                Frequently searched substances
            </p>

            <div className="stagger-in grid grid-cols-2 md:grid-cols-4 gap-3">
                {popularItems.map((item) => (
                    <button
                        key={item.cas}
                        onClick={() => onSearch(item.name)}
                        className="group relative min-h-[88px] rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] active:scale-[0.98] transition-all duration-200 text-left"
                    >
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                                {item.cas}
                            </span>
                            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>

                        <h4 className="font-semibold text-slate-900 text-sm group-hover:text-[#1e3a5f] transition-colors duration-150">
                            {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {item.desc}
                        </p>
                    </button>
                ))}
            </div>

            <p className="mt-5 text-[11px] text-slate-500">
                Also accepts CAS numbers, for example <span className="font-mono text-[#1e3a5f]">71-43-2</span>
            </p>
        </div>
    );
}
