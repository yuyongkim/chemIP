export interface Patent {
  patent_id?: string;
  applicationNumber?: string;
  title?: string;
  inventionTitle?: string;
  source?: string;
  jurisdiction?: string;
  section?: string;
  matched_term?: string;
  snippet?: string | null;
  category?: string;
  file_path?: string;
  applicantName?: string;
  applicationDate?: string;
  registerStatus?: string;
  abstract?: string;
}

export interface SearchResponse {
  query: string;
  results: Patent[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ChemicalResolution {
  chem_id: string;
  name: string;
  name_en?: string | null;
  cas_no?: string | null;
  source?: string | null;
}

export interface ChemicalSearchItem extends ChemicalResolution {
  id: number;
  has_msds?: boolean;
}
