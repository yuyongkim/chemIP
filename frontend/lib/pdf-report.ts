/**
 * Comprehensive Chemical PDF Report Generator
 *
 * Fetches all available data for a chemical and generates a multi-section PDF:
 *   1. Chemical Identity
 *   2. GHS / Bilingual Safety
 *   3. MSDS Sections (KOSHA)
 *   4. Korean Regulations (KISCHEM + NCIS)
 *   5. AI Analysis
 *   6. Patent Summary
 *   7. Guide Recommendations
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fetchJsonSafe } from './http';

// ── Types ────────────────────────────────────────────────────────────

interface ChemicalMeta {
  chem_id: string;
  name?: string;
  name_en?: string;
  cas_no?: string;
  source?: string;
  is_kosha?: boolean;
}

interface EnglishSafety {
  signal_word: string;
  ghs_classification: string[];
  hazard_statements: string[];
  precautionary_statements: string[];
  pictograms: string[];
  cas_no: string | null;
  name_en: string | null;
  pubchem_cid: number | null;
}

interface MsdsSection {
  section_seq: number;
  section_name: string;
  content: Record<string, string>[];
}

interface AIAnalysis {
  analysis?: string;
  confidence?: number;
  sources?: { type: string; title: string; snippet?: string }[];
}

interface KischemItem {
  name_ko?: string;
  name_en?: string;
  cas_no?: string;
  symptom?: string;
  inhale?: string;
  skin?: string;
  eye?: string;
  oral?: string;
  [k: string]: unknown;
}

interface NcisItem {
  cas_no?: string;
  name_ko?: string;
  name_en?: string;
  molecular_formula?: string;
  molecular_weight?: string;
  classifications?: string[];
  [k: string]: unknown;
}

interface Patent {
  inventionTitle?: string;
  title?: string;
  applicantName?: string;
  applicationDate?: string;
  registerStatus?: string;
  jurisdiction?: string;
  category?: string;
}

interface GuideRec {
  guide_no: string;
  title: string;
  score: number;
  match_terms?: string[];
}

// ── Data fetcher ─────────────────────────────────────────────────────

interface ReportData {
  meta: ChemicalMeta;
  english_safety: EnglishSafety | null;
  sections: MsdsSection[];
  ai: AIAnalysis | null;
  kischem: KischemItem[];
  ncis: NcisItem[];
  patents: Patent[];
  guides: GuideRec[];
}

async function fetchReportData(
  chemId: string,
  chemicalName: string,
  existingData: { sections?: MsdsSection[]; english_safety?: EnglishSafety | null; meta?: ChemicalMeta },
): Promise<ReportData> {
  const meta: ChemicalMeta = existingData.meta || { chem_id: chemId };
  const sections = existingData.sections || [];
  const english_safety = existingData.english_safety || null;

  // Parallel fetches
  const casNo = meta.cas_no || '';
  const searchQ = encodeURIComponent(chemicalName);

  const [aiRes, kischemRes, ncisRes, patentRes, guideRes] = await Promise.allSettled([
    fetchJsonSafe<AIAnalysis>('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chemId, chemicalName }),
    }),
    fetchJsonSafe<{ items?: KischemItem[] }>(
      casNo
        ? `/api/regulations/kischem/cas/${encodeURIComponent(casNo)}`
        : `/api/regulations/kischem/search?q=${searchQ}`,
    ),
    fetchJsonSafe<{ items?: NcisItem[] }>(
      casNo
        ? `/api/regulations/ncis/cas/${encodeURIComponent(casNo)}`
        : `/api/regulations/ncis/search?q=${searchQ}`,
    ),
    fetchJsonSafe<{ patents?: Patent[]; items?: Patent[] }>(
      `/api/patents/global/${encodeURIComponent(chemId)}?limit=50`,
    ),
    fetchJsonSafe<{ recommendations?: GuideRec[] }>(
      `/api/guides/recommend/${encodeURIComponent(chemId)}?limit=8`,
    ),
  ]);

  const ai = aiRes.status === 'fulfilled' && aiRes.value.ok ? aiRes.value.data : null;
  const kischem =
    kischemRes.status === 'fulfilled' && kischemRes.value.ok
      ? (kischemRes.value.data?.items ?? [])
      : [];
  const ncis =
    ncisRes.status === 'fulfilled' && ncisRes.value.ok
      ? (ncisRes.value.data?.items ?? [])
      : [];
  const patentData =
    patentRes.status === 'fulfilled' && patentRes.value.ok ? patentRes.value.data : null;
  const patents = patentData?.patents ?? patentData?.items ?? [];
  const guides =
    guideRes.status === 'fulfilled' && guideRes.value.ok
      ? (guideRes.value.data?.recommendations ?? [])
      : [];

  return { meta, english_safety, sections, ai, kischem, ncis, patents, guides };
}

// ── PDF Builder ──────────────────────────────────────────────────────

const PAGE_W = 210; // A4 mm
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BRAND_COLOR: [number, number, number] = [30, 58, 95]; // #1e3a5f
const LIGHT_BG: [number, number, number] = [245, 247, 250];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any;

function addPageFooter(doc: jsPDF) {
  const pageCount = (doc as AnyDoc).getNumberOfPages() as number;
  for (let i = 1; i <= pageCount; i++) {
    (doc as AnyDoc).setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_W / 2, 290, { align: 'center' });
    doc.text('ChemIP Report', MARGIN, 290);
    doc.text(new Date().toLocaleDateString('en-US'), PAGE_W - MARGIN, 290, { align: 'right' });
  }
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 1.5, MARGIN + CONTENT_W, y + 1.5);
  return y + 8;
}

function bodyText(doc: jsPDF, y: number, text: string, fontSize = 9): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(50);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, MARGIN, y);
    y += fontSize * 0.45;
  }
  return y + 2;
}

function labelValue(doc: jsPDF, y: number, label: string, value: string): number {
  if (y > 275) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(label + ':', MARGIN, y);
  doc.setTextColor(50);
  const valLines = doc.splitTextToSize(value || 'N/A', CONTENT_W - 40);
  doc.text(valLines, MARGIN + 38, y);
  return y + Math.max(valLines.length * 4, 5) + 1;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s{2,}/g, ' ').trim();
}

function buildPdf(data: ReportData, chemicalName: string): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;

  // ── Cover / Title ──
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, PAGE_W, 50, 'F');
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.text('Chemical Safety Report', MARGIN, 25);
  doc.setFontSize(12);
  doc.text(chemicalName, MARGIN, 35);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, MARGIN, 44);
  y = 60;

  // ── 1. Chemical Identity ──
  y = sectionTitle(doc, y, '1. Chemical Identity');
  y = labelValue(doc, y, 'Chemical ID', data.meta.chem_id);
  if (data.meta.name) y = labelValue(doc, y, 'Name (KR)', data.meta.name);
  if (data.meta.name_en) y = labelValue(doc, y, 'Name (EN)', data.meta.name_en);
  if (data.meta.cas_no) y = labelValue(doc, y, 'CAS No.', data.meta.cas_no);
  if (data.meta.source) y = labelValue(doc, y, 'Source', data.meta.source);
  y = labelValue(doc, y, 'Has MSDS', data.meta.is_kosha !== false ? 'Yes (KOSHA)' : 'No');
  y += 4;

  // ── 2. GHS / Bilingual Safety ──
  if (data.english_safety) {
    y = sectionTitle(doc, y, '2. GHS Safety Classification (PubChem)');
    const es = data.english_safety;
    y = labelValue(doc, y, 'Signal Word', es.signal_word);
    if (es.pubchem_cid) y = labelValue(doc, y, 'PubChem CID', String(es.pubchem_cid));

    if (es.ghs_classification.length) {
      y = labelValue(doc, y, 'GHS Classifications', es.ghs_classification.join('; '));
    }
    if (es.hazard_statements.length) {
      y += 2;
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR);
      doc.text('Hazard Statements:', MARGIN, y);
      y += 4;
      for (const h of es.hazard_statements) {
        y = bodyText(doc, y, `  - ${h}`);
      }
    }
    if (es.precautionary_statements.length) {
      y += 1;
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR);
      doc.text('Precautionary Statements:', MARGIN, y);
      y += 4;
      for (const p of es.precautionary_statements) {
        y = bodyText(doc, y, `  - ${p}`);
      }
    }
    y += 4;
  }

  // ── 3. MSDS Sections (KOSHA) ──
  if (data.sections.length > 0) {
    y = sectionTitle(doc, y, '3. MSDS Sections (KOSHA)');
    for (const section of data.sections) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLOR);
      doc.text(`${section.section_seq}. ${section.section_name}`, MARGIN, y);
      y += 5;

      for (const item of section.content) {
        const label = item.msdsItemNameKor || item.msdsItemNameEng || '';
        const detail = stripHtml(item.itemDetail || '');
        if (label || detail) {
          if (label) {
            y = labelValue(doc, y, label, detail);
          } else {
            y = bodyText(doc, y, detail);
          }
        }
      }
      y += 3;
    }
    y += 2;
  }

  // ── 4. Korean Regulations ──
  if (data.kischem.length > 0 || data.ncis.length > 0) {
    y = sectionTitle(doc, y, '4. Korean Regulations');

    if (data.kischem.length > 0) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLOR);
      doc.text('KISCHEM (Chemical Safety Data)', MARGIN, y);
      y += 5;

      const kischemRows = data.kischem.slice(0, 10).map((k) => [
        k.name_ko || k.name_en || '',
        k.cas_no || '',
        k.symptom || '',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Name', 'CAS', 'Symptoms']],
        body: kischemRows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: LIGHT_BG },
        tableWidth: CONTENT_W,
      });
      y = (doc as AnyDoc).lastAutoTable?.finalY ?? y + 30;
      y += 6;
    }

    if (data.ncis.length > 0) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLOR);
      doc.text('NCIS (National Chemical Information System)', MARGIN, y);
      y += 5;

      const ncisRows = data.ncis.slice(0, 10).map((n) => [
        n.name_ko || n.name_en || '',
        n.cas_no || '',
        n.molecular_formula || '',
        (n.classifications || []).join(', '),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Name', 'CAS', 'Formula', 'Classifications']],
        body: ncisRows,
        margin: { left: MARGIN, right: MARGIN },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: LIGHT_BG },
        tableWidth: CONTENT_W,
      });
      y = (doc as AnyDoc).lastAutoTable?.finalY ?? y + 30;
      y += 6;
    }
  }

  // ── 5. AI Analysis ──
  if (data.ai?.analysis) {
    y = sectionTitle(doc, y, '5. AI Analysis');
    if (data.ai.confidence != null) {
      y = labelValue(doc, y, 'Confidence', `${Math.round(data.ai.confidence * 100)}%`);
    }
    y = bodyText(doc, y, data.ai.analysis);

    if (data.ai.sources && data.ai.sources.length > 0) {
      y += 3;
      doc.setFontSize(9);
      doc.setTextColor(...BRAND_COLOR);
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text('Sources:', MARGIN, y);
      y += 4;
      for (const src of data.ai.sources.slice(0, 10)) {
        y = bodyText(doc, y, `  - [${src.type}] ${src.title}`);
      }
    }
    y += 4;
  }

  // ── 6. Patents ──
  if (data.patents.length > 0) {
    y = sectionTitle(doc, y, '6. Related Patents');

    const patentRows = data.patents.slice(0, 30).map((p) => [
      p.inventionTitle || p.title || '',
      p.applicantName || '',
      p.applicationDate || '',
      p.jurisdiction || '',
      p.registerStatus || p.category || '',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Title', 'Applicant', 'Date', 'Jurisdiction', 'Status']],
      body: patentRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_BG },
      tableWidth: CONTENT_W,
      columnStyles: { 0: { cellWidth: 60 } },
    });
    y = (doc as AnyDoc).lastAutoTable?.finalY ?? y + 30;
    y += 6;
  }

  // ── 7. Safety Guide Recommendations ──
  if (data.guides.length > 0) {
    y = sectionTitle(doc, y, '7. Safety Guide Recommendations');

    const guideRows = data.guides.map((g) => [
      g.guide_no,
      g.title,
      `${Math.round(g.score * 100)}%`,
      (g.match_terms || []).join(', '),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Guide No.', 'Title', 'Match', 'Terms']],
      body: guideRows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: LIGHT_BG },
      tableWidth: CONTENT_W,
    });
  }

  // ── Footer on all pages ──
  addPageFooter(doc);

  return doc;
}

// ── Public API ────────────────────────────────────────────────────────

export interface ExportPdfOptions {
  chemId: string;
  chemicalName: string;
  sections?: MsdsSection[];
  english_safety?: EnglishSafety | null;
  meta?: ChemicalMeta;
}

export async function exportChemicalPdf(opts: ExportPdfOptions): Promise<void> {
  const data = await fetchReportData(opts.chemId, opts.chemicalName, {
    sections: opts.sections,
    english_safety: opts.english_safety,
    meta: opts.meta,
  });

  const doc = buildPdf(data, opts.chemicalName);
  const safeName = opts.chemicalName.replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 60);
  doc.save(`ChemIP_Report_${safeName}.pdf`);
}
