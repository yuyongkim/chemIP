'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'ko' | 'en';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

// ── Translation dictionaries ──

const en: Record<string, string> = {
  // Navbar
  'nav.chemicals': 'Chemicals',
  'nav.drugs': 'Drugs',
  'nav.trade': 'Trade',
  'nav.guides': 'Guides',
  'nav.docs': 'Docs',

  // Home Hero
  'home.badge': 'Unified Chemical Intelligence',
  'home.title': 'Chemical Safety & IP Research Platform',
  'home.subtitle': 'Search MSDS, patents, trade data, and drug information in one place.',
  'home.search.placeholder': 'Search by chemical name, CAS number, or English name...',
  'home.tab.chemicals': 'Chemicals',
  'home.tab.drugs': 'Drugs',
  'home.landing.title': 'Explore Chemical Intelligence',
  'home.landing.subtitle': 'Start by searching for a chemical name or CAS number above.',
  'home.noResults': 'No chemical results found for',
  'home.noResults.hint': 'Try cross-checking in the Drugs tab.',

  // Chemical Detail Tabs
  'chem.tab.msds': 'MSDS',
  'chem.tab.patents': 'Patents',
  'chem.tab.market': 'Market',
  'chem.tab.drugs': 'Drugs',
  'chem.tab.guides': 'Guides',
  'chem.tab.regulations': 'KR Regulation',
  'chem.tab.ai': 'AI Analysis',
  'chem.back': 'Back to Search',
  'chem.bilingual': 'Bilingual View',

  // Trade
  'trade.badge': 'Global Market Intelligence',
  'trade.title': 'KOTRA Trade Data Analysis Hub',
  'trade.subtitle': 'A unified view of news, strategies, pricing, and fraud risk for market entry decision-making.',
  'trade.tab.products': 'Products DB',
  'trade.tab.strategy': 'Market Strategy',
  'trade.tab.prices': 'Price Info',
  'trade.tab.fraud': 'Fraud Cases',
  'trade.current': 'Current Analysis Section',
  'trade.total': 'Total',
  'trade.countries': 'Countries',
  'trade.filter': 'Current Filter',

  // Drugs
  'drugs.title': 'Pharmaceutical Database',
  'drugs.subtitle': 'Search Korean drug approvals, US FDA labels, and PubMed research.',
  'drugs.tab.mfds': 'MFDS (Korea)',
  'drugs.tab.fda': 'OpenFDA (US)',
  'drugs.tab.pubmed': 'PubMed',
  'drugs.noResults': 'No results found.',

  // Guide
  'guide.badge': 'Developer Operations',
  'guide.title': 'Operations Guide',
  'guide.subtitle': 'Deployment, database management, and team onboarding workflows for the ChemIP platform.',
  'guide.git': 'Git Repository Structure',
  'guide.tracked': 'Tracked in Git',
  'guide.excluded': 'Excluded from Git',
  'guide.db': '140GB Database Sharing',
  'guide.backend': 'Backend Operations',
  'guide.onboarding': 'Team Onboarding',
  'guide.checklist': 'Pre-push Checklist',
  'guide.beforePush': 'Before Git Push',
  'guide.newMember': 'New Member Setup',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'An error occurred.',
  'common.page': 'Page',
  'common.of': 'of',
  'common.prev': 'Previous',
  'common.next': 'Next',
  'common.search': 'Search',
  'common.allCountries': 'All Countries',
  'common.development': 'Development',
  'common.production': 'Production (Docker)',
};

const ko: Record<string, string> = {
  // Navbar
  'nav.chemicals': '화학물질',
  'nav.drugs': '의약품',
  'nav.trade': '무역',
  'nav.guides': '가이드',
  'nav.docs': '문서',

  // Home Hero
  'home.badge': '통합 화학물질 인텔리전스',
  'home.title': '화학 안전 및 지식재산 연구 플랫폼',
  'home.subtitle': 'MSDS, 특허, 무역 데이터, 의약품 정보를 한 곳에서 검색하세요.',
  'home.search.placeholder': '화학물질명, CAS 번호, 영문명으로 검색...',
  'home.tab.chemicals': '화학물질',
  'home.tab.drugs': '의약품',
  'home.landing.title': '화학물질 인텔리전스 탐색',
  'home.landing.subtitle': '위 검색창에서 화학물질명 또는 CAS 번호를 검색해보세요.',
  'home.noResults': '검색 결과 없음:',
  'home.noResults.hint': '의약품 탭에서도 확인해보세요.',

  // Chemical Detail Tabs
  'chem.tab.msds': 'MSDS',
  'chem.tab.patents': '특허',
  'chem.tab.market': '시장',
  'chem.tab.drugs': '의약품',
  'chem.tab.guides': '가이드',
  'chem.tab.regulations': '한국 규제',
  'chem.tab.ai': 'AI 분석',
  'chem.back': '검색으로 돌아가기',
  'chem.bilingual': '이중 언어 보기',

  // Trade
  'trade.badge': '글로벌 시장 인텔리전스',
  'trade.title': 'KOTRA 무역 데이터 분석 허브',
  'trade.subtitle': '시장 진출 의사결정을 위한 뉴스, 전략, 가격, 사기 리스크 통합 분석.',
  'trade.tab.products': '상품 DB',
  'trade.tab.strategy': '시장 전략',
  'trade.tab.prices': '가격 정보',
  'trade.tab.fraud': '사기 사례',
  'trade.current': '현재 분석 섹션',
  'trade.total': '전체',
  'trade.countries': '국가 수',
  'trade.filter': '현재 필터',

  // Drugs
  'drugs.title': '의약품 데이터베이스',
  'drugs.subtitle': '한국 의약품 허가정보, 미국 FDA 라벨, PubMed 논문을 검색합니다.',
  'drugs.tab.mfds': '식약처 (한국)',
  'drugs.tab.fda': 'OpenFDA (미국)',
  'drugs.tab.pubmed': 'PubMed',
  'drugs.noResults': '검색 결과가 없습니다.',

  // Guide
  'guide.badge': '개발 운영',
  'guide.title': '운영 가이드',
  'guide.subtitle': 'ChemIP 플랫폼의 배포, 데이터베이스 관리, 팀 온보딩 워크플로우.',
  'guide.git': 'Git 저장소 구조',
  'guide.tracked': 'Git에 포함',
  'guide.excluded': 'Git에서 제외',
  'guide.db': '140GB 데이터베이스 공유',
  'guide.backend': '백엔드 운영',
  'guide.onboarding': '팀 온보딩',
  'guide.checklist': '푸시 전 체크리스트',
  'guide.beforePush': 'Git Push 전',
  'guide.newMember': '신규 멤버 설정',

  // Common
  'common.loading': '로딩 중...',
  'common.error': '오류가 발생했습니다.',
  'common.page': '페이지',
  'common.of': '/',
  'common.prev': '이전',
  'common.next': '다음',
  'common.search': '검색',
  'common.allCountries': '전체 국가',
  'common.development': '개발 환경',
  'common.production': '운영 환경 (Docker)',
};

const dictionaries: Record<Locale, Record<string, string>> = { en, ko };

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('chemip-locale') as Locale | null;
    if (saved && (saved === 'ko' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('chemip-locale', l);
  };

  const t = (key: string): string => {
    return dictionaries[locale][key] || dictionaries['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
