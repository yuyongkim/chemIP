import { X, ExternalLink, BookOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface PatentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery?: string;
    patent: {
        patent_id?: string;
        title?: string;
        jurisdiction?: string;
        snippet?: string;
        matched_term?: string;
        category?: string;
        applicationDate?: string; // For KIPRIS
        applicantName?: string;   // For KIPRIS
        abstract?: string;        // For KIPRIS
        registerStatus?: string;  // For KIPRIS
        applicationNumber?: string; // For KIPRIS
        inventionTitle?: string; // For KIPRIS
    } | null;
}

interface KiprisDetail {
    applicationNumber: string;
    applicationDate: string;
    inventionTitle: string;
    inventionTitleEng: string;
    registerStatus: string;
    registerNumber: string;
    openNumber: string;
    publicationNumber: string;
    applicantName: string;
    applicantNameEng: string;
    abstract: string;
    claims: string[];
    imagePath: string;
    imageLargePath: string;
}

function buildHighlightKeywords(...values: Array<string | undefined>): string[] {
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

        const casMatches = value.match(/\b\d{2,7}-\d{2}-\d\b/g) || [];
        casMatches.forEach(push);

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

function highlightText(text: string, keywords: string[]): ReactNode {
    if (!text || keywords.length === 0) return text;

    const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const splitRegex = new RegExp(`(${pattern})`, 'gi');
    const exactRegex = new RegExp(`^(${pattern})$`, 'i');
    const parts = text.split(splitRegex);

    if (parts.length === 1) return text;

    return parts.map((part, idx) =>
        exactRegex.test(part) ? (
            <mark key={idx} className="bg-yellow-200 text-yellow-900 px-0.5 rounded-sm font-semibold">{part}</mark>
        ) : (
            <span key={idx}>{part}</span>
        )
    );
}

function normalizeKiprisQuery(query: string): string {
    const compact = query.replace(/\s+/g, '').trim();
    const match = compact.match(/^(\d{2})(\d{4})(\d{7})$/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return query.trim();
}

function isKiprisApplicationNumber(query: string): boolean {
    const compact = query.replace(/[\s-]/g, '').trim();
    return /^\d{13}$/.test(compact);
}

function buildKiprisSearchUrl(query: string): string {
    const normalized = normalizeKiprisQuery(query);
    const url = new URL('https://www.kipris.or.kr/khome/search/searchResult.do');
    url.searchParams.set('tab', 'patent');
    url.searchParams.set('queryText', normalized);
    if (isKiprisApplicationNumber(normalized)) {
        // Restrict to application-number field search for direct hit reliability.
        url.searchParams.set('strstat', 'SMART|AN|');
    }
    return url.toString();
}

export default function PatentDetailModal({ isOpen, onClose, patent, searchQuery = '' }: PatentDetailModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [kiprisDetail, setKiprisDetail] = useState<KiprisDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const applicationNumber = patent?.applicationNumber || '';

    useEffect(() => {
        let cancelled = false;
        if (!isOpen || !applicationNumber) {
            setKiprisDetail(null);
            setDetailError('');
            setDetailLoading(false);
            return;
        }

        const fetchDetail = async () => {
            setDetailLoading(true);
            setDetailError('');
            try {
                const res = await fetch(`/api/patents/kipris/${encodeURIComponent(applicationNumber)}`);
                const raw = await res.text();
                let parsed: unknown = {};
                if (raw) {
                    try {
                        parsed = JSON.parse(raw);
                    } catch {
                        parsed = {};
                    }
                }

                if (!res.ok) {
                    const detail =
                        parsed &&
                        typeof parsed === 'object' &&
                        'detail' in parsed &&
                        typeof (parsed as { detail?: unknown }).detail === 'string'
                            ? (parsed as { detail: string }).detail
                            : `HTTP ${res.status}`;
                    throw new Error(detail);
                }

                const data = (parsed && typeof parsed === 'object' ? parsed : {}) as KiprisDetail;
                if (!cancelled) {
                    setKiprisDetail(data);
                }
            } catch (e) {
                if (!cancelled) {
                    setKiprisDetail(null);
                    setDetailError(e instanceof Error ? e.message : 'detail fetch failed');
                }
            } finally {
                if (!cancelled) {
                    setDetailLoading(false);
                }
            }
        };

        fetchDetail();
        return () => {
            cancelled = true;
        };
    }, [isOpen, applicationNumber]);

    if (!isOpen || !patent) return null;

    const getExternalUrl = () => {
        if (isKipris) {
            const queryText = patent.applicationNumber || patent.inventionTitle || patent.title || searchQuery;
            return buildKiprisSearchUrl(queryText || '');
        }

        if (patent.jurisdiction && patent.patent_id) {
            const cleanId = patent.patent_id.replace(/[^a-zA-Z0-9]/g, '');
            const prefix = (patent.jurisdiction || '').toUpperCase();
            const normalizedId = cleanId.toUpperCase().startsWith(prefix) ? cleanId : `${prefix}${cleanId}`;
            return `https://patents.google.com/patent/${normalizedId}`;
        }

        return `https://patents.google.com/?q=${encodeURIComponent(patent.title || '')}`;
    };

    const isKipris = !!patent.applicationNumber;
    const summaryText = kiprisDetail?.abstract || patent.abstract || patent.snippet || '';
    const highlightKeywords = buildHighlightKeywords(
        searchQuery,
        patent.matched_term,
    );
    const claims = kiprisDetail?.claims || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div className="pr-8">
                        <div className="flex items-center gap-2 mb-2">
                            {isKipris ? (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    KR (KIPRIS)
                                </span>
                            ) : (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${patent.jurisdiction === 'US' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    patent.jurisdiction === 'EP' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                        patent.jurisdiction === 'WO' ? 'bg-green-100 text-green-700 border-green-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'
                                    }`}>
                                    {patent.jurisdiction || 'Global'}
                                </span>
                            )}
                            <span className="text-xs font-mono text-gray-500">
                                {patent.patent_id || patent.applicationNumber}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">
                            {patent.title || patent.inventionTitle}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {(kiprisDetail?.applicantName || patent.applicantName) && (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-xs font-semibold text-gray-500 block mb-1">Applicant</span>
                                <span className="text-sm font-medium text-gray-900">{kiprisDetail?.applicantName || patent.applicantName}</span>
                            </div>
                        )}
                        {(kiprisDetail?.registerStatus || patent.registerStatus) && (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-xs font-semibold text-gray-500 block mb-1">Status</span>
                                <span className={`text-sm font-bold ${(kiprisDetail?.registerStatus || patent.registerStatus) === '등록' ? 'text-green-600' : 'text-gray-900'
                                    }`}>{(() => { const s = kiprisDetail?.registerStatus || patent.registerStatus; return s === '등록' ? 'Registered' : s === '공개' ? 'Published' : s; })()}</span>
                            </div>
                        )}
                        {patent.matched_term && (
                            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                                <span className="text-xs font-semibold text-yellow-700 block mb-1">Matched Keyword</span>
                                <span className="text-sm font-bold text-yellow-900">{patent.matched_term}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            {isKipris ? 'Abstract' : 'Relevant Snippet'}
                        </h3>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-700 leading-relaxed text-sm">
                            {detailLoading ? (
                                <span className="text-gray-500">Loading KIPRIS detail...</span>
                            ) : summaryText ? (
                                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap">
                                    {highlightText(summaryText, highlightKeywords)}
                                </div>
                            ) : (
                                <span className="text-gray-500 italic">No detailed abstract available.</span>
                            )}
                        </div>
                        {detailError && (
                            <div className="text-xs text-red-500">KIPRIS detail load error: {detailError}</div>
                        )}
                        {claims.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                    Claims ({claims.length})
                                </h4>
                                <div className="max-h-48 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                    {claims.slice(0, 8).map((claim, idx) => (
                                        <p key={idx} className="text-xs text-gray-700 whitespace-pre-wrap">
                                            {highlightText(claim, highlightKeywords)}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                    <a
                        href={getExternalUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all"
                    >
                        <ExternalLink className="w-4 h-4" />
                        {isKipris ? 'Open in KIPRIS' : 'Open in Google Patents'}
                    </a>
                </div>
            </div>
        </div>
    );
}
