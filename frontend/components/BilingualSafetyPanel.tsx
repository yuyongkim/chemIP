import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface SectionContent {
  [key: string]: string;
}

interface Section {
  section_seq: number;
  section_name: string;
  content: SectionContent[];
}

interface EnglishSafety {
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

interface BilingualSafetyPanelProps {
  sections: Section[];
  englishSafety?: EnglishSafety | null;
}

function splitLines(text?: string): string[] {
  if (!text) return [];
  return text
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x !== '자료없음' && x !== 'No data');
}

export default function BilingualSafetyPanel({ sections, englishSafety }: BilingualSafetyPanelProps) {
  const section2 = sections.find((s) => s.section_seq === 2);
  const items = section2?.content ?? [];

  const findItemByCode = (code: string) => items.find((item) => (item.msdsItemCode || '') === code);
  const findItemsByName = (word: string) => items.filter((item) => (item.msdsItemNameKor || '').includes(word));

  const koSignal = findItemByCode('B04')?.itemDetail || '';
  const koClassification = splitLines(findItemByCode('B02')?.itemDetail || '');
  const koHazards = splitLines(findItemByCode('B05')?.itemDetail || '');
  const koPrecaution = [
    ...findItemsByName('예방'),
    ...findItemsByName('대응'),
    ...findItemsByName('저장'),
    ...findItemsByName('폐기'),
  ]
    .flatMap((item) => splitLines(item.itemDetail))
    .filter((value, idx, arr) => arr.indexOf(value) === idx);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Korean Safety Info (KOSHA Section 2)
          </h2>
          <div className="space-y-4 text-sm text-gray-900">
            <div>
              <span className="font-semibold text-gray-900">Signal Word:</span>{' '}
              <span className="text-gray-800">{koSignal || 'No data'}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Hazard Classification</p>
              <ul className="list-disc list-inside space-y-1 text-gray-800 max-h-52 overflow-auto">
                {koClassification.length > 0 ? koClassification.map((line, i) => <li key={`ko-c-${i}`}>{line}</li>) : <li>No data</li>}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Hazard Statements</p>
              <ul className="list-disc list-inside space-y-1 text-gray-800 max-h-64 overflow-auto">
                {koHazards.length > 0 ? koHazards.map((line, i) => <li key={`ko-h-${i}`}>{line}</li>) : <li>No data</li>}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Precautionary Statements</p>
              <ul className="list-disc list-inside space-y-1 text-gray-800 max-h-64 overflow-auto">
                {koPrecaution.length > 0 ? koPrecaution.map((line, i) => <li key={`ko-p-${i}`}>{line}</li>) : <li>No data</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-blue-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-700" />
            English Safety Info (PubChem)
          </h2>
          <div className="space-y-4 text-sm text-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><span className="font-semibold text-blue-900">Signal:</span> <span className="font-medium text-gray-900">{englishSafety?.signal_word || 'N/A'}</span></div>
              <div><span className="font-semibold text-blue-900">CAS:</span> <span className="font-medium text-gray-900">{englishSafety?.cas_no || 'N/A'}</span></div>
              <div><span className="font-semibold text-blue-900">Name:</span> <span className="font-medium text-gray-900">{englishSafety?.name_en || 'N/A'}</span></div>
              <div><span className="font-semibold text-blue-900">CID:</span> <span className="font-medium text-gray-900">{englishSafety?.pubchem_cid ?? 'N/A'}</span></div>
            </div>

            <div>
              <p className="font-semibold text-blue-900 mb-2">GHS Classification</p>
              <ul className="list-disc list-inside space-y-1 text-gray-800 max-h-40 overflow-auto">
                {englishSafety?.ghs_classification?.length
                  ? englishSafety.ghs_classification.map((line, i) => <li key={`en-c-${i}`}>{line}</li>)
                  : <li>N/A</li>}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-blue-900 mb-2">Hazard Statements</p>
              <ul className="list-disc list-inside space-y-1 text-gray-800 max-h-52 overflow-auto">
                {englishSafety?.hazard_statements?.length
                  ? englishSafety.hazard_statements.map((line, i) => <li key={`en-h-${i}`}>{line}</li>)
                  : <li>N/A</li>}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-blue-900 mb-2">Precautionary Statements</p>
              <ul className="list-disc list-inside space-y-1 text-gray-800 max-h-40 overflow-auto">
                {englishSafety?.precautionary_statements?.length
                  ? englishSafety.precautionary_statements.map((line, i) => <li key={`en-p-${i}`}>{line}</li>)
                  : <li>N/A</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
