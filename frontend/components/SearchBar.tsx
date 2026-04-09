'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchJsonSafe } from '@/lib/http';
import { stripHtml } from '@/lib/sanitize';

interface SearchBarProps {
    onSearch: (query: string) => void;
    initialValue?: string;
    placeholder?: string;
}

interface Suggestion {
    id: number;
    name: string;
    cas_no: string;
    chem_id: string;
}

export default function SearchBar({ onSearch, initialValue = '', placeholder = "Search chemical name or CAS No. (e.g. Benzene, 71-43-2)" }: SearchBarProps) {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchSuggestions = async () => {
            if (query.length < 1) {
                setSuggestions([]);
                return;
            }
            try {
                const encodedQuery = encodeURIComponent(query);
                const result = await fetchJsonSafe<unknown[]>(`/api/chemicals/autocomplete?q=${encodedQuery}&limit=5`, {
                    signal: controller.signal,
                });
                const list = Array.isArray(result.data) ? result.data : [];
                setSuggestions(list as Suggestion[]);
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error("Autocomplete failed", error);
            }
        };

        const debounce = setTimeout(fetchSuggestions, 300);
        return () => {
            controller.abort();
            clearTimeout(debounce);
        };
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuggestions(false);
        onSearch(query);
    };

    const handleSelect = (suggestion: Suggestion) => {
        setQuery(suggestion.name);
        setShowSuggestions(false);
        router.push(`/chemical/${suggestion.chem_id}`);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors duration-200" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-13 pr-24 py-4 bg-white border border-gray-200/80 rounded-2xl leading-5 text-gray-900 placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] hover:border-gray-300"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-all"
                            title="Clear search"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        type="submit"
                        className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#1e3a5f] text-white text-sm font-medium hover:bg-[#172554] active:scale-[0.97] transition-all duration-150 shadow-sm"
                    >
                        Search
                    </button>
                </div>
            </form>

            {/* Autocomplete Dropdown */}
            {
                showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <ul className="py-1.5">
                            {suggestions.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleSelect(item)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex justify-between items-center group transition-colors duration-100"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <FlaskConical className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                                    {stripHtml(item.name)}
                                                </span>
                                                {item.cas_no && (
                                                    <span className="ml-2 text-xs text-gray-500 font-mono">
                                                        {item.cas_no}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">&rarr;</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            }
        </div >
    );
}
