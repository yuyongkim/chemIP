import Image from 'next/image';
import { FileText, AlertTriangle, Shield, BookOpen, Gavel, Truck, Flame, type LucideIcon } from 'lucide-react';
import { SECTION_TITLES_KO } from '@/lib/constants';

const SECTION_ICONS: Record<number, LucideIcon> = {
    1: FileText,
    2: AlertTriangle,
    3: BookOpen,
    4: Shield,
    5: Flame,
    14: Truck,
    15: Gavel,
};

// GHS Pictogram Mapping
const GHS_MAP: { [key: string]: { url: string; label: string } } = {
    'GHS01': { url: '/images/ghs/GHS01.png', label: 'Explosive' },
    'GHS02': { url: '/images/ghs/GHS02.png', label: 'Flammable' },
    'GHS03': { url: '/images/ghs/GHS03.png', label: 'Oxidizing' },
    'GHS04': { url: '/images/ghs/GHS04.png', label: 'Compressed Gas' },
    'GHS05': { url: '/images/ghs/GHS05.png', label: 'Corrosive' },
    'GHS06': { url: '/images/ghs/GHS06.png', label: 'Toxic' },
    'GHS07': { url: '/images/ghs/GHS07.png', label: 'Irritant' },
    'GHS08': { url: '/images/ghs/GHS08.png', label: 'Health Hazard' },
    'GHS09': { url: '/images/ghs/GHS09.png', label: 'Environmental Hazard' },
};

interface SectionViewerProps {
    section: {
        section_seq: number;
        section_name: string;
        content: SectionContentItem[];
    };
}

interface SectionContentItem {
    msdsItemNameKor?: string;
    itemDetail?: string;
    [key: string]: string | undefined;
}

export default function SectionViewer({ section }: SectionViewerProps) {
    const Icon = SECTION_ICONS[section.section_seq] || FileText;
    const title = SECTION_TITLES_KO[section.section_seq] || section.section_name;

    const formatEnglishNames = (text: string) => {
        if (!text) return '';
        const match = text.match(/^(.+)\s*\(([A-Z0-9\-\s,]+)\)$/);
        if (match) {
            return (
                <span>
                    {match[1]}
                    <br />
                    <span className="text-gray-500 text-xs font-medium font-mono mt-1 block">
                        {match[2]}
                    </span>
                </span>
            );
        }
        return text;
    };

    const renderContent = (item: SectionContentItem) => {
        const title = item.msdsItemNameKor || 'Item';
        const content = (item.itemDetail || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();

        // Handle GHS Pictograms
        if (title.includes('그림문자') || title.toLowerCase().includes('pictogram')) {
            const codes = content.match(/GHS\d+/g);
            if (codes) {
                return (
                    <div className="mt-2">
                        <div className="flex flex-wrap gap-4">
                            {codes.map((code) => {
                                const ghs = GHS_MAP[code];
                                if (!ghs) return null;
                                return (
                                    <div key={code} className="flex flex-col items-center group relative">
                                        <Image
                                            src={ghs.url}
                                            alt={ghs.label}
                                            width={64}
                                            height={64}
                                            className="w-16 h-16 object-contain border border-red-500 bg-white p-1 rounded-lg transform group-hover:scale-110 transition-transform"
                                        />
                                        <span className="mt-1 text-xs font-bold text-gray-700 text-center max-w-[80px]">
                                            {ghs.label}
                                        </span>
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                            {code}: {ghs.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Hover over a pictogram for details.</p>
                    </div>
                );
            }
        }

        if (!content || content === '자료없음' || content === 'No data') {
            return null;
        }

        return (
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {formatEnglishNames(content)}
            </div>
        );
    };

    return (
        <div
            id={`section-${section.section_seq}`}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden scroll-mt-24"
        >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                    {section.section_seq}. {title}
                </h2>
                {section.section_seq === 7 && (
                    <button
                        onClick={() => {
                            const el = document.getElementById('section-15');
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="ml-auto text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                        View Regulatory Info
                    </button>
                )}
            </div>

            <div className="p-6 space-y-6">
                {section.content.length > 0 ? (
                    section.content.map((item, idx) => {
                        const content = renderContent(item);

                        // Hide items with no content to prevent blank spaces
                        if (!content) return null;

                        return (
                            <div key={idx} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    {item.msdsItemNameKor || 'Item'}
                                </h3>
                                {content}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        No data available
                    </div>
                )}
            </div>
        </div>
    );
}
