'use client';

import Link from 'next/link';
import { ArrowUpRight, Pill, Shield, Globe2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

import StatsSection from '@/components/StatsSection';

export default function HomeLandingPanels() {
  const { locale } = useI18n();

  return (
    <div className="space-y-10">
      <StatsSection />

      <section className="stagger-in space-y-5">
        <Link
          href="/"
          className="group relative block rounded-[28px] border border-slate-200 bg-white px-8 py-8 hover:border-[#1e3a5f]/20 hover:shadow-[0_12px_32px_rgba(30,58,95,0.08)] active:scale-[0.995] transition-all duration-200"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#1e3a5f]">
                <Shield className="w-3.5 h-3.5" />
                {locale === 'ko' ? '핵심 워크플로우' : 'Core workflow'}
              </div>
              <h3 className="text-2xl font-bold tracking-[-0.025em] text-slate-900">
                {locale === 'ko' ? 'KOSHA MSDS를 중심으로 화학안전 정보를 한 화면에서 확인합니다.' : 'Start with KOSHA MSDS, then branch into patents, trade, and regulation.'}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                {locale === 'ko'
                  ? '공식 16개 섹션 원문, GHS 분류, 응급조치, 노출방지 정보를 먼저 읽고 바로 다음 조사 단계로 이어집니다.'
                  : 'Read the official 16 sections first, then move directly into GHS classification, handling guidance, patents, and downstream research.'}
              </p>
            </div>
            <div className="md:min-w-[220px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {locale === 'ko' ? '바로 시작' : 'Start here'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
                  <span>{locale === 'ko' ? 'MSDS 검색 시작' : 'Open MSDS search'}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {locale === 'ko' ? 'GHS 분류, 유해위험성, 취급 저장, 노출방지까지 바로 이어집니다.' : 'Move from hazard data to handling, storage, and exposure controls without switching tools.'}
                </p>
              </div>
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/drugs"
            className="group relative rounded-[24px] border border-slate-200 bg-white px-6 py-6 hover:border-emerald-200 hover:shadow-[0_10px_28px_rgba(30,58,95,0.08)] active:scale-[0.99] transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  {locale === 'ko' ? '의약품 연계' : 'Drug intelligence'}
                </p>
                <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-slate-900">
                  {locale === 'ko' ? 'MFDS, OpenFDA, PubMed를 한 번에 조회합니다.' : 'Search MFDS, OpenFDA, and PubMed in one pass.'}
                </h3>
              </div>
              <Pill className="mt-1 w-5 h-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {locale === 'ko'
                ? '허가 정보, 라벨, 논문 요약을 이어서 읽을 수 있어 독성, 적응증, 최신 근거를 함께 검토할 수 있습니다.'
                : 'Read approvals, labels, and literature side by side, then move straight into toxicity and indication review.'}
            </p>
            <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-1.5 transition-all duration-200">
              {locale === 'ko' ? '의약품 검색' : 'Explore drug data'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/trade"
            className="group relative rounded-[24px] border border-slate-200 bg-white px-6 py-6 hover:border-cyan-200 hover:shadow-[0_10px_28px_rgba(30,58,95,0.08)] active:scale-[0.99] transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
                  {locale === 'ko' ? '시장 검증' : 'Market context'}
                </p>
                <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-slate-900">
                  {locale === 'ko' ? 'KOTRA 기반 시장 뉴스와 가격 흐름을 함께 봅니다.' : 'Pair KOTRA market updates with pricing and fraud signals.'}
                </h3>
              </div>
              <Globe2 className="mt-1 w-5 h-5 text-cyan-600" />
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {locale === 'ko'
                ? '국가별 전략 문서, 가격 동향, 사기 사례를 묶어 검토해 진출 판단의 속도를 높입니다.'
                : 'Review country strategy notes, price movement, and fraud cases together before making a market-entry call.'}
            </p>
            <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-cyan-700 group-hover:gap-1.5 transition-all duration-200">
              {locale === 'ko' ? '무역 데이터 보기' : 'Review trade data'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

