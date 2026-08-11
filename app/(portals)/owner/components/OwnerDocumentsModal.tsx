"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2, X, FileText, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
    DOCUMENT_TYPES,
    type PropertyDocument,
    fileProxyUrl,
    propertiesApi,
    uploadApi,
} from "@/lib/api";

function DocStatusBadge({ status }: { status: PropertyDocument["status"] }) {
    const cls =
        status === "Approved" ? "bg-green-100 text-green-700 border-green-200"
        : status === "Rejected" ? "bg-red-100 text-red-700 border-red-200"
        : "bg-amber-100 text-amber-700 border-amber-200";
    return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shadow-none ${cls}`}>{status}</Badge>;
}

function docLabel(d: PropertyDocument): string {
    const named = DOCUMENT_TYPES.find((t) => t.value === d.documentType)?.label ?? d.documentType;
    return d.documentType === "Other" && d.label ? `${named}: ${d.label}` : named;
}

export function OwnerDocumentsModal({ propertyId, propertyTitle, onClose }: {
    propertyId: number;
    propertyTitle: string;
    onClose: () => void;
}) {
    const [docs, setDocs] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [documentType, setDocumentType] = useState<string>("TitleDeed");
    const [label, setLabel] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState("");
    const [deleteDocTarget, setDeleteDocTarget] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const load = () => {
        setLoading(true);
        propertiesApi.listDocuments(propertyId)
            .then((rows) => setDocs(rows as PropertyDocument[]))
            .catch((e: Error) => setError(e.message || "Failed to load documents"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [propertyId]);

    const isOther = documentType === "Other";
    const labelRequired = isOther && !label.trim();

    const handleUpload = async () => {
        if (!file) { setMsg("Choose a file first."); return; }
        if (labelRequired) { setMsg("A label is required for 'Other'."); return; }
        setUploading(true); setMsg("");
        try {
            const presign = await uploadApi.presign(file.name, "property-docs", file.type || undefined);
            const put = await fetch(presign.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
            if (!put.ok) throw new Error("Upload failed");
            await propertiesApi.addDocument(propertyId, {
                documentType,
                url: presign.publicUrl,
                label: isOther ? label.trim() : undefined,
            });
            setFile(null); setLabel(""); if (fileInputRef.current) fileInputRef.current.value = "";
            load();
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const confirmDeleteDoc = async () => {
        if (deleteDocTarget === null) return;
        setDeleting(true);
        try {
            await propertiesApi.deleteDocument(propertyId, deleteDocTarget);
            setDeleteDocTarget(null);
            load();
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-charcoal-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50 shrink-0">
                    <div>
                        <h3 className="font-heading font-bold text-lg text-charcoal-950">Property Documents</h3>
                        <p className="text-xs text-charcoal-500 font-medium mt-0.5">{propertyTitle}</p>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-sm bg-white border border-charcoal-200 text-charcoal-400 hover:text-charcoal-900 shadow-sm">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar bg-white grow space-y-6">
                    {/* Upload block */}
                    <div className="space-y-3 border border-charcoal-200 rounded-sm p-4 bg-charcoal-50/40">
                        <h4 className="font-bold text-sm text-charcoal-900">Add a document</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                                className="bg-white border border-charcoal-200 text-sm font-medium rounded-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-600 text-charcoal-800"
                            >
                                {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            {isOther && (
                                <input
                                    type="text"
                                    placeholder="Label (required)"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    className="bg-white border border-charcoal-200 text-sm rounded-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-600 text-charcoal-800"
                                />
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-xs text-charcoal-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border-0 file:bg-brand-50 file:text-brand-700 file:font-bold"
                        />
                        <div className="flex items-center gap-3">
                            <Button onClick={handleUpload} disabled={uploading || !file || !!labelRequired} className="h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm">
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UploadCloud className="h-4 w-4 mr-1" />}
                                {uploading ? "Uploading..." : "Upload"}
                            </Button>
                            {msg && <span className="text-xs text-red-600 font-medium">{msg}</span>}
                        </div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
                    ) : error ? (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-sm p-3">{error}</div>
                    ) : docs.length === 0 ? (
                        <p className="text-sm text-charcoal-500 font-medium text-center py-6">No documents yet. Add your title deed, indenture, or sale agreement above.</p>
                    ) : (
                        <div className="space-y-2">
                            {docs.map((d) => {
                                const href = fileProxyUrl(d.url) ?? undefined;
                                return (
                                    <div key={d.id} className="flex items-center justify-between border border-charcoal-200 rounded-sm p-3 bg-white">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0"><FileText className="h-5 w-5" /></div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-charcoal-900 truncate">{docLabel(d)}</div>
                                                <div className="text-xs text-charcoal-500 mt-0.5 flex items-center gap-2">
                                                    <DocStatusBadge status={d.status} />
                                                    <span>by {d.uploadedByName ?? "you"}</span>
                                                    {d.reviewedByName && <span>· reviewed by {d.reviewedByName}</span>}
                                                </div>
                                                {d.status === "Rejected" && d.notes && (
                                                    <div className="text-xs text-red-600 mt-1">Reason: {d.notes}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {href && (
                                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                                                    View <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                            <button onClick={() => setDeleteDocTarget(d.id)} className="text-charcoal-400 hover:text-red-600 p-1" title="Remove">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-[11px] text-charcoal-400 font-medium">Documents are private — only you, your assigned agent, and TEPS admins can view them. The public listing shows only the verified count.</p>
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteDocTarget !== null}
                onClose={() => setDeleteDocTarget(null)}
                onConfirm={confirmDeleteDoc}
                title="Remove document"
                message="Remove this document?"
                confirmLabel="Remove"
                busy={deleting}
            />
        </div>
    );
}