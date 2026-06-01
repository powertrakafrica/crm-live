"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldCheck, FileText, UploadCloud, Map, UserCheck, Search, ChevronRight, Activity, Building, Clock, MapPin, CheckCircle2, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ownerApi, uploadApi, verificationApi } from "@/lib/api";

interface OwnerVerificationItem {
    id: number;
    propertyId: number;
    propertyTitle: string;
    status: string;
    tier?: string | null;
    reviewNotes?: string | null;
    certificateUrl?: string | null;
    checks: { id: number; checkType: string; status: string; evidenceUrl?: string | null }[];
}

const STAGES = [
    { id: "pending_upload", label: "Pending Upload", icon: <UploadCloud className="h-4 w-4" /> },
    { id: "admin_review", label: "Admin Reviewing", icon: <UserCheck className="h-4 w-4" /> },
    { id: "agent_visit", label: "Agent Visit Scheduled", icon: <Map className="h-4 w-4" /> },
    { id: "verified", label: "Verified", icon: <ShieldCheck className="h-4 w-4" /> },
];

function mapStatusToStage(status: string) {
    switch (status) {
        case "Unverified":
        case "DocumentsUploaded": return "pending_upload";
        case "UnderReview": return "admin_review";
        case "AgentAssigned": return "agent_visit";
        case "Verified": return "verified";
        case "Rejected": return "pending_upload";
        default: return "pending_upload";
    }
}

const REQUIRED_DOCS: Record<string, { label: string; checkType: string; icon: typeof FileText }> = {
    indenture: { label: "Indenture / Title Deed", checkType: "OwnershipDocument", icon: FileText },
    sitePlan: { label: "Site Plan", checkType: "GPSLocation", icon: MapPin },
    ghanaCard: { label: "Ghana Card", checkType: "LandCommissionSearch", icon: ShieldCheck },
};

export function OwnerVerification() {
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium" | null>(null);
    const [properties, setProperties] = useState<OwnerVerificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState<Record<string, boolean>>({});
    const [uploadError, setUploadError] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        ownerApi.verifications()
            .then((data: any) => {
                const mapped = (data ?? []).map((v: any) => ({
                    ...v,
                    status: mapStatusToStage(v.status),
                }));
                setProperties(mapped);
                if (mapped.length > 0) setSelectedPropertyId(mapped[0].id);
            })
            .catch((err: any) => setError(err.message || "Failed to load verifications"))
            .finally(() => setLoading(false));
    }, []);

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

    const getStageIndex = (status: string) => Math.max(0, STAGES.findIndex(s => s.id === status));
    const currentStageIndex = selectedProperty ? getStageIndex(selectedProperty.status) : 0;

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
        const file = event.target.files?.[0];
        if (!file || !selectedProperty) return;

        const docConfig = REQUIRED_DOCS[docKey];
        if (!docConfig) return;

        const check = selectedProperty.checks.find((c: any) => c.checkType === docConfig.checkType);
        if (!check) {
            setUploadError(prev => ({ ...prev, [docKey]: "No matching verification check found" }));
            return;
        }

        setUploading(prev => ({ ...prev, [docKey]: true }));
        setUploadError(prev => ({ ...prev, [docKey]: "" }));

        try {
            const presign = await uploadApi.presign(file.name, "verification-docs", file.type);
            const uploadRes = await fetch(presign.url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });
            if (!uploadRes.ok) throw new Error("Upload failed");

            await verificationApi.submitEvidence(selectedProperty.id, check.id, {
                evidenceUrl: presign.publicUrl,
                notes: `${docConfig.label} uploaded by owner`,
            });

            // Refresh local state
            setProperties(prev => prev.map(p => {
                if (p.id !== selectedProperty.id) return p;
                return {
                    ...p,
                    checks: p.checks.map(c =>
                        c.id === check.id ? { ...c, evidenceUrl: presign.publicUrl, status: "Pending" } : c
                    ),
                };
            }));
        } catch (err: any) {
            setUploadError(prev => ({ ...prev, [docKey]: err.message || "Upload failed" }));
        } finally {
            setUploading(prev => ({ ...prev, [docKey]: false }));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!selectedProperty || !selectedTier) return;
        setSubmitting(true);
        setError("");
        try {
            // In a real flow this would trigger the verification pipeline
            // For now we just show a success state
            setProperties(prev => prev.map(p =>
                p.id === selectedProperty.id ? { ...p, status: "admin_review" as any, tier: selectedTier } : p
            ));
        } catch (err: any) {
            setError(err.message || "Submit failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <p className="text-charcoal-500 font-medium">Loading verifications...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950">The Trust Engine</h2>
                <p className="text-charcoal-500 font-medium">Clear verification to "Level Up" your listings for top-tier search placement.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Column: Properties needing verification */}
                <Card className="col-span-1 border-charcoal-200 shadow-sm rounded-sm max-h-[75vh] flex flex-col">
                    <div className="p-4 border-b border-charcoal-100 bg-charcoal-50">
                        <h3 className="font-bold text-charcoal-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" /> Action Required ({properties.length})
                        </h3>
                    </div>
                    <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        {properties.length === 0 ? (
                            <div className="p-6 text-charcoal-500 font-medium">No pending verifications.</div>
                        ) : properties.map(p => (
                            <div
                                key={p.id}
                                onClick={() => {
                                    setSelectedPropertyId(p.id);
                                    setSelectedTier(p.tier as any);
                                }}
                                className={`p-4 border-b border-charcoal-100 cursor-pointer transition-colors relative ${selectedPropertyId === p.id ? "bg-brand-50 border-l-4 border-l-brand-600" : "hover:bg-charcoal-50 border-l-4 border-l-transparent"}`}
                            >
                                <h4 className="font-bold text-charcoal-900 text-sm line-clamp-1">{p.propertyTitle}</h4>
                                <div className="mt-2 flex gap-2">
                                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shadow-none ${p.status === 'pending_upload' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {STAGES.find(s => s.id === p.status)?.label}
                                    </Badge>
                                </div>
                                <ChevronRight className="h-4 w-4 text-charcoal-300 absolute right-4 top-1/2 -translate-y-1/2" />
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Right Column: Verification Flow */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {!selectedProperty ? (
                        <Card className="border-charcoal-200 shadow-sm rounded-sm bg-charcoal-50/50 flex flex-col items-center justify-center p-12 text-center h-[500px]">
                            <ShieldCheck className="h-16 w-16 text-charcoal-300 mb-4" />
                            <h3 className="font-bold text-charcoal-600 text-lg">Select a Property</h3>
                            <p className="text-sm text-charcoal-500 mt-2 max-w-sm">Choose a pending listing from the sidebar to begin the verification process and boost your visibility.</p>
                        </Card>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Status Tracker */}
                            <Card className="border-charcoal-200 shadow-sm rounded-sm overflow-hidden">
                                <div className="p-4 border-b border-charcoal-100 bg-white">
                                    <h3 className="font-bold text-charcoal-900 line-clamp-1">{selectedProperty.propertyTitle}</h3>
                                    <p className="text-xs text-brand-600 font-bold uppercase tracking-widest mt-0.5">Application Track</p>
                                </div>
                                <CardContent className="p-6 bg-charcoal-50">
                                    <div className="relative">
                                        <div className="absolute top-1/2 left-0 w-full h-1 bg-charcoal-200 -translate-y-1/2 z-0 rounded-full"></div>
                                        <div
                                            className="absolute top-1/2 left-0 h-1 bg-brand-600 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                                            style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
                                        ></div>

                                        <div className="flex justify-between relative z-10">
                                            {STAGES.map((stage, i) => {
                                                const isActive = i <= currentStageIndex;
                                                const isCurrent = i === currentStageIndex;
                                                return (
                                                    <div key={stage.id} className="flex flex-col items-center gap-2 group">
                                                        <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                            isActive ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-600/20" : "bg-white border-charcoal-300 text-charcoal-400"
                                                        } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}>
                                                            {i < currentStageIndex ? <CheckCircle2 className="h-5 w-5" /> : stage.icon}
                                                        </div>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider text-center max-w-[80px] leading-tight ${
                                                            isCurrent ? "text-brand-700" : isActive ? "text-charcoal-900" : "text-charcoal-400"
                                                        }`}>
                                                            {stage.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {currentStageIndex === 0 && (
                                        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-800 text-sm font-medium flex gap-2">
                                            <Activity className="h-5 w-5 shrink-0" />
                                            <span>Action required: Awaiting document upload and tier selection below to trigger the Admin Review.</span>
                                        </div>
                                    )}
                                    {currentStageIndex > 0 && (
                                        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-sm text-blue-800 text-sm font-medium flex gap-2">
                                            <ShieldCheck className="h-5 w-5 shrink-0" />
                                            <span>Your verification is actively processing in the Trust Engine pipeline. You will be notified of any updates.</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Verification Tiers */}
                            {currentStageIndex === 0 && (
                                <>
                                    <h3 className="font-heading font-bold text-lg text-charcoal-950 px-1">Select Verification Tier</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: "basic", name: "Basic", price: "Free", desc: "Identity match only.", features: ["ID Verification", "Standard Search"] },
                                            { id: "standard", name: "Standard", price: "GH₵ 150", desc: "Document check.", features: ["ID Match", "Document Auth", "+15% Search Boost"] },
                                            { id: "premium", name: "Premium", price: "GH₵ 500", desc: "Physical site audit.", features: ["Agent Visit", "TEPS Badge", "+50% Search Boost", "Virtual Tour Setup"] }
                                        ].map(tier => (
                                            <div
                                                key={tier.id}
                                                onClick={() => {
                                                    if (currentStageIndex === 0) setSelectedTier(tier.id as any);
                                                }}
                                                className={`border-2 rounded-sm p-5 transition-all flex flex-col h-full relative overflow-hidden ${
                                                    selectedTier === tier.id ? "border-brand-600 shadow-sm bg-brand-50/30" : "border-charcoal-200 bg-white"
                                                } ${currentStageIndex === 0 ? "cursor-pointer hover:border-brand-300" : "opacity-70 cursor-not-allowed"}`}
                                            >
                                                {tier.id === "premium" && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-6 py-1 translate-x-4 translate-y-2 rotate-45 shadow-sm">Popular</div>}
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className={`font-bold text-lg ${selectedTier === tier.id ? "text-brand-900" : "text-charcoal-900"}`}>{tier.name}</h4>
                                                    <span className="font-bold text-sm bg-charcoal-100 text-charcoal-700 px-2 py-0.5 rounded-sm">{tier.price}</span>
                                                </div>
                                                <p className="text-xs text-charcoal-500 font-medium mb-4">{tier.desc}</p>
                                                <ul className="space-y-1.5 mt-auto text-xs font-semibold text-charcoal-700">
                                                    {tier.features.map(f => (
                                                        <li key={f} className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-brand-600 shrink-0"/> {f}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Document Submission */}
                                    {selectedTier && selectedTier !== "basic" && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200 space-y-4">
                                            <h3 className="font-heading font-bold text-lg text-charcoal-950 px-1">Required Documents</h3>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => {
                                                    const key = (e.target as HTMLInputElement).dataset.docKey;
                                                    if (key) handleFileSelect(e, key);
                                                }}
                                            />
                                            <div className="grid grid-cols-1 gap-3">
                                                {Object.entries(REQUIRED_DOCS).map(([key, doc]) => {
                                                    const check = selectedProperty.checks.find((c: any) => c.checkType === doc.checkType);
                                                    const hasEvidence = !!check?.evidenceUrl;
                                                    const isUploading = uploading[key];
                                                    const err = uploadError[key];
                                                    return (
                                                        <Card key={key} className={`border-charcoal-200 shadow-sm rounded-sm ${hasEvidence ? "border-green-300 bg-green-50/30" : "border-dashed bg-white"}`}>
                                                            <CardContent className="p-5 flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${hasEvidence ? "bg-green-100 text-green-600" : "bg-brand-100 text-brand-600"}`}>
                                                                        {hasEvidence ? <CheckCircle2 className="h-6 w-6" /> : <doc.icon className="h-6 w-6" />}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className={`font-bold text-sm ${hasEvidence ? "text-green-900" : "text-charcoal-900"}`}>{doc.label}</h4>
                                                                        <p className="text-xs text-charcoal-500 mt-0.5">
                                                                            {hasEvidence ? "Document uploaded successfully" : "Upload scanned PDF or high-res image"}
                                                                        </p>
                                                                        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
                                                                    </div>
                                                                </div>
                                                                {hasEvidence ? (
                                                                    <a
                                                                        href={check!.evidenceUrl!}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                                                                    >
                                                                        View
                                                                    </a>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled={isUploading}
                                                                        onClick={() => {
                                                                            if (fileInputRef.current) {
                                                                                fileInputRef.current.dataset.docKey = key;
                                                                                fileInputRef.current.click();
                                                                            }
                                                                        }}
                                                                        className="border-charcoal-200 shadow-sm font-bold bg-white text-charcoal-700"
                                                                    >
                                                                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-1" />}
                                                                        {isUploading ? "Uploading..." : "Upload"}
                                                                    </Button>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            disabled={!selectedTier || currentStageIndex > 0 || submitting}
                                            onClick={handleSubmit}
                                            className="h-11 px-8 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-sm"
                                        >
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            {currentStageIndex > 0 ? "Pipeline Active" : "Submit for Verification"}
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
