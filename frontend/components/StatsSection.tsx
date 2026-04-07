import { Database, Activity, ShieldCheck } from 'lucide-react';

export default function StatsSection() {
    const stats = [
        {
            label: "Total Chemicals",
            value: "20,446",
            desc: "Verified Substances",
            icon: Database,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            label: "Safety Data",
            value: "100%",
            desc: "KOSHA Compliant",
            icon: ShieldCheck,
            color: "text-green-600",
            bg: "bg-green-50"
        },
        {
            label: "Daily Updates",
            value: "Live",
            desc: "Real-time Sync",
            icon: Activity,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {stats.map((stat) => (
                <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{stat.desc}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
