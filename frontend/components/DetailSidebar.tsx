import { SECTION_TITLES_KO } from '@/lib/constants';

interface DetailSidebarProps {
    sections: { section_seq: number; section_name: string }[];
    activeSection: number;
    onSectionClick: (seq: number) => void;
}

export default function DetailSidebar({ sections, activeSection, onSectionClick }: DetailSidebarProps) {
    return (
        <aside className="hidden lg:block col-span-1" aria-label="Table of contents">
            <div className="sticky top-24 bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contents</h3>
                </div>
                <nav className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
                    {sections.map((section) => (
                        <button
                            key={section.section_seq}
                            onClick={() => onSectionClick(section.section_seq)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 flex items-center gap-2 ${activeSection === section.section_seq
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="w-5 h-5 flex items-center justify-center text-xs border border-current rounded-full opacity-70 flex-shrink-0">
                                {section.section_seq}
                            </span>
                            <span className="truncate">
                                {SECTION_TITLES_KO[section.section_seq] || section.section_name}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
}
