'use client';

import SearchBar from '@/components/SearchBar';
import PopularChemicals from '@/components/PopularChemicals';
import { Shield, FlaskConical, Globe2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface HomeHeroProps {
  initialQuery: string;
  onSearch: (query: string) => void;
}

export default function HomeHero({ initialQuery, onSearch }: HomeHeroProps) {
  const { locale } = useI18n();

  return (
    <div id="main-content" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-gray-50/50" />
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] bg-blue-100/25 rounded-full blur-3xl" />
      <div className="absolute bottom-[-100px] left-[-50px] w-[400px] h-[400px] bg-slate-100/40 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[#1e3a5f] text-xs font-semibold mb-6 tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            {locale === 'ko' ? 'KOSHA 공식 MSDS 기반' : 'Powered by KOSHA official MSDS'}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-[-0.025em] mb-5 leading-[1.08]">
            {locale === 'ko' ? (
              <>
                한국 MSDS
                <br />
                <span className="text-[#1e3a5f]">
                  통합 안전 정보 플랫폼
                </span>
              </>
            ) : (
              <>
                Korean MSDS
                <br />
                <span className="text-[#1e3a5f]">
                  safety intelligence platform
                </span>
              </>
            )}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            {locale === 'ko' ? (
              <>
                KOSHA 물질안전보건자료 16개 섹션 전문과
                <br className="hidden sm:block" />
                특허, 무역, 의약품, 규제 정보를 한 번에 조회합니다.
              </>
            ) : (
              <>
                Full 16-section KOSHA MSDS data with integrated{' '}
                <br className="hidden sm:block" />
                patent, trade, drug, and regulatory intelligence.
              </>
            )}
          </p>

          <SearchBar onSearch={onSearch} initialValue={initialQuery} />
          <PopularChemicals onSearch={onSearch} />

          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>{locale === 'ko' ? 'KOSHA 13,448종 MSDS' : 'KOSHA 13,448 MSDS'}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{locale === 'ko' ? '16개 안전 섹션 전문' : '16 safety sections'}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              <span>{locale === 'ko' ? '3.5억+ 특허 연동' : '350M+ patents linked'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
