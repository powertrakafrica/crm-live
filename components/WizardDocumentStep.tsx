"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DOCUMENT_TYPES } from "@/lib/api";

export interface PendingDoc {
    documentType: string;
    file: File;
    id: string;
    label?: string;
}

// Step 5 of the create wizards: queues verification documents (title deed,
// indenture, …) for upload AFTER the property is created (the upload needs
// the new propertyId). No network calls happen here — the parent's
// handlePublish consumes `docs` via presign -> S3 PUT -> propertiesApi.addDocument,
// mirroring OwnerDocumentsModal.tsx. The step is skippable (parent's canContinue
// returns true for step 5).
export function WizardDocumentStep({ docs, setDocs, disabled }: {
    docs: PendingDoc[];
    setDocs: (d: PendingDoc[]) => void;
    disabled?: boolean;
}) {
    const [documentType, setDocumentType] = useState("TitleDeed");
    const [label, setLabel] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [msg, setMsg] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isOther = documentType === "Other";
    const labelRequired = isOther && !label.trim();

    const addDoc = () => {
        if (!file) { setMsg("Choose a file first."); return; }
        if (labelRequired) { setMsg("A label is required for 'Other'."); return; }
        const entry: PendingDoc = {
            documentType,
            file,
            id: `${documentType}-${file.name}-${file.size}`,
            label: isOther ? label.trim() : undefined,
        };
        setDocs([...docs, entry]);
        setFile(null);
        setLabel("");
        setMsg("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeDoc = (id: string) => setDocs(docs.filter((d) => d.id !== id));

    const docLabel = (d: PendingDoc) => {
        const named = DOCUMENT_TYPES.find((t) => t.value === d.documentType)?.label ?? d.documentType;
        return d.documentType === "Other" && d.label ? `${named}: ${d.label}` : named;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-2">
                <h4 className="font-bold text-lg text-charcoal-900">Verification Documents</h4>
                <p className="text-sm text-charcoal-500">
                    Upload ownership + verification docs now (optional). An ownership document (title deed,
                    indenture, site plan, allocation letter, sale agreement, or power of attorney)
                    auto-starts verification. You can also add these later from the property.
                </p>
            </div>

            <div className="space-y-3 border border-charcoal-200 rounded-sm p-4 bg-charcoal-50/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        disabled={disabled}
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
                            disabled={disabled}
                            className="bg-white border border-charcoal-200 text-sm rounded-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-600 text-charcoal-800"
                        />
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={disabled}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-charcoal-600 file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border-0 file:bg-brand-50 file:text-brand-700 file:font-bold"
                />
                <div className="flex items-center gap-3">
                    <Button type="button" onClick={addDoc} disabled={disabled || !file || !!labelRequired} className="h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm">
                        <UploadCloud className="h-4 w-4 mr-1" /> Add to queue
                    </Button>
                    {msg && <span className="text-xs text-red-600 font-medium">{msg}</span>}
                </div>
            </div>

            {docs.length === 0 ? (
                <p className="text-sm text-charcoal-500 font-medium text-center py-4">No documents queued. This step is optional — you can upload later.</p>
            ) : (
                <div className="space-y-2">
                    {docs.map((d) => (
                        <div key={d.id} className="flex items-center justify-between border border-charcoal-200 rounded-sm p-3 bg-white">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0"><FileText className="h-5 w-5" /></div>
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-charcoal-900 truncate">{docLabel(d)}</div>
                                    <div className="text-xs text-charcoal-500 mt-0.5 truncate">{d.file.name}</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => removeDoc(d.id)} disabled={disabled} className="text-charcoal-400 hover:text-red-600 p-1" title="Remove">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}