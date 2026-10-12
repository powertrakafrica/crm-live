"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

import { fetchPrivateFile, isApiUrl } from "@/lib/api";

interface DocumentViewerProps {
    url: string | null;
    title?: string;
    isOpen: boolean;
    onClose: () => void;
}

type DocKind = "image" | "other" | "pdf";

// What we have for the current document. Private files (served by the API's
// /files proxy) are downloaded first and shown from a local object URL, so the
// viewer knows when loading finished and why it failed; public URLs are used
// directly.
type Loaded =
    | { canRetry: boolean; message: string; status: "error" }
    | { status: "loading" }
    | { kind: DocKind; src: string; status: "ready" };

function kindFromPath(url: string): DocKind {
    const path = url.split("?")[0].split("#")[0].toLowerCase();
    if (path.endsWith(".pdf")) return "pdf";
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return "image";
    return "other";
}

function kindFromType(type: string, url: string): DocKind {
    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "pdf";
    return kindFromPath(url);
}

function extensionOf(url: string): string {
    const match = /\.([a-z0-9]{2,5})$/i.exec(url.split("?")[0].split("#")[0]);
    return match ? `.${match[1].toLowerCase()}` : "";
}

// A refusal (no access, gone, signed out) will fail the same way again, so only
// a network or server problem offers "Try again".
function describeFailure(status: number | undefined): { canRetry: boolean; message: string } {
    if (status === 401) return { canRetry: false, message: "Your session has ended. Sign in again to view this document." };
    if (status === 403) return { canRetry: false, message: "You don't have access to this document." };
    if (status === 404) return { canRetry: false, message: "This document is no longer available." };
    return { canRetry: true, message: "This document couldn't be loaded. Check your connection and try again." };
}

// Zooming always shows more than the fitted view: the image's real pixel size,
// or twice the fitted size when the file is no bigger than the screen.
const MIN_ZOOM_FACTOR = 2;

const TOOL =
    "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// Full-screen viewer for an uploaded document. The file is the subject, so the
// chrome is one quiet bar on a dark backdrop: an image is shown at the size it
// fits (click to see it at full size — these are mostly ID cards and scans that
// people need to read), a PDF gets the browser's own reader in a page-shaped
// panel.
export function DocumentViewer({ url, title = "Document", isOpen, onClose }: DocumentViewerProps) {
    const [attempt, setAttempt] = useState(0);
    const [tracked, setTracked] = useState<null | string>(null);
    const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
    // Width in px of the zoomed image, or null when it is fitted to the screen.
    const [zoomWidth, setZoomWidth] = useState<null | number>(null);
    const [imageBroken, setImageBroken] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const zoomed = zoomWidth !== null;

    // Render-phase reset when a different document is opened or a retry is asked
    // for (React's "adjust state when a prop changes" pattern — no effect needed).
    const key = isOpen && url ? `${url}#${String(attempt)}` : null;
    if (key !== tracked) {
        setTracked(key);
        setZoomWidth(null);
        setImageBroken(false);
        setLoaded(url && !isApiUrl(url) ? { kind: kindFromPath(url), src: url, status: "ready" } : { status: "loading" });
    }

    // Private files: download with the session cookie, show from an object URL.
    useEffect(() => {
        if (!key || !url || !isApiUrl(url)) return;
        let alive = true;
        let objectUrl: null | string = null;
        fetchPrivateFile(url)
            .then((blob) => {
                if (!alive) return;
                objectUrl = URL.createObjectURL(blob);
                setLoaded({ kind: kindFromType(blob.type, url), src: objectUrl, status: "ready" });
            })
            .catch((err: unknown) => {
                if (!alive) return;
                setLoaded({ ...describeFailure((err as { status?: number }).status), status: "error" });
            });
        return () => {
            alive = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [key, url]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        // Move focus into the dialog (the container itself, so no control shows a
        // focus ring until the keyboard is actually used).
        dialogRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !url) return null;

    const ready = loaded.status === "ready" ? loaded : null;
    const failed = loaded.status === "error" || imageBroken;
    const failure = loaded.status === "error" ? loaded : describeFailure(undefined);
    const toggleZoom = () => {
        const img = imageRef.current;
        if (zoomed || !img) {
            setZoomWidth(null);
            return;
        }
        setZoomWidth(Math.round(Math.max(img.naturalWidth, img.getBoundingClientRect().width * MIN_ZOOM_FACTOR)));
    };
    const showImage = ready?.kind === "image" && !imageBroken;
    const fileName = `${title.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "document"}${extensionOf(url)}`;

    return (
        <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[60] flex flex-col bg-slate-950/90 backdrop-blur-sm outline-none animate-fade-in"
            onClick={onClose}
        >
            <header
                className="flex h-14 shrink-0 items-center justify-between gap-3 px-3 sm:px-5"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{title}</h2>
                <div className="flex shrink-0 items-center gap-0.5">
                    {showImage && (
                        <button type="button" onClick={toggleZoom} className={TOOL} aria-label={zoomed ? "Fit to screen" : "Zoom in"}>
                            {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                            <span className="hidden sm:inline">{zoomed ? "Fit to screen" : "Zoom in"}</span>
                        </button>
                    )}
                    {ready && !failed && (
                        <>
                            <a href={ready.src} download={fileName} className={TOOL} aria-label="Download">
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Download</span>
                            </a>
                            <a href={ready.src} target="_blank" rel="noopener noreferrer" className={TOOL} aria-label="Open in new tab">
                                <ExternalLink className="h-4 w-4" />
                                <span className="hidden sm:inline">Open in new tab</span>
                            </a>
                        </>
                    )}
                    <button type="button" onClick={onClose} className={`${TOOL} px-2`} aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className="relative min-h-0 flex-1">
                {loaded.status === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70" role="status">
                        <Loader2 className="h-7 w-7 animate-spin" />
                        <span className="text-sm font-medium">Loading document</span>
                    </div>
                )}

                {failed && (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div
                            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AlertCircle className="mx-auto h-9 w-9 text-accent-600" />
                            <p className="mt-3 text-sm font-medium text-slate-800">{failure.message}</p>
                            <div className="mt-5 flex justify-center gap-2">
                                {failure.canRetry && (
                                    <button
                                        type="button"
                                        onClick={() => setAttempt((n) => n + 1)}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                    >
                                        <RotateCw className="h-4 w-4" /> Try again
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={`inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                                        failure.canRetry ? "text-slate-600 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-slate-700"
                                    }`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showImage && ready && (
                    // The scroller fills the stage; the inner box is at least as big
                    // as the stage (so a small image centres) and grows with a
                    // full-size image (so every edge can be scrolled to).
                    <div className="h-full w-full overflow-auto">
                        <div className={`flex min-h-full min-w-full items-center justify-center p-3 sm:p-6 ${zoomed ? "w-max" : "h-full"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- private blob/object URL; next/image cannot optimise it */}
                            <img
                                ref={imageRef}
                                src={ready.src}
                                alt={title}
                                style={zoomed ? { width: zoomWidth } : undefined}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleZoom();
                                }}
                                onError={() => setImageBroken(true)}
                                className={`rounded-md bg-white shadow-2xl ${
                                    zoomed ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"
                                }`}
                            />
                        </div>
                    </div>
                )}

                {ready?.kind === "pdf" && !failed && (
                    <div className="mx-auto h-full w-full max-w-5xl px-0 pb-0 sm:px-5 sm:pb-5" onClick={(e) => e.stopPropagation()}>
                        <iframe src={ready.src} title={title} className="h-full w-full border-0 bg-white sm:rounded-lg" />
                    </div>
                )}

                {ready?.kind === "other" && !failed && (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div
                            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <FileText className="mx-auto h-9 w-9 text-slate-400" />
                            <p className="mt-3 text-sm font-medium text-slate-800">This file type can&apos;t be previewed here.</p>
                            <a
                                href={ready.src}
                                download={fileName}
                                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                            >
                                <Download className="h-4 w-4" /> Download
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
