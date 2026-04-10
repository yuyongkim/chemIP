export interface SectionContent {
  [key: string]: string;
}

export interface Section {
  section_seq: number;
  section_name: string;
  content: SectionContent[];
}

export interface EnglishSafety {
  cas_no: string | null;
  name_en: string | null;
  pubchem_cid: number | null;
  signal_word: string;
  ghs_classification: string[];
  hazard_statements: string[];
  precautionary_statements: string[];
  pictograms: string[];
  last_updated: string | null;
}

export interface ChemicalDetailData {
  chem_id: string;
  sections: Section[];
  english_safety?: EnglishSafety | null;
  is_kosha?: boolean;
  name?: string;
  name_en?: string;
  cas_no?: string;
  source?: string;
}

export interface GuideRecommendation {
  guide_no: string;
  title: string;
  ofanc_ymd?: string;
  score: number;
  match_terms: string[];
  match_fields?: string[];
  guide_cas_numbers?: string[];
  guide_keywords?: string[];
  snippet?: string;
  text_preview?: string;
  file_download_url?: string;
  source?: string;
  updated_at?: string;
}

export interface DrugMfdsItem {
  ITEM_SEQ?: string;
  ITEM_NAME?: string;
  ENTP_NAME?: string;
  ITEM_IMAGE?: string;
  efcyQesitm?: string;
  useMethodQesitm?: string;
  atpnQesitm?: string;
  seQesitm?: string;
  [key: string]: string | undefined;
}

export interface DrugFdaItem {
  id?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    substance_name?: string[];
  };
  indications_and_usage?: string[];
  warnings?: string[];
  [key: string]: unknown;
}

export interface DrugPubmedArticle {
  pmid: string;
  title: string;
  pubdate: string;
  source: string;
  authors: string[];
}

export interface ChemicalDrugsResponse {
  chem_id: string;
  cached: boolean;
  mfds: DrugMfdsItem[];
  openfda: DrugFdaItem[];
  pubmed: DrugPubmedArticle[];
}

export type ChemicalDetailTab = 'msds' | 'bilingual' | 'patents' | 'market' | 'guides' | 'drugs' | 'regulation' | 'ai';
