'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Beaker,
  Building2,
  FlaskConical,
  Globe,
  Loader2,
  MapPin,
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
  reach_status?: { code: string; label: string }[];
}

interface KotraReachItem {
  newsTitl?: string;
  kotraNewsUrl?: string;
  cntntSumar?: string;
  newsWrtDt?: string;
  cntryNm?: string;
}

interface KotraReachResponse {
  status?: string;
  total?: number;
  data?: KotraReachItem[];
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

interface PrtrSummaryData {
  cas_no?: string;
  chemical_name?: string;
  company_count?: number;
  air_release_kg?: number;
  water_release_kg?: number;
  total_release_kg?: number;
  total_transfer_kg?: number;
}

interface HandlingFacilityItem {
  company_name?: string;
  materials?: string[];
  materials_text?: string;
  sigun?: string;
  road_address?: string;
  lot_address?: string;
  latitude?: string;
  longitude?: string;
  evacuation_facility?: string;
  evacuation_distance_m?: number;
}

interface PrtrFacilityItem {
  company_name?: string;
  address?: string;
  air_release_kg?: number;
  water_release_kg?: number;
  soil_release_kg?: number;
  total_release_kg?: number;
  self_landfill_kg?: number;
  wastewater_transfer_kg?: number;
  waste_transfer_kg?: number;
  total_transfer_kg?: number;
  reported_total_kg?: number;
}

interface PrtrAggregateItem {
  dimension_name?: string;
  dimension_type?: string;
  iarc_group?: string;
  chemical_name?: string;
  release_total_kg?: number;
  self_landfill_kg?: number;
  transfer_total_kg?: number;
  reported_total_kg?: number;
}

interface PrtrAggregateData {
  material_totals?: PrtrAggregateItem;
  top_regions?: PrtrAggregateItem[];
  top_industrial_complexes?: PrtrAggregateItem[];
  top_industries?: PrtrAggregateItem[];
  carcinogenic_classes?: PrtrAggregateItem[];
}

interface ChemicalAccidentItem {
  data_no?: string;
  date?: string;
  type?: string;
  area?: string;
  address?: string;
  cause?: string;
  chemical?: string;
  place?: string;
  summary?: string;
}

interface HandlingSourcePayload<T> {
  available?: boolean;
  source?: string;
  year?: number;
  total?: number;
  limit?: number;
  ranking_basis?: string;
  data: T[] | T | null;
  message?: string;
}

interface HandlingProfileResponse {
  query: {
    cas_no?: string;
    terms?: string[];
    year?: number;
  };
  sources: {
    prtr_summary: HandlingSourcePayload<PrtrSummaryData>;
    prtr_facilities: HandlingSourcePayload<PrtrFacilityItem>;
    prtr_aggregates: HandlingSourcePayload<PrtrAggregateData>;
    gyeonggi_facilities: HandlingSourcePayload<HandlingFacilityItem>;
    chemical_accidents: HandlingSourcePayload<ChemicalAccidentItem>;
  };
}

interface KoreanRegulationPanelProps {
  chemId: string;
  chemicalName: string;
}

export default function KoreanRegulationPanel({ chemId, chemicalName }: KoreanRegulationPanelProps) {
  const [data, setData] = useState<RegulatoryIntelligenceResponse | null>(null);
  const [handlingProfile, setHandlingProfile] = useState<HandlingProfileResponse | null>(null);
  const [kotraReach, setKotraReach] = useState<KotraReachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      const kotraQuery = (chemicalName || '').trim();
      const [intelligenceResult, handlingResult, kotraResult] = await Promise.all([
        fetchJsonSafe<RegulatoryIntelligenceResponse>(`/api/regulations/intelligence/${encodeURIComponent(chemId)}`),
        fetchJsonSafe<HandlingProfileResponse>(`/api/regulations/handlers/${encodeURIComponent(chemId)}?year=2024&accident_years=5&facility_limit=10`),
        fetchJsonSafe<KotraReachResponse>(`/api/regulations/kotra/reach?q=${encodeURIComponent(kotraQuery)}&limit=8`),
      ]);

      if (intelligenceResult.ok && intelligenceResult.data) {
        setData(intelligenceResult.data);
      } else {
        setData(null);
        setError(getErrorMessage(intelligenceResult, 'Failed to load regulatory intelligence.'));
      }

      setHandlingProfile(handlingResult.ok && handlingResult.data ? handlingResult.data : null);
      setKotraReach(kotraResult.ok && kotraResult.data?.data ? kotraResult.data.data : []);
      setLoading(false);
    };

    if (chemId) {
      void fetchData();
    }
  }, [chemId, chemicalName]);

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

      <HandlingSitesSection profile={handlingProfile} />

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
                {item.reach_status && item.reach_status.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.reach_status.map((s) => (
                      <span
                        key={s.code}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.code === "REG_REGISTERED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}
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

      {kotraReach.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">KOTRA · REACH 자료</h3>
              <p className="text-xs text-gray-500">
                해외시장뉴스에서 검색한 REACH 관련 규제·상담 자료 (원문: dream.kotra.or.kr)
              </p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {kotraReach.map((item, index) => (
              <li key={`kotra-${index}`} className="text-sm">
                <a
                  href={item.kotraNewsUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-700 hover:underline font-medium"
                >
                  {item.newsTitl || '(제목 없음)'}
                </a>
                {item.cntntSumar && (
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{item.cntntSumar}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HandlingSitesSection({ profile }: { profile: HandlingProfileResponse | null }) {
  const prtr = profile?.sources.prtr_summary.data as PrtrSummaryData | null | undefined;
  const facilities = Array.isArray(profile?.sources.gyeonggi_facilities.data)
    ? profile.sources.gyeonggi_facilities.data
    : [];
  const prtrFacilities = Array.isArray(profile?.sources.prtr_facilities?.data)
    ? profile.sources.prtr_facilities.data
    : [];
  const prtrFacilitySource = profile?.sources.prtr_facilities;
  const aggregates = profile?.sources.prtr_aggregates.data as PrtrAggregateData | null | undefined;
  const accidents = Array.isArray(profile?.sources.chemical_accidents.data)
    ? profile.sources.chemical_accidents.data
    : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-cyan-50 px-6 py-5 border-b border-cyan-100">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-700" />
          <h3 className="font-semibold text-cyan-950">Handling Sites & Release Signals</h3>
        </div>
        <p className="text-sm text-cyan-700 mt-1">
          Korean facility, PRTR summary, and chemical accident records linked by CAS and aliases
        </p>
      </div>
      <div className="p-6 space-y-5">
        {prtr ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <MetricTile label="PRTR year" value={String(profile?.query.year || 2024)} />
            <MetricTile label="Reporting companies" value={formatNumber(prtr.company_count)} />
            <MetricTile label="Total release" value={`${formatNumber(prtr.total_release_kg)} kg/y`} />
            <MetricTile label="Total transfer" value={`${formatNumber(prtr.total_transfer_kg)} kg/y`} />
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            PRTR company-count summary is not available for this substance in the local cache.
          </div>
        )}

        {aggregates && (
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-700" />
                <h4 className="font-semibold text-gray-900">PRTR concentration breakdown</h4>
              </div>
              <span className="text-xs text-gray-500">aggregate workbook</span>
            </div>
            {aggregates.material_totals && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <MetricTile label="Reported total" value={`${formatNumber(aggregates.material_totals.reported_total_kg)} kg/y`} />
                <MetricTile label="Release subtotal" value={`${formatNumber(aggregates.material_totals.release_total_kg)} kg/y`} />
                <MetricTile label="Transfer subtotal" value={`${formatNumber(aggregates.material_totals.transfer_total_kg)} kg/y`} />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <AggregateList title="Top regions" items={aggregates.top_regions || []} />
              <AggregateList title="Top industrial complexes" items={aggregates.top_industrial_complexes || []} />
              <AggregateList title="Top industries" items={aggregates.top_industries || []} />
            </div>
            {!!aggregates.carcinogenic_classes?.length && (
              <p className="mt-3 text-xs text-rose-700">
                IARC: {aggregates.carcinogenic_classes.map((item) => item.iarc_group).filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-700" />
              <h4 className="font-semibold text-gray-900">PRTR reported volume Top 10</h4>
            </div>
            <span className="text-xs text-gray-500">
              {formatNumber(prtrFacilities.length)} of {formatNumber(prtrFacilitySource?.total || 0)}
            </span>
          </div>
          {prtrFacilities.length === 0 ? (
            <p className="text-sm text-gray-500">No PRTR company rows were returned for this material.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="py-2 pr-4 font-medium">Company</th>
                    <th className="py-2 pr-4 font-medium">Address</th>
                    <th className="py-2 pr-4 font-medium text-right">Reported total kg/y</th>
                    <th className="py-2 pr-4 font-medium text-right">Release kg/y</th>
                    <th className="py-2 pr-4 font-medium text-right">Transfer kg/y</th>
                  </tr>
                </thead>
                <tbody>
                  {prtrFacilities.map((item, index) => (
                    <tr key={`${item.company_name || 'prtr'}-${index}`} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-gray-900">{item.company_name || '-'}</td>
                      <td className="py-2 pr-4 text-gray-500 max-w-xs truncate">{item.address || '-'}</td>
                      <td className="py-2 pr-4 text-right text-gray-900 font-medium">{formatNumber(item.reported_total_kg)}</td>
                      <td className="py-2 pr-4 text-right text-gray-700">{formatNumber(item.total_release_kg)}</td>
                      <td className="py-2 pr-4 text-right text-gray-700">{formatNumber(item.total_transfer_kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500">
                Ranked by PRTR reported total: release + transfer + self-landfill. Showing top {formatNumber(prtrFacilitySource?.limit || 10)} of {formatNumber(prtrFacilitySource?.total || prtrFacilities.length)} rows.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-700" />
                <h4 className="font-semibold text-gray-900">Gyeonggi hazardous facilities</h4>
              </div>
              <span className="text-xs text-gray-500">{facilities.length} matches</span>
            </div>
            {facilities.length === 0 ? (
              <p className="text-sm text-gray-500">No matching Gyeonggi facility records for the current aliases.</p>
            ) : (
              <div className="space-y-3">
                {facilities.slice(0, 8).map((item, index) => (
                  <div key={`${item.company_name || 'facility'}-${index}`} className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
                    <div className="font-medium text-gray-900">{item.company_name || 'Unnamed facility'}</div>
                    <div className="mt-1 text-gray-600">{item.road_address || item.lot_address}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(item.materials?.length ? item.materials : [item.materials_text || '']).filter(Boolean).map((material) => (
                        <span key={material} className="rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100 px-2.5 py-1 text-xs">
                          {material}
                        </span>
                      ))}
                    </div>
                    {item.evacuation_facility && (
                      <div className="mt-2 text-xs text-gray-500">
                        Evacuation: {item.evacuation_facility}
                        {item.evacuation_distance_m ? ` · ${formatNumber(item.evacuation_distance_m)} m` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h4 className="font-semibold text-gray-900">Related accident history</h4>
              </div>
              <span className="text-xs text-gray-500">{accidents.length} matches</span>
            </div>
            {accidents.length === 0 ? (
              <p className="text-sm text-gray-500">No matching recent chemical accident records.</p>
            ) : (
              <div className="space-y-3">
                {accidents.slice(0, 8).map((item, index) => (
                  <div key={`${item.data_no || 'accident'}-${index}`} className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{item.place || 'Unknown site'}</span>
                      {item.date && <span className="text-xs text-gray-500">{item.date}</span>}
                    </div>
                    <div className="mt-1 text-gray-600">{item.area || item.address}</div>
                    {item.chemical && <div className="mt-1 text-gray-700">Material: {item.chemical}</div>}
                    {item.summary && <p className="mt-2 text-gray-500 line-clamp-3">{item.summary}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value || '-'}</div>
    </div>
  );
}

function AggregateList({ title, items }: { title: string; items: PrtrAggregateItem[] }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No aggregate rows.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${title}-${item.dimension_name || index}`} className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-gray-900">{item.dimension_name || '-'}</span>
                <span className="text-sm tabular-nums text-gray-700">{formatNumber(item.reported_total_kg)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                release {formatNumber(item.release_total_kg)} · transfer {formatNumber(item.transfer_total_kg)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNumber(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
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
