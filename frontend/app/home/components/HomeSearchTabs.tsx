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
    <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-gray-200">
      <button
        onClick={() => onChange('chemicals')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
          activeTab === 'chemicals'
            ? 'bg-[#1e3a5f] text-white shadow-sm'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
        {t('home.tab.chemicals')}
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded-md tabular-nums ${activeTab === 'chemicals' ? 'bg-white/20' : 'bg-gray-100'}`}>{total}</span>
      </button>

      <button
        onClick={() => onChange('drugs')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
          activeTab === 'drugs'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
        }`}
      >
        <Pill className="w-4 h-4" />
        {t('home.tab.drugs')}
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded-md tabular-nums ${activeTab === 'drugs' ? 'bg-white/20' : 'bg-gray-100'}`}>{drugTotal}</span>
      </button>
    </div>
  );
}
