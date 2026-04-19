'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Beaker,
  FlaskConical,
  Loader2,
  Shield,
  Sparkles,
} from 'lucide-react';

import { fetchJsonSafe, getErrorMessage } from '@/lib/http';

interface AliasItem {
  alias: string;
  alias_type: string;
  source?: string;
  confidence?: number;
}

interface KischemItem {
  data_no?: string;
  name_ko?: string;
  name_en?: string;
  cas_no?: string;
  symptom?: string;
  inhale?: string;
  skin?: string;
  eye?: string;
  oral?: string;
  etc?: string;
}

interface NcisItem {
  cas_no?: string;
  ke_no?: string;
  name_ko?: string;
  name_en?: string;
  synonyms_ko?: string;
  synonyms_en?: string;
  molecular_formula?: string;
  molecular_weight?: string;
  classifications?: string[];
}

interface EchaItem {
  rml_id?: string;
  name?: string;
  iupac_name?: string;
  cas_number?: string;
  ec_number?: string;
  molecular_formula?: string;
  regulatory_processes?: string[];
}

interface NioshItem {
  name?: string;
  cas?: string;
  rel?: string;
  pel?: string;
  idlh?: string;
  carcinogen?: boolean;
  target_organs?: string;
}

interface CompToxItem {
  dtxsid?: string;
  casrn?: string;
  preferredName?: string;
  name?: string;
  preferred_name?: string;
}

interface SourcePayload<T> {
  query_used?: string;
  available?: boolean;
  data: T[];
  total: number;
  error?: string;
  message?: string;
}

interface RegulatoryIntelligenceResponse {
  chem_id: string;
  aliases: AliasItem[];
  search_terms: string[];
  sources: {
    ncis: SourcePayload<NcisItem>;
    kischem: SourcePayload<KischemItem>;
    niosh: SourcePayload<NioshItem>;
    echa: SourcePayload<EchaItem>;
    comptox: SourcePayload<CompToxItem>;
  };
}

interface KoreanRegulationPanelProps {
  chemId: string;
  chemicalName: string;
}

export default function KoreanRegulationPanel({ chemId }: KoreanRegulationPanelProps) {
  const [data, setData] = useState<RegulatoryIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      const result = await fetchJsonSafe<RegulatoryIntelligenceResponse>(`/api/regulations/intelligence/${encodeURIComponent(chemId)}`);
      if (result.ok && result.data) {
        setData(result.data);
      } else {
        setData(null);
        setError(getErrorMessage(result, 'Failed to load regulatory intelligence.'));
      }
      setLoading(false);
    };

    if (chemId) {
      void fetchData();
    }
  }, [chemId]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading regulatory intelligence...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'No regulatory intelligence available.'}
        </div>
      </div>
    );
  }

  const { aliases, search_terms, sources } = data;
  const hasData =
    sources.ncis.data.length > 0 ||
    sources.kischem.data.length > 0 ||
    sources.niosh.data.length > 0 ||
    sources.echa.data.length > 0 ||
    sources.comptox.data.length > 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Regulatory Intelligence</h3>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Alias-driven lookups across Korean and international safety and regulatory sources
          </p>
        </div>
        <div className="p-6 space-y-5">
          <SummaryGrid
            aliasCount={aliases.length}
            searchTermCount={search_terms.length}
            sourceHits={[
              sources.ncis.data.length,
              sources.kischem.data.length,
              sources.niosh.data.length,
              sources.echa.data.length,
              sources.comptox.data.length,
            ].filter((count) => count > 0).length}
          />

          {aliases.length > 0 && (
            <TagGroup
              title="Resolved aliases"
              items={aliases.map((item) => `${item.alias}${item.alias_type ? ` · ${item.alias_type}` : ''}`)}
              tone="slate"
            />
          )}

          {search_terms.length > 0 && (
            <TagGroup title="Search terms used" items={search_terms} tone="blue" />
          )}

          {!hasData && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No live regulatory records were found for the current aliases.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SourceCard
          icon={<Shield className="w-5 h-5 text-emerald-600" />}
          title="NCIS / KECO"
          subtitle="Korean substance classification and molecular metadata"
          tone="emerald"
          source={sources.ncis}
          emptyText="No NCIS registration data found."
        >
          <div className="space-y-4">
            {sources.ncis.data.map((item, index) => (
              <div key={`${item.cas_no || item.ke_no || 'ncis'}-${index}`} className="border border-gray-100 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Name (KR)" value={item.name_ko} />
                  <InfoRow label="Name (EN)" value={item.name_en} />
                  <InfoRow label="CAS No." value={item.cas_no} />
                  <InfoRow label="KE No." value={item.ke_no} />
                  <InfoRow label="Molecular Formula" value={item.molecular_formula} icon={<FlaskConical className="w-4 h-4 text-gray-500" />} />
                  <InfoRow label="Molecular Weight" value={item.molecular_weight ? `${item.molecular_weight} g/mol` : undefined} />
                </div>
                {item.synonyms_ko && <TextBlock label="Synonyms (KR)" value={item.synonyms_ko} />}
                {item.synonyms_en && <TextBlock label="Synonyms (EN)" value={item.synonyms_en} />}
                {item.classifications && item.classifications.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.classifications.map((cls, idx) => (
                      <span key={`${cls}-${idx}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        {cls}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SourceCard>

        <SourceCard
          icon={<Beaker className="w-5 h-5 text-amber-600" />}
          title="KISCHEM"
          subtitle="Route-specific exposure symptoms and first aid"
          tone="amber"
          source={sources.kischem}
          emptyText="No KISCHEM exposure data found."
        >
          <div className="space-y-4">
            {sources.kischem.data.map((item, index) => (
              <div key={`${item.cas_no || item.data_no || 'kischem'}-${index}`} className="space-y-3">
                {item.symptom && <ExposureCard title="Symptoms" content={item.symptom} variant="red" />}
                {item.inhale && <ExposureCard title="Inhalation" content={item.inhale} variant="orange" />}
                {item.skin && <ExposureCard title="Skin Contact" content={item.skin} variant="yellow" />}
                {item.eye && <ExposureCard title="Eye Contact" content={item.eye} variant="blue" />}
                {item.oral && <ExposureCard title="Ingestion" content={item.oral} variant="purple" />}
                {item.etc && <ExposureCard title="Other" content={item.etc} variant="gray" />}
              </div>
            ))}
          </div>
        </SourceCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SourceCard
          icon={<Shield className="w-5 h-5 text-sky-600" />}
          title="ECHA"
          subtitle="EU REACH / CLP substance records"
          tone="sky"
          source={sources.echa}
          emptyText="No ECHA match found."
        >
          <div className="space-y-4">
            {sources.echa.data.map((item, index) => (
              <div key={`${item.rml_id || item.cas_number || 'echa'}-${index}`} className="border border-gray-100 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold text-gray-900">{item.name || item.iupac_name || 'Unnamed record'}</div>
                <InfoRow label="CAS" value={item.cas_number} />
                <InfoRow label="EC" value={item.ec_number} />
                <InfoRow label="Formula" value={item.molecular_formula} />
                <InfoRow label="RML ID" value={item.rml_id} />
                {item.iupac_name && item.iupac_name !== item.name && <TextBlock label="IUPAC" value={item.iupac_name} />}
                {item.regulatory_processes && item.regulatory_processes.length > 0 && (
                  <TagGroup title="Processes" items={item.regulatory_processes} tone="sky" compact />
                )}
              </div>
            ))}
          </div>
        </SourceCard>

        <SourceCard
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          title="NIOSH"
          subtitle="Occupational exposure guidance"
          tone="rose"
          source={sources.niosh}
          emptyText="No NIOSH pocket guide entry found."
        >
          <div className="space-y-4">
            {sources.niosh.data.map((item, index) => (
              <div key={`${item.cas || item.name || 'niosh'}-${index}`} className="border border-gray-100 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold text-gray-900">{item.name || 'NIOSH record'}</div>
                <InfoRow label="CAS" value={item.cas} />
                <InfoRow label="REL" value={item.rel} />
                <InfoRow label="PEL" value={item.pel} />
                <InfoRow label="IDLH" value={item.idlh} />
                {item.target_organs && <TextBlock label="Target organs" value={item.target_organs} />}
                {item.carcinogen && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    Potential occupational carcinogen
                  </span>
                )}
              </div>
            ))}
          </div>
        </SourceCard>

        <SourceCard
          icon={<Sparkles className="w-5 h-5 text-violet-600" />}
          title="CompTox"
          subtitle="EPA computational toxicology search"
          tone="violet"
          source={sources.comptox}
          emptyText="No CompTox match found."
        >
          <div className="space-y-4">
            {sources.comptox.data.map((item, index) => (
              <div key={`${readField(item, ['dtxsid']) || readField(item, ['casrn']) || index}`} className="border border-gray-100 rounded-lg p-4 space-y-2 text-sm">
                <div className="font-semibold text-gray-900">
                  {readField(item, ['preferredName', 'preferred_name', 'name']) || 'CompTox record'}
                </div>
                <InfoRow label="DTXSID" value={readField(item, ['dtxsid'])} />
                <InfoRow label="CAS" value={readField(item, ['casrn', 'cas'])} />
              </div>
            ))}
          </div>
        </SourceCard>
      </div>
    </div>
  );
}

function readField(item: CompToxItem | Record<string, unknown>, keys: string[]): string {
  const record = item as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function SummaryGrid({ aliasCount, searchTermCount, sourceHits }: { aliasCount: number; searchTermCount: number; sourceHits: number }) {
  const cards = [
    { label: 'Aliases', value: aliasCount },
    { label: 'Search terms', value: searchTermCount },
    { label: 'Active sources', value: sourceHits },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

function SourceCard<T>({
  icon,
  title,
  subtitle,
  tone,
  source,
  emptyText,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet';
  source: SourcePayload<T>;
  emptyText: string;
  children: ReactNode;
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-900 text-emerald-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-900 text-amber-600',
    sky: 'bg-sky-50 border-sky-100 text-sky-900 text-sky-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-900 text-rose-600',
    violet: 'bg-violet-50 border-violet-100 text-violet-900 text-violet-600',
  }[tone].split(' ');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`${toneClass[0]} px-6 py-4 border-b ${toneClass[1]}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`font-semibold ${toneClass[2]}`}>{title}</h3>
        </div>
        <p className={`text-sm mt-1 ${toneClass[3]}`}>{subtitle}</p>
      </div>
      <div className="p-6">
        <SourceMeta source={source} />
        {source.error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {source.error}
          </div>
        )}
        {source.available === false && source.message && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {source.message}
          </div>
        )}
        {source.data.length === 0 ? <p className="text-gray-500 text-sm">{emptyText}</p> : children}
      </div>
    </div>
  );
}

function SourceMeta<T>({ source }: { source: SourcePayload<T> }) {
  if (!source.query_used && !source.total) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
      {source.query_used && <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100">query: {source.query_used}</span>}
      <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100">records: {source.total}</span>
    </div>
  );
}

function TagGroup({
  title,
  items,
  tone,
  compact = false,
}: {
  title: string;
  items: string[];
  tone: 'slate' | 'blue' | 'sky';
  compact?: boolean;
}) {
  if (items.length === 0) return null;
  const styleMap = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className={`inline-flex items-center rounded-full border ${styleMap[tone]} ${compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs'}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {icon}
      <span className="font-medium text-gray-600 min-w-[92px]">{label}</span>
      <span className="text-gray-900 break-words">{value}</span>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="mt-3 text-sm">
      <span className="font-medium text-gray-600">{label}: </span>
      <span className="text-gray-500">{value}</span>
    </div>
  );
}

const variantStyles: Record<string, { bg: string; border: string; title: string }> = {
  red: { bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-800' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', title: 'text-blue-800' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-800' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-800' },
};

function ExposureCard({ title, content, variant }: { title: string; content: string; variant: string }) {
  const s = variantStyles[variant] || variantStyles.gray;
  return (
    <div className={`${s.bg} ${s.border} border rounded-lg p-4`}>
      <h4 className={`font-semibold text-sm ${s.title} mb-1`}>{title}</h4>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}
