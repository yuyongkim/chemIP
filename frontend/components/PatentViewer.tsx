import { useState, useEffect, ReactNode } from 'react';
import { Book, ExternalLink, Calendar, User, Eye } from 'lucide-react';
import PatentDetailModal from './PatentDetailModal';

interface Patent {
    applicationNumber?: string;
    applicationDate?: string;
    inventionTitle?: string;
    applicantName?: string;
    abstract?: string;
    indexNo?: string;
    registerStatus?: string;
    pubNumber?: string;
    pubDate?: string;
    matched_term?: string;
    snippet?: string;
    patent_id?: string;
    title?: string;
    file_path?: string;
    jurisdiction?: string;
    category?: 'usage' | 'mention' | 'exclusion';
}

interface PatentViewerProps {
    query: string;
    chemId?: string;
}

interface ApiEnvelope {
    detail?: unknown;
    [key: string]: unknown;
}

function buildHighlightKeywords(...values: Array<string | undefined | null>): string[] {
    const seen = new Set<string>();
    const keywords: string[] = [];

    const push = (value: string) => {
        const trimmed = value.trim();
        if (trimmed.length < 2) return;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        keywords.push(trimmed);
    };

    const addFromValue = (value: string) => {
        push(value);

        // CAS number pattern
        const casMatches = value.match(/\b\d{2,7}-\d{2}-\d\b/g) || [];
        casMatches.forEach(push);

        // Chemical aliases inside parentheses
        const bracketMatches = value.match(/\(([^)]+)\)/g) || [];
        for (const match of bracketMatches) {
            const inner = match.slice(1, -1);
            inner.split(/[,/;|]/).map((item) => item.trim()).forEach(push);
        }
    };

    for (const value of values) {
        if (!value) continue;
        addFromValue(value);
    }

    return keywords.sort((a, b) => b.length - a.length);
}

function highlightText(text: string | null | undefined, keywords: Array<string | undefined | null>): ReactNode {
    if (!text) return '';

    const valid = buildHighlightKeywords(...(keywords || []));
    if (valid.length === 0) return text;

    const pattern = valid
        .sort((a, b) => b.length - a.length)
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

    const splitRegex = new RegExp(`(${pattern})`, 'gi');
    const exactRegex = new RegExp(`^(${pattern})$`, 'i');
    const parts = text.split(splitRegex);

    if (parts.length === 1) return text;

    return parts.map((part, i) =>
        exactRegex.test(part) ? (
            <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded-sm font-semibold">{part}</mark>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
}

async function fetchJson(url: string): Promise<ApiEnvelope> {
    const res = await fetch(url);
    const raw = await res.text();
    let data: ApiEnvelope = {};

    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        if (parsed && typeof parsed === 'object') {
            data = parsed as ApiEnvelope;
        }
    } catch {
        throw new Error(`Invalid JSON response (${res.status}) from ${url}`);
    }

    if (!res.ok) {
        const detail = data?.detail || `HTTP ${res.status}`;
        throw new Error(typeof detail === 'string' ? detail : `HTTP ${res.status}`);
    }

    return data;
}

export default function PatentViewer({ query, chemId }: PatentViewerProps) {
    const [patents, setPatents] = useState<Patent[]>([]);
    const [globalPatents, setGlobalPatents] = useState<Patent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedPatent, setSelectedPatent] = useState<Patent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchPatents = async () => {
            if (!query) return;

            setLoading(true);
            setError('');

            const errors: string[] = [];
            let hasAnyData = false;

            try {
                const json = await fetchJson(`/api/patents?q=${encodeURIComponent(query)}`);
                const kiprisItems = Array.isArray(json?.results) ? json.results : [];
                setPatents(kiprisItems);
                if (kiprisItems.length > 0) hasAnyData = true;
            } catch (err: unknown) {
                setPatents([]);
                errors.push(`KIPRIS: ${getErrorMessage(err)}`);
            }

            if (chemId) {
                try {
                    const jsonGlobal = await fetchJson(`/api/patents/global/${chemId}?limit=200`);
                    const globalItems = Array.isArray(jsonGlobal?.results) ? jsonGlobal.results : [];
                    setGlobalPatents(globalItems);
                    if (globalItems.length > 0) hasAnyData = true;
                } catch (err: unknown) {
                    setGlobalPatents([]);
                    errors.push(`Global DB: ${getErrorMessage(err)}`);
                }
            } else {
                setGlobalPatents([]);
            }

            if (!hasAnyData && errors.length > 0) {
                setError(`Failed to load patent information. ${errors.join(' | ')}`);
            }

            setLoading(false);
        };

        fetchPatents();
    }, [query, chemId]);

    const handleOpenModal = (patent: Patent) => {
        setSelectedPatent(patent);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedPatent(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center py-8">{error}</div>;
    }

    return (
        <div className="space-y-8">
            <PatentDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                patent={selectedPatent}
                searchQuery={query}
            />

            <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                    <Book className="w-5 h-5" />
                    Global Patents (Local DB)
                    <span className="text-sm font-normal text-purple-600 ml-2">({globalPatents.length} found)</span>
                </h3>

                {globalPatents.length === 0 ? (
                    <div className="text-center py-8 bg-white/50 rounded-xl border border-dashed border-purple-200">
                        <p className="text-purple-400">No global patents found for this chemical in local index.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {globalPatents.map((patent, idx) => {
                            const highlightKeywords = buildHighlightKeywords(
                                query,
                                patent.matched_term,
                            );
                            return (
                            <button
                                key={`${patent.patent_id || patent.title || 'global'}-${idx}`}
                                onClick={() => handleOpenModal(patent)}
                                className="text-left bg-white p-6 rounded-xl border border-purple-100 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-4">
                                        <h4 className="text-lg font-bold text-gray-900 break-all group-hover:text-blue-700 transition-colors">
                                            {highlightText(patent.title || '', highlightKeywords)}
                                        </h4>
                                    </div>
                                    <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
                                        {patent.patent_id || '-'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Matched Term</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                        {highlightText(patent.matched_term || '-', highlightKeywords)}
                                    </span>
                                </div>
                                {patent.snippet && (
                                    <p className="text-sm text-gray-600 mb-2 bg-white p-2 rounded border border-gray-100 font-mono text-xs">
                                        &quot;{highlightText(patent.snippet, highlightKeywords)}&quot;
                                    </p>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-gray-500 truncate font-mono">Source: {patent.file_path}</p>
                                    <span className="text-xs font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        View Details <Eye className="w-3 h-3" />
                                    </span>
                                </div>
                            </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Book className="w-5 h-5 text-blue-600" />
                    KIPRIS ({patents.length} found)
                </h3>

                {patents.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No related patent information found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {patents.map((patent, idx) => {
                            const highlightKeywords = buildHighlightKeywords(
                                query,
                                patent.matched_term,
                            );
                            return (
                            <button
                                key={`${patent.applicationNumber || patent.inventionTitle || 'kipris'}-${idx}`}
                                onClick={() => handleOpenModal(patent)}
                                className="text-left bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md hover:scale-[1.01] transition-all w-full group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-lg font-bold text-gray-900 flex-1 pr-4 group-hover:text-blue-600 transition-colors">
                                        {highlightText(patent.inventionTitle || '', highlightKeywords)}
                                    </h4>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${patent.registerStatus === '등록' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {patent.registerStatus === '등록' ? 'Registered' : patent.registerStatus === '공개' ? 'Published' : patent.registerStatus || 'Published'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <User className="w-4 h-4" />
                                        {patent.applicantName || '-'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {patent.applicationDate || '-'}
                                    </div>
                                </div>

                                <div className="text-gray-600 text-sm mb-4 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                                    {patent.abstract ? highlightText(patent.abstract, highlightKeywords) : 'No abstract available.'}
                                </div>

                                <div className="flex justify-end">
                                    <span className="inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-800">
                                        View Details <ExternalLink className="w-4 h-4 ml-1" />
                                    </span>
                                </div>
                            </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
