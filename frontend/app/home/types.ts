export interface Chemical {
  id: number;
  name: string;
  cas_no: string;
  chem_id: string | null;
  name_en?: string;
  source?: string;
  has_msds?: boolean;
}

export interface ChemSearchResult {
  items: Chemical[];
  total: number;
}

export interface DrugItem {
  itemName: string;
  entpName: string;
  efcyQesitm?: string;
}

export interface DrugEasyResult {
  items: DrugItem[];
  total: number;
}

export interface FdaItem {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
  };
  indications_and_usage?: string[];
}

export interface PubmedArticle {
  pmid: string;
  title: string;
  pubdate: string;
  source: string;
  authors: string[];
}

export interface UnifiedDrugResult {
  query: string;
  mfds: { total: number; items: DrugItem[] };
  openfda: { total: number; items: FdaItem[] };
  pubmed: { count: number; articles: PubmedArticle[] };
}

export type HomeTab = 'chemicals' | 'drugs';
