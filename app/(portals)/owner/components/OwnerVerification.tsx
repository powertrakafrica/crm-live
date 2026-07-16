"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, FileText, UploadCloud, Map, UserCheck, Search, ChevronRight, Activity, Clock, MapPin, CheckCircle2, Loader2, Image as ImageIcon, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DocumentViewer } from "@/components/ui/DocumentViewer";
import { fileProxyUrl, ownerApi, uploadApi, verificationApi } from "@/lib/api";

interface VerificationCheck {
    id: number;
    checkType: string;
    status: string;
    evidenceUrl?: string | null;
}

interface MergedProperty {
    id: number; // propertyId
    title: string;
    status: string;          // property status (Draft/Pending/Live/Archived)
    isVerified: boolean;
    verificationStatus: string;
    verification?: {
        id: number;          // verificationId
        status: string;
        reviewNotes?: string | null;
        certificateUrl?: string | null;
        checks: VerificationCheck[];
    };
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
        case "AgentAssigned":
        case "SiteVisitScheduled": return "agent_visit";
        case "Verified": return "verified";
        case "Rejected": return "pending_upload";
        default: return "pending_upload";
    }
}

// Check-centric evidence mapping. The backend seeds six verification checks per
// property (verification.service createVerification); the owner uploads evidence
// against whichever checks they can. This replaces the old 3-slot doc mapping
// (which mis-mapped Ghana Card → LandCommissionSearch and omitted Title Deed):
// the owner's title deed / indenture is now evidence for OwnershipDocument, the
// site plan for GPSLocation, etc. BoundaryWall + UtilitiesConnected are usually
// confirmed by the assigned agent on the site visit, but the owner may pre-load
// evidence.
const CHECK_LABELS: Record<string, { label: string; hint: string; icon: typeof FileText }> = {
    OwnershipDocument: { label: "Title Deed / Indenture", hint: "Proof of ownership — upload the title deed or indenture.", icon: FileText },
    GPSLocation: { label: "Site Plan / GPS Coordinates", hint: "Site plan or surveyed GPS coordinates for the plot.", icon: MapPin },
    LandCommissionSearch: { label: "Land Commission Search", hint: "Official land commission search result for the property.", icon: Search },
    PhotosMatch: { label: "Property Photos", hint: "Current photos matching the listing.", icon: ImageIcon },
    BoundaryWall: { label: "Boundary Wall", hint: "Boundary demarcation evidence (agent confirms on site visit).", icon: ShieldCheck },
    UtilitiesConnected: { label: "Utilities Connected", hint: "Water / electricity meter evidence (agent confirms on site visit).", icon: CheckCircle2 },
};
const CHECK_ORDER = ["OwnershipDocument", "GPSLocation", "LandCommissionSearch", "PhotosMatch", "BoundaryWall", "UtilitiesConnected"];

const TIERS = [
    { id: "basic", name: "Basic", price: "Free", desc: "Identity match only.", features: ["ID Verification", "Standard Search"] },
    { id: "standard", name: "Standard", price: "GH₵ 150", desc: "Document check.", features: ["ID Match", "Document Auth", "+15% Search Boost"] },
    { id: "premium", name: "Premium", price: "GH₵ 500", desc: "Physical site audit.", features: ["Agent Visit", "TEPS Badge", "+50% Search Boost", "Virtual Tour Setup"] },
];

export function OwnerVerification() {
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [selectedTier, setSelectedTier] = useState<string | null>(null);
    const [properties, setProperties] = useState<MergedProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState<Record<number, boolean>>({});
    const [uploadError, setUploadError] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = useCallback(async () => {
        try {
            const [props, verifs] = await Promise.all([
                ownerApi.properties() as Promise<any[]>,
                ownerApi.verifications() as Promise<any[]>,
            ]);
            const vByProp: Record<number, any> = {};
            for (const v of verifs ?? []) vByProp[v.propertyId] = v;
            const merged: MergedProperty[] = (props ?? []).map((p) => ({
                id: p.id,
                title: p.title,
                status: p.status,
                isVerified: !!p.isVerified,
                verificationStatus: p.verificationStatus ?? "Unverified",
                verification: vByProp[p.id],
            }));
            setProperties(merged);
            setSelectedPropertyId((prev) => {
                if (prev && merged.some((m) => m.id === prev)) return prev;
                return merged.length > 0 ? merged[0].id : null;
            });
        } catch (err: any) {
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null;

    const verificationStatus = selectedProperty?.verification?.status ?? selectedProperty?.verificationStatus ?? "Unverified";
    const stageId = mapStatusToStage(verificationStatus);
    const currentStageIndex = Math.max(0, STAGES.findIndex((s) => s.id === stageId));
    const hasVerification = !!selectedProperty?.verification;

    async function handleStartVerification() {
        if (!selectedProperty || !selectedTier) return;
        setSubmitting(true);
        setError("");
        try {
            await verificationApi.create(selectedProperty.id);
            await loadData();
        } catch (err: any) {
            setError(err.message || "Failed to start verification");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>, checkId: number) {
        const file = event.target.files?.[0];
        if (!file || !selectedProperty?.verification) return;

        setUploading((prev) => ({ ...prev, [checkId]: true }));
        setUploadError((prev) => ({ ...prev, [checkId]: "" }));
        try {
            const checkType = selectedProperty.verification.checks.find((c) => c.id === checkId)?.checkType ?? "Evidence";
            const { publicUrl } = await uploadApi.uploadFile(file, "verification-docs");
            await verificationApi.submitEvidence(selectedProperty.verification.id, checkId, {
                evidenceUrl: publicUrl,
                notes: `${CHECK_LABELS[checkType]?.label ?? checkType} uploaded by owner`,
            });
            // Reflect the uploaded evidence locally without a full reload.
            setProperties((prev) => prev.map((p) => {
                if (p.id !== selectedProperty.id || !p.verification) return p;
                return {
                    ...p,
                    verification: {
                        ...p.verification,
                        checks: p.verification.checks.map((c) =>
                            c.id === checkId ? { ...c, evidenceUrl: publicUrl, status: "Pending" } : c,
                        ),
                    },
                };
            }));
        } catch (err: any) {
            setUploadError((prev) => ({ ...prev, [checkId]: err.message || "Upload failed" }));
        } finally {
            setUploading((prev) => ({ ...prev, [checkId]: false }));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    // Agent notes timeline: the verification's reviewNotes is a newline-separated
    // audit trail (e.g. "[Site visit scheduled] Mon 10am", review decisions). Split
    // it into entries; empty → friendly placeholder.
    const noteEntries = (selectedProperty?.verification?.reviewNotes ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <p className="text-charcoal-500 font-medium">Loading verifications...</p>
                </div>
            </div>
        );
    }

    if (error && properties.length === 0) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <DocumentViewer
                url={viewer?.url ?? null}
                title={viewer?.title}
                isOpen={!!viewer}
                onClose={() => setViewer(null)}
            />
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950">The Trust Engine</h2>
                <p className="text-charcoal-500 font-medium">Start verification, upload your documents, and track your listing to verified status.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Column: Owner's properties */}
                <Card className="col-span-1 border-charcoal-200 shadow-sm rounded-sm max-h-[75vh] flex flex-col">
                    <div className="p-4 border-b border-charcoal-100 bg-charcoal-50">
                        <h3 className="font-bold text-charcoal-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" /> Your Properties ({properties.length})
                        </h3>
                    </div>
                    <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        {properties.length === 0 ? (
                            <div className="p-6 text-charcoal-500 font-medium">No properties yet. Create a listing first.</div>
                        ) : properties.map((p) => {
                            const pStage = mapStatusToStage(p.verification?.status ?? p.verificationStatus);
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPropertyId(p.id);
                                        setSelectedTier(null);
                                    }}
                                    className={`p-4 border-b border-charcoal-100 cursor-pointer transition-colors relative ${selectedPropertyId === p.id ? "bg-brand-50 border-l-4 border-l-brand-600" : "hover:bg-charcoal-50 border-l-4 border-l-transparent"}`}
                                >
                                    <h4 className="font-bold text-charcoal-900 text-sm line-clamp-1">{p.title}</h4>
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shadow-none ${pStage === "pending_upload" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                            {STAGES.find((s) => s.id === pStage)?.label}
                                        </Badge>
                                        {p.isVerified && (
                                            <Badge variant="verified" className="text-[10px] px-1.5 py-0 shadow-none"><ShieldCheck className="h-3 w-3 mr-0.5"/>Verified</Badge>
                                        )}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-charcoal-300 absolute right-4 top-1/2 -translate-y-1/2" />
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Right Column: Verification Flow */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    {!selectedProperty ? (
                        <Card className="border-charcoal-200 shadow-sm rounded-sm bg-charcoal-50/50 flex flex-col items-center justify-center p-12 text-center h-[500px]">
                            <ShieldCheck className="h-16 w-16 text-charcoal-300 mb-4" />
                            <h3 className="font-bold text-charcoal-600 text-lg">Select a Property</h3>
                            <p className="text-sm text-charcoal-500 mt-2 max-w-sm">Choose a listing from the sidebar to start or continue its verification.</p>
                        </Card>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Status Tracker */}
                            <Card className="border-charcoal-200 shadow-sm rounded-sm overflow-hidden">
                                <div className="p-4 border-b border-charcoal-100 bg-white">
                                    <h3 className="font-bold text-charcoal-900 line-clamp-1">{selectedProperty.title}</h3>
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
                                    {verificationStatus === "Rejected" && (
                                        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-sm text-red-800 text-sm font-medium flex gap-2">
                                            <Activity className="h-5 w-5 shrink-0" />
                                            <span>Verification was rejected. Review the agent notes below, address the feedback, and re-upload evidence.</span>
                                        </div>
                                    )}
                                    {currentStageIndex === 0 && verificationStatus !== "Rejected" && (
                                        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-sm text-amber-800 text-sm font-medium flex gap-2">
                                            <Activity className="h-5 w-5 shrink-0" />
                                            <span>Action required: start verification below, then upload your documents for each check.</span>
                                        </div>
                                    )}
                                    {currentStageIndex > 0 && verificationStatus !== "Rejected" && (
                                        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-sm text-blue-800 text-sm font-medium flex gap-2">
                                            <ShieldCheck className="h-5 w-5 shrink-0" />
                                            <span>Your verification is in the Trust Engine pipeline. You will be notified of any updates.</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* No verification yet: tier selection + start verification */}
                            {!hasVerification && (
                                <>
                                    <h3 className="font-heading font-bold text-lg text-charcoal-950 px-1">Select Verification Tier</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {TIERS.map((tier) => (
                                            <div
                                                key={tier.id}
                                                onClick={() => setSelectedTier(tier.id)}
                                                className={`border-2 rounded-sm p-5 transition-all flex flex-col h-full relative overflow-hidden cursor-pointer hover:border-brand-300 ${
                                                    selectedTier === tier.id ? "border-brand-600 shadow-sm bg-brand-50/30" : "border-charcoal-200 bg-white"
                                                }`}
                                            >
                                                {tier.id === "premium" && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-widest px-6 py-1 translate-x-4 translate-y-2 rotate-45 shadow-sm">Popular</div>}
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className={`font-bold text-lg ${selectedTier === tier.id ? "text-brand-900" : "text-charcoal-900"}`}>{tier.name}</h4>
                                                    <span className="font-bold text-sm bg-charcoal-100 text-charcoal-700 px-2 py-0.5 rounded-sm">{tier.price}</span>
                                                </div>
                                                <p className="text-xs text-charcoal-500 font-medium mb-4">{tier.desc}</p>
                                                <ul className="space-y-1.5 mt-auto text-xs font-semibold text-charcoal-700">
                                                    {tier.features.map((f) => (
                                                        <li key={f} className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-brand-600 shrink-0"/> {f}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            disabled={!selectedTier || submitting}
                                            onClick={handleStartVerification}
                                            className="h-11 px-8 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-sm"
                                        >
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Start Verification
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Verification exists: check-centric evidence upload + agent notes */}
                            {hasVerification && selectedProperty.verification && (
                                <>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="font-heading font-bold text-lg text-charcoal-950">Verification Checks</h3>
                                            {selectedProperty.verification.certificateUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewer({ url: fileProxyUrl(selectedProperty.verification!.certificateUrl!), title: "Verification Certificate" })}
                                                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                                >
                                                    <Award className="h-3.5 w-3.5" /> View Certificate
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => {
                                                const checkId = Number((e.target as HTMLInputElement).dataset.checkId);
                                                if (checkId) handleFileSelect(e, checkId);
                                            }}
                                        />
                                        <div className="grid grid-cols-1 gap-3">
                                            {[...selectedProperty.verification.checks]
                                                .sort((a, b) => CHECK_ORDER.indexOf(a.checkType) - CHECK_ORDER.indexOf(b.checkType))
                                                .map((check) => {
                                                    const cfg = CHECK_LABELS[check.checkType] ?? { label: check.checkType, hint: "", icon: FileText };
                                                    const hasEvidence = !!check.evidenceUrl;
                                                    const isUploading = uploading[check.id];
                                                    const err = uploadError[check.id];
                                                    return (
                                                        <Card key={check.id} className={`border-charcoal-200 shadow-sm rounded-sm ${hasEvidence ? "border-green-300 bg-green-50/30" : "border-dashed bg-white"}`}>
                                                            <CardContent className="p-5 flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-4 min-w-0">
                                                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${hasEvidence ? "bg-green-100 text-green-600" : "bg-brand-100 text-brand-600"}`}>
                                                                        {hasEvidence ? <CheckCircle2 className="h-6 w-6" /> : <cfg.icon className="h-6 w-6" />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className={`font-bold text-sm ${hasEvidence ? "text-green-900" : "text-charcoal-900"}`}>{cfg.label}</h4>
                                                                        <p className="text-xs text-charcoal-500 mt-0.5">{cfg.hint}</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shadow-none">{check.status}</Badge>
                                                                            {err && <p className="text-xs text-red-600">{err}</p>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {hasEvidence ? (
                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setViewer({ url: fileProxyUrl(check.evidenceUrl!), title: cfg.label })}
                                                                            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                                                                        >
                                                                            View
                                                                        </button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            disabled={isUploading}
                                                                            onClick={() => {
                                                                                if (fileInputRef.current) {
                                                                                    fileInputRef.current.dataset.checkId = String(check.id);
                                                                                    fileInputRef.current.click();
                                                                                }
                                                                            }}
                                                                            className="border-charcoal-200 shadow-sm font-bold bg-white text-charcoal-700"
                                                                        >
                                                                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        disabled={isUploading}
                                                                        onClick={() => {
                                                                            if (fileInputRef.current) {
                                                                                fileInputRef.current.dataset.checkId = String(check.id);
                                                                                fileInputRef.current.click();
                                                                            }
                                                                        }}
                                                                        className="border-charcoal-200 shadow-sm font-bold bg-white text-charcoal-700 shrink-0"
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

                                    {/* Agent notes timeline */}
                                    <Card className="border-charcoal-200 shadow-sm rounded-sm">
                                        <div className="p-4 border-b border-charcoal-100 bg-charcoal-50">
                                            <h3 className="font-bold text-charcoal-900 uppercase tracking-widest text-xs flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-brand-600" /> Agent Notes & Timeline
                                            </h3>
                                        </div>
                                        <CardContent className="p-6">
                                            {noteEntries.length === 0 ? (
                                                <p className="text-sm text-charcoal-500 font-medium">No review notes yet. Notes from the admin or your assigned agent will appear here as the verification progresses.</p>
                                            ) : (
                                                <ol className="space-y-3 border-l-2 border-charcoal-100 pl-5">
                                                    {noteEntries.map((entry, i) => (
                                                        <li key={i} className="relative">
                                                            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-brand-600 border-2 border-white shadow-sm"></span>
                                                            <p className="text-sm text-charcoal-800 font-medium leading-relaxed">{entry}</p>
                                                        </li>
                                                    ))}
                                                </ol>
                                            )}
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}