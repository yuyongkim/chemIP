'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical, Globe2, Pill, FileText, BookOpen } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function Navbar() {
    const { locale, setLocale, t } = useI18n();
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/' || pathname.startsWith('/chemical');
        return pathname.startsWith(href);
    };

    const navLinkClass = (href: string) =>
        `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            isActive(href)
                ? 'text-[#1e3a5f] bg-slate-100'
                : 'text-gray-600 hover:text-[#1e3a5f] hover:bg-slate-50'
        }`;

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="p-2 bg-[#1e3a5f] rounded-xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                            <FlaskConical className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
                                ChemIP
                            </span>
                            <span className="text-[10px] font-semibold text-gray-400 leading-tight tracking-[0.12em] lowercase">
                                platform
                            </span>
                        </div>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/" className={navLinkClass('/')}>
                            <FlaskConical className="w-4 h-4" />
                            {t('nav.chemicals')}
                        </Link>
                        <Link href="/drugs" className={navLinkClass('/drugs')}>
                            <Pill className="w-4 h-4" />
                            {t('nav.drugs')}
                        </Link>
                        <Link href="/trade" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            isActive('/trade')
                                ? 'text-emerald-600 bg-emerald-50/80'
                                : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50/80'
                        }`}>
                            <Globe2 className="w-4 h-4" />
                            {t('nav.trade')}
                        </Link>
                        <Link href="/guide" className={navLinkClass('/guide')}>
                            <BookOpen className="w-4 h-4" />
                            {t('nav.guides')}
                        </Link>
                        <div className="w-px h-6 bg-gray-200 mx-1" />
                        <Link href="/docs" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            isActive('/docs')
                                ? 'text-gray-700 bg-gray-100'
                                : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'
                        }`}>
                            <FileText className="w-4 h-4" />
                            {t('nav.docs')}
                        </Link>

                        {/* Language Toggle */}
                        <div className="w-px h-6 bg-gray-200 mx-1" />
                        <button
                            onClick={() => setLocale(locale === 'en' ? 'ko' : 'en')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                            title={locale === 'en' ? 'Switch to Korean' : 'Switch to English'}
                        >
                            <Globe2 className="w-3.5 h-3.5 text-gray-500" />
                            <span className={locale === 'ko' ? 'text-blue-600' : 'text-gray-400'}>KO</span>
                            <span className="text-gray-300">/</span>
                            <span className={locale === 'en' ? 'text-blue-600' : 'text-gray-400'}>EN</span>
                        </button>
                    </div>

                    {/* Mobile nav */}
                    <div className="md:hidden flex items-center gap-2">
                        <Link href="/drugs" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all" aria-label={t('nav.drugs')}>
                            <Pill className="w-5 h-5" />
                        </Link>
                        <Link href="/trade" className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all" aria-label={t('nav.trade')}>
                            <Globe2 className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={() => setLocale(locale === 'en' ? 'ko' : 'en')}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 transition-all"
                        >
                            {locale === 'en' ? 'KO' : 'EN'}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
