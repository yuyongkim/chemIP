import Link from 'next/link';
import { ArrowUpRight, FlaskConical, Pill, Shield, Globe2 } from 'lucide-react';

import StatsSection from '@/components/StatsSection';

export default function HomeLandingPanels() {
  return (
    <div className="space-y-10">
      <StatsSection />

      <section className="stagger-in space-y-5">
        {/* Primary: KOSHA MSDS — full width, prominent */}
        <Link
          href="/"
          className="group relative block bg-white p-8 rounded-2xl border border-gray-100 hover:border-[#1e3a5f]/20 hover:shadow-[0_8px_24px_rgba(30,58,95,0.06)] active:scale-[0.995] transition-all duration-200"
        >
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors duration-200">
              <Shield className="w-6 h-6 text-[#1e3a5f]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">KOSHA MSDS 검색</h3>
                <span className="text-[10px] font-semibold text-[#1e3a5f] bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">핵심 기능</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-lg">한국산업안전보건공단(KOSHA) 공식 물질안전보건자료 48,963종의 16개 섹션 전문을 조회하고, 관련 특허/무역/규제 정보를 교차 분석합니다.</p>
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="flex items-center gap-1 text-[#1e3a5f] text-sm font-semibold group-hover:gap-1.5 transition-all duration-200 whitespace-nowrap">
                  MSDS 검색 시작
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-gray-400">GHS 분류 · 유해위험성 · 취급 저장 · 노출방지</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Secondary row: Drug + Patent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/drugs"
            className="group relative bg-white p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-[0_8px_24px_rgba(30,58,95,0.06)] active:scale-[0.99] transition-all duration-200"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors duration-200">
              <Pill className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1 tracking-tight whitespace-nowrap">의약품 통합 검색</h3>
            <p className="text-sm text-gray-500 leading-relaxed">MFDS 허가/일반의약품 · OpenFDA · PubMed 논문을 통합 조회합니다.</p>
            <div className="flex items-center gap-1 mt-4 text-emerald-600 text-sm font-semibold group-hover:gap-1.5 transition-all duration-200 whitespace-nowrap">
              의약품 검색
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/trade"
            className="group relative bg-white p-6 rounded-2xl border border-gray-100 hover:border-cyan-200 hover:shadow-[0_8px_24px_rgba(30,58,95,0.06)] active:scale-[0.99] transition-all duration-200"
          >
            <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-cyan-100 transition-colors duration-200">
              <Globe2 className="w-5 h-5 text-cyan-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1 tracking-tight whitespace-nowrap">무역 · 시장 정보</h3>
            <p className="text-sm text-gray-500 leading-relaxed">KOTRA 해외시장뉴스, 가격동향, 진출전략, 무역사기 정보를 분석합니다.</p>
            <div className="flex items-center gap-1 mt-4 text-cyan-600 text-sm font-semibold group-hover:gap-1.5 transition-all duration-200 whitespace-nowrap">
              무역 데이터
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
