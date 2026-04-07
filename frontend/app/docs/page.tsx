"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import dynamic from "next/dynamic";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import { FileText, ChevronLeft, Clock, FolderOpen } from "lucide-react";

interface DocItem {
  filename: string;
  size: number;
  modified: number;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/docs/list")
      .then((r) => r.json())
      .then((d) => setDocs(d.docs || []))
      .catch(() => {});
  }, []);

  async function openDoc(filename: string) {
    setLoading(true);
    setSelected(filename);
    try {
      const r = await fetch(`/api/docs/${encodeURIComponent(filename)}`);
      const d = await r.json();
      setContent(d.content || "");
    } catch {
      setContent("Failed to load document.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {!selected ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-900 rounded-lg">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Project Documents
              </h1>
              <span className="text-sm text-gray-500">
                {docs.length} documents
              </span>
            </div>

            <div className="grid gap-3">
              {docs.map((doc) => (
                <button
                  key={doc.filename}
                  onClick={() => openDoc(doc.filename)}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all text-left group"
                >
                  <FileText className="w-5 h-5 text-gray-500 group-hover:text-gray-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {doc.filename.replace(/\.md$/, "").replace(/_/g, " ")}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.modified)}
                      </span>
                      <span>{formatSize(doc.size)}</span>
                    </div>
                  </div>
                </button>
              ))}
              {docs.length === 0 && (
                <p className="text-gray-500 text-center py-12">
                  No documents found.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setSelected(null);
                setContent("");
              }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to list
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-10">
              {loading ? (
                <p className="text-gray-500 text-center py-12">
                  Loading...
                </p>
              ) : (
                <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-table:text-sm">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </article>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
