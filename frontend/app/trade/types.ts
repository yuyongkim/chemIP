import type { ReactNode } from 'react';

export type TabId = 'products' | 'strategy' | 'prices' | 'fraud';

export type StrategyPanel = 'checklist' | 'coverage' | 'documents';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: ReactNode;
}

export interface ProductItem {
  newsTitl: string;
  cntryNm: string;
  newsWrtDt: string;
  kotraNewsUrl?: string;
  newsUrl?: string;
  newsBdt?: string;
  cntntSumar?: string;
  source?: string;
}

export interface StrategyItem {
  title: string;
  country: string;
  date: string;
  url?: string;
  summary?: string;
}

export interface PriceItem {
  itemName: string;
  price: string;
  unit?: string;
  country?: string;
  currency?: string;
  category?: string;
  newsUrl?: string;
  date?: string;
  source?: string;
}

export interface FraudItem {
  title: string;
  content?: string;
  plainText?: string;
  date?: string;
  incidentPeriod?: string;
  country?: string;
  category?: string;
  amount?: string;
  url?: string;
}

export interface SafeJsonResult {
  ok: boolean;
  status: number;
  data: unknown;
  errorText: string;
}
