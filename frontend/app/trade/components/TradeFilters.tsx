import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';

import SearchBar from '@/components/SearchBar';

import type { TabId } from '../types';

type SortBy = 'date_desc' | 'date_asc' | 'country';

interface TradeFiltersProps {
  tab: TabId;
  country: string;
  keyword: string;
  dateFrom: string;
  dateTo: string;
  sortBy: SortBy;
  fraudCategory: string;
  countryOptions: string[];
  productKeywordChips: string[];
  priceKeywordChips: string[];
  onCountryChange: (country: string) => void;
  onKeywordSearch: (keyword: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSortByChange: (value: SortBy) => void;
  onFraudCategoryChange: (value: string) => void;
  onRefresh: () => void;
  onKeywordChipClick: (chip: string) => void;
}

export default function TradeFilters({
  tab,
  country,
  keyword,
  dateFrom,
  dateTo,
  sortBy,
  fraudCategory,
  countryOptions,
  productKeywordChips,
  priceKeywordChips,
  onCountryChange,
  onKeywordSearch,
  onDateFromChange,
  onDateToChange,
  onSortByChange,
  onFraudCategoryChange,
  onRefresh,
  onKeywordChipClick,
}: TradeFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);

  const quickCountryOptions = useMemo(
    () => (showAllCountries ? countryOptions : countryOptions.slice(0, 5)),
    [showAllCountries, countryOptions],
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <button
          type="button"
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Advanced Filters
          {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-900"
        >
          <option value="" className="text-gray-900">
            All Countries
          </option>
          {countryOptions.map((countryOption) => (
            <option key={countryOption} value={countryOption} className="text-gray-900">
              {countryOption}
            </option>
          ))}
        </select>

        {tab === 'products' && (
          <div className="flex-1 min-w-[260px]">
            <SearchBar
              onSearch={onKeywordSearch}
              initialValue={keyword}
              placeholder="Search products/keywords (e.g., battery materials, China, semiconductors)"
            />
          </div>
        )}

        {(tab === 'strategy' || tab === 'fraud') && (
          <>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-900"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-900"
            />
          </>
        )}

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {showAdvancedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div className="flex flex-wrap gap-3">
            {tab === 'strategy' && (
              <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortBy)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white text-gray-900"
              >
                <option value="date_desc" className="text-gray-900">
                  Newest First
                </option>
                <option value="date_asc" className="text-gray-900">
                  Oldest First
                </option>
                <option value="country" className="text-gray-900">
                  By Country
                </option>
              </select>
            )}

            {tab === 'fraud' && (
              <input
                value={fraudCategory}
                onChange={(e) => onFraudCategoryChange(e.target.value)}
                placeholder="Category filter (e.g., payment, impersonation, logistics)"
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm min-w-[230px] bg-white text-gray-900"
              />
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Quick Country Select</p>
            <div className="flex flex-wrap gap-2">
              {quickCountryOptions.map((countryOption) => (
                <button
                  key={countryOption}
                  onClick={() => onCountryChange(countryOption)}
                  className={`px-2.5 py-1 rounded-full border text-xs ${
                    country === countryOption
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {countryOption}
                </button>
              ))}

              {countryOptions.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllCountries((prev) => !prev)}
                  className="px-2.5 py-1 rounded-full border text-xs bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  {showAllCountries ? 'Collapse' : `More +${countryOptions.length - 5}`}
                </button>
              )}
            </div>
          </div>

          {(tab === 'products' || tab === 'prices') && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Suggested Keywords</p>
              <div className="flex flex-wrap gap-2">
                {(tab === 'products' ? productKeywordChips : priceKeywordChips).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onKeywordChipClick(chip)}
                    className={`px-2.5 py-1 rounded-full border text-xs ${
                      keyword === chip
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
