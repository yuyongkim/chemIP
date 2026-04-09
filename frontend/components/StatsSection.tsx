import { Database, Activity, ShieldCheck } from 'lucide-react';

export default function StatsSection() {
    const stats = [
        {
            label: "KOSHA MSDS",
            value: "48,963",
            desc: "한국 공식 MSDS 16섹션 전문",
            icon: ShieldCheck,
            color: "text-[#1e3a5f]",
            bg: "bg-slate-50",
        },
        {
            label: "전체 화학물질",
            value: "117,744",
            desc: "KOSHA · ECHA · KREACH · KISCHEM",
            icon: Database,
            color: "text-[#1e3a5f]",
            bg: "bg-slate-50",
        },
        {
            label: "MSDS 섹션 데이터",
            value: "769,897",
            desc: "GHS 분류 · 유해성 · 취급 · 응급조치",
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
