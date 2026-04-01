'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BilingualSafetyPanel from '@/components/BilingualSafetyPanel';
import { fetchJsonSafe } from '@/lib/http';

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

interface ChemicalDetail {
  chem_id: string;
  sections: Section[];
  english_safety?: EnglishSafety | null;
}

export default function ChemicalBilingualPage() {
  const params = useParams();
  const [data, setData] = useState<ChemicalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await fetchJsonSafe<ChemicalDetail>(`/api/chemicals/${params.id}`);
        if (result.ok && result.data) {
          setData(result.data);
        } else {
          setData(null);
          console.error('Failed to fetch details', result.errorText || `HTTP ${result.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch details', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      void fetchDetails();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center">Chemical not found</div>;
  }

  const section1 = data.sections?.find((s) => s.section_seq === 1);
  let chemicalName = data.chem_id;
  if (section1) {
    for (const item of section1.content) {
      if ('itemDetail' in item && item.itemDetail) {
        chemicalName = item.itemDetail;
        break;
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/chemical/${params.id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Detail
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bilingual Safety View</h1>
          <p className="text-sm text-gray-600 mt-1">{chemicalName}</p>
        </div>

        <BilingualSafetyPanel sections={data.sections || []} englishSafety={data.english_safety} />
      </div>
    </div>
  );
}
