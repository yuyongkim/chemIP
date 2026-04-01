'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Beaker, FlaskConical, Shield, Loader2 } from 'lucide-react';

import { fetchJsonSafe } from '@/lib/http';

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

interface KoreanRegulationPanelProps {
  chemId: string;
  chemicalName: string;
}

export default function KoreanRegulationPanel({ chemId, chemicalName }: KoreanRegulationPanelProps) {
  const [kischemData, setKischemData] = useState<KischemItem[]>([]);
  const [ncisData, setNcisData] = useState<NcisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      // Extract CAS from chemicalName if possible (format: "name (CAS)")
      const casMatch = chemicalName.match(/\b\d{2,7}-\d{2}-\d\b/);
      const searchName = chemicalName.split('(')[0].trim();

      const [kischemResult, ncisResult] = await Promise.all([
        casMatch
          ? fetchJsonSafe<{ data: KischemItem[] }>(`/api/regulations/kischem/cas/${casMatch[0]}`)
          : fetchJsonSafe<{ data: KischemItem[] }>(`/api/regulations/kischem/search?q=${encodeURIComponent(searchName)}`),
        casMatch
          ? fetchJsonSafe<{ data: NcisItem[] }>(`/api/regulations/ncis/cas/${casMatch[0]}`)
          : fetchJsonSafe<{ data: NcisItem[] }>(`/api/regulations/ncis/search?q=${encodeURIComponent(searchName)}`),
      ]);

      if (kischemResult.ok && kischemResult.data?.data) {
        setKischemData(kischemResult.data.data);
      }
      if (ncisResult.ok && ncisResult.data?.data) {
        setNcisData(ncisResult.data.data);
      }
      if (!kischemResult.ok && !ncisResult.ok) {
        setError('Failed to load Korean regulatory information.');
      }
      setLoading(false);
    };

    if (chemId) void fetchData();
  }, [chemId, chemicalName]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading Korean regulatory data...</span>
        </div>
      </div>
    );
  }

  const hasData = kischemData.length > 0 || ncisData.length > 0;

  return (
    <div className="space-y-6">
      {error && !hasData && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* NCIS - Substance Classification */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-900">KECO (NCIS) Substance Classification</h3>
          </div>
          <p className="text-sm text-emerald-600 mt-1">Toxic substances, restricted substances, accident preparedness classification and molecular data</p>
        </div>
        <div className="p-6">
          {ncisData.length === 0 ? (
            <p className="text-gray-400 text-sm">No NCIS registration data found for this substance.</p>
          ) : (
            <div className="space-y-4">
              {ncisData.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <InfoRow label="Name (KR)" value={item.name_ko} />
                    <InfoRow label="Name (EN)" value={item.name_en} />
                    <InfoRow label="CAS No." value={item.cas_no} />
                    <InfoRow label="KE No." value={item.ke_no} />
                    <InfoRow label="Molecular Formula" value={item.molecular_formula} icon={<FlaskConical className="w-4 h-4 text-gray-400" />} />
                    <InfoRow label="Molecular Weight" value={item.molecular_weight ? `${item.molecular_weight} g/mol` : undefined} />
                  </div>
                  {item.synonyms_ko && (
                    <div className="mt-3 text-sm">
                      <span className="font-medium text-gray-600">Synonyms: </span>
                      <span className="text-gray-500">{item.synonyms_ko}</span>
                    </div>
                  )}
                  {item.classifications && item.classifications.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.classifications.map((cls, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          {cls}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.classifications?.length === 0 && (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        No special regulatory classification
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KISCHEM - Exposure Symptoms / First Aid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">KISCHEM (화학물질안전원) Exposure Information</h3>
          </div>
          <p className="text-sm text-amber-600 mt-1">Exposure symptoms and route-specific first aid information</p>
        </div>
        <div className="p-6">
          {kischemData.length === 0 ? (
            <p className="text-gray-400 text-sm">No KISCHEM registration data found for this substance.</p>
          ) : (
            <div className="space-y-4">
              {kischemData.map((item, i) => (
                <div key={i} className="space-y-3">
                  {item.symptom && (
                    <ExposureCard title="Symptoms" content={item.symptom} variant="red" />
                  )}
                  {item.inhale && (
                    <ExposureCard title="Inhalation" content={item.inhale} variant="orange" />
                  )}
                  {item.skin && (
                    <ExposureCard title="Skin Contact" content={item.skin} variant="yellow" />
                  )}
                  {item.eye && (
                    <ExposureCard title="Eye Contact" content={item.eye} variant="blue" />
                  )}
                  {item.oral && (
                    <ExposureCard title="Ingestion" content={item.oral} variant="purple" />
                  )}
                  {item.etc && (
                    <ExposureCard title="Other" content={item.etc} variant="gray" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {icon}
      <span className="font-medium text-gray-600 min-w-[80px]">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

const variantStyles: Record<string, { bg: string; border: string; title: string }> = {
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    title: 'text-red-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-800' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   title: 'text-blue-800' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', title: 'text-purple-800' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   title: 'text-gray-800' },
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
