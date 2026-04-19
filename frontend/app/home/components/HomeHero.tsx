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
    <section id="main-content" className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_56%,#f8fafc_100%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[#1e3a5f] text-xs font-semibold mb-6 tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            {locale === 'ko' ? 'Powered by KOSHA official MSDS' : 'Powered by KOSHA official MSDS'}
          </div>

          <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-[-0.03em] mb-5 leading-[1.02]">
            {locale === 'ko' ? (
              <>
                한국 MSDS
                <span className="block text-[#1e3a5f]">안전 인텔리전스 플랫폼</span>
              </>
            ) : (
              <>
                Korean MSDS
                <span className="block text-[#1e3a5f]">safety intelligence platform</span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 mb-10 max-w-2xl leading-relaxed">
            {locale === 'ko' ? (
              <>
                <span className="font-semibold text-slate-800">48,963건</span>의 KOSHA MSDS 원문과
                <br className="hidden sm:block" />
                특허, 무역, 의약품, 규제 맥락을 한 흐름으로 이어서 확인합니다.
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800">48,963</span> full KOSHA MSDS records
                <br className="hidden sm:block" />
                with integrated patent, trade, drug, and regulatory intelligence.
              </>
            )}
          </p>

          <SearchBar onSearch={onSearch} initialValue={initialQuery} />
          <PopularChemicals onSearch={onSearch} />

          <div className="mt-10 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2">
              <Shield className="w-3.5 h-3.5" />
              <span>{locale === 'ko' ? 'KOSHA MSDS 48,963건' : '48,963 KOSHA MSDS records'}</span>
            </div>
            <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{locale === 'ko' ? '117,744개 화학물질 인덱스' : '117,744 chemicals indexed'}</span>
            </div>
            <div className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2">
              <Globe2 className="w-3.5 h-3.5" />
              <span>{locale === 'ko' ? '3.5억+ 특허 연계' : '350M+ patents linked'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
