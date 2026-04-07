import { FlaskConical, Pill } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

import type { HomeTab } from '../types';

interface HomeSearchTabsProps {
  activeTab: HomeTab;
  total: number;
  drugTotal: number;
  onChange: (tab: HomeTab) => void;
}

export default function HomeSearchTabs({ activeTab, total, drugTotal, onChange }: HomeSearchTabsProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-3 mb-8 pb-4 border-b border-gray-200">
      <button
        onClick={() => onChange('chemicals')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'chemicals'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
        {t('home.tab.chemicals')}
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'chemicals' ? 'bg-white/20' : 'bg-gray-100'}`}>{total}</span>
      </button>

      <button
        onClick={() => onChange('drugs')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          activeTab === 'drugs'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        <Pill className="w-4 h-4" />
        {t('home.tab.drugs')}
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'drugs' ? 'bg-white/20' : 'bg-gray-100'}`}>{drugTotal}</span>
      </button>
    </div>
  );
}
