import { Flame, Beaker, ShieldAlert, Info } from 'lucide-react';

interface PopularChemicalProps {
    onSearch: (query: string) => void;
}

export default function PopularChemicals({ onSearch }: PopularChemicalProps) {
    const popularItems = [
        {
            name: "Benzene",
            cas: "71-43-2",
            desc: "Carcinogen Cat. 1A",
            icon: ShieldAlert,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100"
        },
        {
            name: "Toluene",
            cas: "108-88-3",
            desc: "Flammable Liquid",
            icon: Flame,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100"
        },
        {
            name: "Sulfuric Acid",
            cas: "7664-93-9",
            desc: "Skin Corrosion",
            icon: Beaker,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
            border: "border-yellow-100"
        },
        {
            name: "Acetone",
            cas: "67-64-1",
            desc: "Eye Irritant",
            icon: Info,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100"
        }
    ];

    return (
        <div className="w-full max-w-3xl mx-auto mt-10">
            <p className="text-center mb-4 text-xs font-medium text-gray-400">
                Frequently searched substances
            </p>

            <div className="stagger-in grid grid-cols-2 md:grid-cols-4 gap-3">
                {popularItems.map((item) => (
                    <button
                        key={item.cas}
                        onClick={() => onSearch(item.name)}
                        className="group relative p-3.5 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] active:scale-[0.98] transition-all duration-200 text-left"
                    >
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
                                <item.icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 tabular-nums">
                                {item.cas}
                            </span>
                        </div>

                        <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors duration-150">
                            {item.name}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {item.desc}
                        </p>
                    </button>
                ))}
            </div>

            <p className="mt-6 text-center text-[11px] text-gray-400">
                Also accepts CAS numbers (e.g. <span className="font-mono text-blue-500">71-43-2</span>)
            </p>
        </div>
    );
}
