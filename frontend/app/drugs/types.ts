export interface ApprovalItem {
  itemName: string;
  entpName: string;
  itemSeq: string;
  chart: string;
  materialName: string;
  storageMethod: string;
  validTerm: string;
  cancelName: string;
  itemImage: string;
}

export interface EasyInfoItem {
  itemName: string;
  entpName: string;
  efcyQesitm: string;
  useMethodQesitm: string;
  atpnWarnQesitm: string;
  atpnQesitm: string;
  intrcQesitm: string;
  seQesitm: string;
  depositMethodQesitm: string;
  itemImage: string;
}

export interface DrugSearchResult {
  query: string;
  approval: { total: number; items: ApprovalItem[] };
  easyInfo: { total: number; items: EasyInfoItem[] };
}

export interface OpenFDAItem {
  purpose?: string[];
  warnings?: string[];
  indications_and_usage?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    substance_name?: string[];
  };
}

export interface OpenFDAResponse {
  query: string;
  query_used: string;
  total: number;
  items: OpenFDAItem[];
}

export interface PubMedArticle {
  pmid: string;
  title: string;
  pubdate: string;
  source: string;
  authors: string[];
}

export interface PubMedResponse {
  query: string;
  count: number;
  ids: string[];
  articles: PubMedArticle[];
}

export type DrugTab = 'approval' | 'easy' | 'openfda' | 'pubmed' | 'related_patents' | 'related_market';
