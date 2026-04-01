import type { FraudItem, PriceItem, ProductItem, StrategyItem, TabId } from './types';

export const TAB_DESCRIPTIONS: Record<TabId, string> = {
  products: 'Quickly review product/industry news and market trends by country.',
  strategy: 'Summarize key conclusions and action checklists from market entry strategy documents.',
  prices: 'Identify cost risks through price, commodity, and exchange rate data.',
  fraud: 'Review fraud patterns through case studies to proactively mitigate trade risks.',
};

export const COUNTRIES = ['', 'USA', 'China', 'Japan', 'Vietnam', 'India', 'Indonesia', 'Germany', 'UK', 'France'];
export const PRODUCT_KEYWORDS = ['chemicals', 'battery materials', 'semiconductor materials', 'fine chemicals', 'secondary batteries', 'catalysts'];
export const PRICE_KEYWORDS = ['prices', 'exchange rates', 'raw material prices', 'import unit price', 'distribution price'];
export const PRODUCT_SEED_KEYWORDS = ['chemicals', 'battery materials', 'semiconductor materials', 'fine chemicals', 'raw materials'];

export const DEMO_PRODUCT_ITEMS: ProductItem[] = [
  {
    newsTitl: 'US Battery Materials Supply Chain Restructuring Trends',
    cntryNm: 'USA',
    newsWrtDt: '2026-02-01',
    newsBdt: 'Supply chain diversification policies for key battery materials',
    cntntSumar: 'Diversification of lithium/nickel/precursor sourcing and expansion of local production',
    newsUrl: 'https://www.kotra.or.kr/',
    source: 'Demo',
  },
  {
    newsTitl: 'China Fine Chemical Demand Recovery Signals',
    cntryNm: 'China',
    newsWrtDt: '2026-01-20',
    newsBdt: 'Observed rebound in fine chemical intermediate demand',
    cntntSumar: 'Rising intermediate orders driven by electronics/automotive industry recovery',
    newsUrl: 'https://www.kotra.or.kr/',
    source: 'Demo',
  },
  {
    newsTitl: 'Vietnam Chemical Raw Material Import Structure Changes',
    cntryNm: 'Vietnam',
    newsWrtDt: '2026-01-12',
    newsBdt: 'Diversification of basic chemical raw material import sources underway',
    cntntSumar: 'Expansion of long-term contracts to manage price volatility',
    newsUrl: 'https://www.kotra.or.kr/',
    source: 'Demo',
  },
];

export const DEMO_STRATEGY_ITEMS: StrategyItem[] = [
  {
    title: 'US Market Entry Strategy: Preemptive Certification/Customs Approach',
    country: 'USA',
    date: '2026-01',
    summary: 'Strategy to proactively address certification and customs issues before market entry',
    url: 'https://www.kotra.or.kr/',
  },
  {
    title: 'China Market Entry Strategy: Distribution Partner Diversification',
    country: 'China',
    date: '2025-12',
    summary: 'Channel diversification strategy to reduce single-partner dependency',
    url: 'https://www.kotra.or.kr/',
  },
];

export const DEMO_PRICE_ITEMS: PriceItem[] = [
  {
    itemName: 'Electrolyte Raw Material',
    price: '128',
    unit: 'kg',
    country: 'USA',
    currency: 'USD',
    category: 'Sample Price Data',
    date: '2026-02',
    newsUrl: 'https://www.kotra.or.kr/',
    source: 'Demo',
  },
  {
    itemName: 'Fine Chemical Additive',
    price: '92',
    unit: 'kg',
    country: 'China',
    currency: 'USD',
    category: 'Sample Price Data',
    date: '2026-02',
    newsUrl: 'https://www.kotra.or.kr/',
    source: 'Demo',
  },
];

export const DEMO_FRAUD_ITEMS: FraudItem[] = [
  {
    title: 'Fake Purchase Order / Advance Payment Fraud Case',
    country: 'Southeast Asia',
    category: 'Payment/Advance',
    date: '2025-11',
    content: 'Urgent shipment requests and advance payment demands from new buyers require document verification before response',
    url: 'https://www.kotra.or.kr/',
  },
  {
    title: 'Shipping Document Forgery-Based Trade Fraud',
    country: 'Middle East',
    category: 'Document Forgery',
    date: '2025-10',
    content: 'Verification procedures for key shipping documents (BL, invoices, etc.) are essential',
    url: 'https://www.kotra.or.kr/',
  },
];
