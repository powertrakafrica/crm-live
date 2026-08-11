"use client";

import { useEffect, useState } from "react";
import { X, Download, ExternalLink, FileText, Loader2 } from "lucide-react";

interface DocumentViewerProps {
    url: string | null;
    title?: string;
    isOpen: boolean;
    onClose: () => void;
}

// Private docs are served through the GET /api/files/<key> proxy, which
// authorizes via the session cookie. The frontend and API share a registrable
// domain (same-site, different origin), so SameSite=Lax cookies ride embedded
// <iframe>/<img> requests just like they do top-level navigations — that's what
// lets us render the bytes inline instead of opening a new tab.
type DocKind = "pdf" | "image" | "other";

function detectKind(url: string): DocKind {
    const path = url.split("?")[0].split("#")[0].toLowerCase();
    if (path.endsWith(".pdf")) return "pdf";
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return "image";
    return "other";
}

// Uploaded documents render inline here instead of jumping to a new tab.
// PDFs use the browser's native viewer inside a large <iframe>; images are
// shown with object-contain so large scans still fit. A fallback "open" link
// is kept for anything we can't preview inline.
export function DocumentViewer({ url, title = "Document", isOpen, onClose }: DocumentViewerProps) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        // Some browser PDF viewers don't fire a reliable load event on the
        // iframe; bail out of the spinner after a beat so the doc isn't hidden.
        const fade = setTimeout(() => setLoading(false), 4000);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "unset";
            clearTimeout(fade);
        };
    }, [isOpen, onClose, url]);

    if (!isOpen || !url) return null;
    const kind = detectKind(url);

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[88vh] max-h-[92vh] overflow-hidden animate-scale-in border border-slate-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 truncate">{title}</h2>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink className="h-4 w-4" /> Open
                        </a>
                        <a
                            href={url}
                            download
                            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Download"
                        >
                            <Download className="h-4 w-4" /> Download
                        </a>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 bg-slate-100 overflow-hidden">
                    {loading && kind !== "other" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="text-sm font-medium">Loading document…</span>
                        </div>
                    )}

                    {kind === "pdf" && (
                        <iframe
                            src={url}
                            title={title}
                            className="w-full h-full border-0 bg-white"
                            onLoad={() => setLoading(false)}
                        />
                    )}

                    {kind === "image" && (
                        <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                            <img
                                src={url}
                                alt={title}
                                className="max-w-full max-h-full object-contain shadow-md"
                                onLoad={() => setLoading(false)}
                            />
                        </div>
                    )}

                    {kind === "other" && (
                        <div className="flex flex-col items-center justify-center gap-3 h-full text-slate-600">
                            <FileText className="h-12 w-12 text-slate-400" />
                            <p className="text-sm font-medium">Inline preview isn't available for this file type.</p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" /> Open file
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}