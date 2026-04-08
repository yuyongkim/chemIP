import { Database, Activity, ShieldCheck } from 'lucide-react';

export default function StatsSection() {
    const stats = [
        {
            label: "KOSHA MSDS",
            value: "13,448",
            desc: "한국 공식 물질안전보건자료",
            icon: ShieldCheck,
            color: "text-[#1e3a5f]",
            bg: "bg-slate-50",
        },
        {
            label: "Safety sections",
            value: "16",
            desc: "GHS 국제 표준 전 섹션",
            icon: Database,
            color: "text-[#1e3a5f]",
            bg: "bg-slate-50",
        },
        {
            label: "Total indexed",
            value: "117,744",
            desc: "KOSHA + ECHA + KREACH + KISCHEM",
            icon: Activity,
            color: "text-[#1e3a5f]",
            bg: "bg-slate-50",
        },
    ];

    return (
        <div className="stagger-in grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-4 bg-white/70 backdrop-blur-sm px-5 py-4 rounded-xl border border-gray-100/80">
                    <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-lg font-bold text-gray-900 tracking-tight font-[var(--font-mono)]">{stat.value}</p>
                        <p className="text-xs text-gray-500 truncate">{stat.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
