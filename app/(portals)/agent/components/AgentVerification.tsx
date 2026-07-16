"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    MapPin, Camera,
    CheckSquare, UploadCloud, CheckCircle2, XCircle,
    Send, Loader2, Image as ImageIcon, ShieldCheck, MapPinned, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { agentApi, uploadApi, verificationApi, fileProxyUrl } from "@/lib/api";

// The 6 check types seeded by createVerification. The agent's field visit is
// the authority for the on-site checks (GPSLocation, PhotosMatch, BoundaryWall,
// UtilitiesConnected); OwnershipDocument + LandCommissionSearch are document
// checks the agent can still confirm by reviewing the owner's uploaded docs.
// NOTE: the previous version keyed these as 'DocumentAuthenticity' and
// 'GPSBoundary' — which never matched any seeded checkType, so those toggles
// were dead (no backend check was ever updated). Fixed to the real enum keys.
type CheckStatus = "Pending" | "Passed" | "Failed";

interface VerificationCheck {
    id: number;
    checkType: string;
    status: CheckStatus;
    evidenceUrl?: string | null;
    notes?: string | null;
    gpsLatitude?: string | null;
    gpsLongitude?: string | null;
}

interface AgentVerificationItem {
    id: number;
    propertyId: number;
    propertyTitle: string;
    propertyLocation: string;
    status: string;
    checks: VerificationCheck[];
}

const CHECK_META: Record<string, { label: string; hint: string; field: boolean; icon: typeof MapPin }> = {
    OwnershipDocument: { label: "Title Deed / Indenture", hint: "Owner's title document reviewed on-site.", field: false, icon: FileText },
    GPSLocation: { label: "GPS Coordinates", hint: "Capture the device location at the property.", field: true, icon: MapPinned },
    LandCommissionSearch: { label: "Land Commission Search", hint: "Land Commission records confirmed.", field: false, icon: FileText },
    PhotosMatch: { label: "Photos Match Reality", hint: "Does the current state match the owner's uploaded photos?", field: true, icon: Camera },
    BoundaryWall: { label: "Clear Boundary Wall", hint: "Is the property fully walled/fenced and demarcated?", field: true, icon: CheckSquare },
    UtilitiesConnected: { label: "Utilities Connected", hint: "Are ECG and water visibly connected to the premises?", field: true, icon: CheckSquare },
};

const CHECK_ORDER = ["OwnershipDocument", "GPSLocation", "LandCommissionSearch", "PhotosMatch", "BoundaryWall", "UtilitiesConnected"];

// Friendly label for the verification's overall status enum (Unverified →
// "Pending Action", etc.) so the audit list reads as agent-facing states.
function friendlyStatus(status: string): { label: string; className: string } {
    switch (status) {
        case "AgentAssigned": return { label: "Assigned", className: "bg-blue-100 text-blue-700" };
        case "SiteVisitScheduled": return { label: "Site Visit Scheduled", className: "bg-purple-100 text-purple-700" };
        case "DocumentsUploaded": return { label: "In Progress", className: "bg-yellow-100 text-yellow-700" };
        case "UnderReview": return { label: "Under Review", className: "bg-yellow-100 text-yellow-700" };
        case "Verified": return { label: "Verified", className: "bg-green-100 text-green-700" };
        case "Rejected": return { label: "Rejected", className: "bg-red-100 text-red-700" };
        default: return { label: "Pending Action", className: "bg-charcoal-100 text-charcoal-600" };
    }
}

function checkStatusBadge(status: CheckStatus): { label: string; className: string } {
    switch (status) {
        case "Passed": return { label: "Passed", className: "bg-green-100 text-green-700" };
        case "Failed": return { label: "Failed", className: "bg-red-100 text-red-700" };
        default: return { label: "Pending", className: "bg-yellow-100 text-yellow-700" };
    }
}

export function AgentVerification() {
    const [verifications, setVerifications] = useState<AgentVerificationItem[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploadingCheckId, setUploadingCheckId] = useState<number | null>(null);
    const [capturingGpsFor, setCapturingGpsFor] = useState<number | null>(null);
    const [actionError, setActionError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Which check the (single) hidden file input is targeting when opened.
    const pendingCheckId = useRef<number | null>(null);

    const loadData = useCallback(async () => {
        try {
            const data: any = await agentApi.verifications();
            const mapped: AgentVerificationItem[] = (data ?? []).map((v: any) => ({
                id: v.id,
                propertyId: v.propertyId,
                propertyTitle: v.propertyTitle || "Unknown Property",
                propertyLocation: v.propertyLocation || "Unknown",
                status: v.status,
                checks: (v.checks ?? []).map((c: any) => ({
                    id: c.id,
                    checkType: c.checkType,
                    status: c.status as CheckStatus,
                    evidenceUrl: c.evidenceUrl,
                    notes: c.notes,
                    gpsLatitude: c.gpsLatitude,
                    gpsLongitude: c.gpsLongitude,
                })),
            }));
            setVerifications(mapped);
        } catch (err: any) {
            setError(err.message || "Failed to load verifications");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData().then(() => {
            // Default-select the first audit once loaded.
            setVerifications((prev) => {
                if (prev.length > 0) setSelectedId(prev[0].id);
                return prev;
            });
        });
    }, [loadData]);

    const activeVerification = verifications.find((v) => v.id === selectedId);

    // Patch a single check on the active verification in local state, so the UI
    // reflects the server's response immediately.
    const patchCheck = (checkId: number, patch: Partial<VerificationCheck>) => {
        setVerifications((prev) => prev.map((v) => {
            if (v.id !== selectedId) return v;
            return {
                ...v,
                checks: v.checks.map((c) => (c.id === checkId ? { ...c, ...patch } : c)),
            };
        }));
    };

    const setVerificationStatus = (status: string) => {
        setVerifications((prev) => prev.map((v) => (v.id === selectedId ? { ...v, status } : v)));
    };

    // Real device GPS capture (spec §2.3). Wraps navigator.geolocation in a
    // Promise with a timeout so a stalled permission prompt doesn't hang the
    // button forever. On success the coordinates are sent to the GPSLocation
    // check as gpsLatitude/gpsLongitude strings (decimal columns accept
    // strings) and the check is marked Passed.
    const captureGps = (check: VerificationCheck) => {
        if (!activeVerification) return;
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setActionError("Geolocation is not available on this device.");
            return;
        }
        setActionError("");
        setCapturingGpsFor(check.id);
        const gpsPromise = new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            });
        });
        const timeout = setTimeout(() => {
            setCapturingGpsFor(null);
            setActionError("GPS capture timed out. Check location permission and try again.");
        }, 16000);

        gpsPromise
            .then(async (pos) => {
                clearTimeout(timeout);
                const lat = pos.coords.latitude.toFixed(8);
                const lng = pos.coords.longitude.toFixed(8);
                try {
                    await verificationApi.agentUpdateCheck(activeVerification.id, check.id, {
                        gpsLatitude: lat,
                        gpsLongitude: lng,
                        status: "Passed",
                        notes: `On-site GPS check-in: ${lat}, ${lng}`,
                    });
                    patchCheck(check.id, {
                        gpsLatitude: lat,
                        gpsLongitude: lng,
                        status: "Passed",
                        notes: `On-site GPS check-in: ${lat}, ${lng}`,
                    });
                } catch (err: any) {
                    setActionError(err.message || "Failed to record GPS check-in.");
                } finally {
                    setCapturingGpsFor(null);
                }
            })
            .catch((geoErr: GeolocationPositionError) => {
                clearTimeout(timeout);
                setCapturingGpsFor(null);
                setActionError(geoErr?.message || "Location permission denied. Enable location to check in.");
            });
    };

    const openFilePicker = (checkId: number) => {
        pendingCheckId.current = checkId;
        setActionError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        const checkId = pendingCheckId.current;
        if (!files || files.length === 0 || !activeVerification || checkId == null) return;
        const file = files[0];
        const check = activeVerification.checks.find((c) => c.id === checkId);
        if (!check) return;

        setUploadingCheckId(checkId);
        try {
            const { publicUrl, previewUrl } = await uploadApi.uploadFile(file, "verification-evidence");
            await verificationApi.agentUpdateCheck(activeVerification.id, check.id, {
                evidenceUrl: publicUrl,
                notes: `Field evidence: ${file.name}`,
                status: "Passed",
            });
            patchCheck(check.id, {
                evidenceUrl: publicUrl,
                status: "Passed",
                notes: `Field evidence: ${file.name}`,
            });
            // Keep previewUrl out of state — it's short-lived and the check now
            // has a persisted evidenceUrl the proxy can authorize.
            void previewUrl;
        } catch (err: any) {
            setActionError(err.message || "Evidence upload failed.");
        } finally {
            setUploadingCheckId(null);
            pendingCheckId.current = null;
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const markFailed = async (check: VerificationCheck) => {
        if (!activeVerification) return;
        const reason = window.prompt(`Mark "${CHECK_META[check.checkType]?.label ?? check.checkType}" as FAILED. Reason (required):`, "");
        if (!reason || !reason.trim()) return;
        try {
            await verificationApi.agentUpdateCheck(activeVerification.id, check.id, {
                status: "Failed",
                notes: reason.trim(),
            });
            patchCheck(check.id, { status: "Failed", notes: reason.trim() });
        } catch (err: any) {
            setActionError(err.message || "Failed to update check.");
        }
    };

    const markPassed = async (check: VerificationCheck) => {
        if (!activeVerification) return;
        try {
            await verificationApi.agentUpdateCheck(activeVerification.id, check.id, { status: "Passed" });
            patchCheck(check.id, { status: "Passed" });
        } catch (err: any) {
            setActionError(err.message || "Failed to update check.");
        }
    };

    const handleScheduleVisit = async () => {
        if (!activeVerification) return;
        setScheduling(true);
        setActionError("");
        try {
            await verificationApi.scheduleSiteVisit(activeVerification.propertyId, {
                notes: "Site visit scheduled by assigned agent.",
            });
            setVerificationStatus("SiteVisitScheduled");
        } catch (err: any) {
            setActionError(err.message || "Failed to schedule site visit.");
        } finally {
            setScheduling(false);
        }
    };

    const handleSubmit = async () => {
        if (!activeVerification) return;
        setSubmitting(true);
        setActionError("");
        try {
            // Real submit (spec gap #10): POSTs to the agent submit endpoint,
            // which rejects if any check is still Pending, advances the
            // verification to UnderReview, and notifies the admins. The local
            // checks are already persisted per-check above; this is the final
            // hand-off. Re-read the server state so the recomputed status
            // (UnderReview) is reflected in the audit list.
            await verificationApi.submitReport(activeVerification.id);
            await loadData();
            setActionError("");
            window.alert("Verification report submitted. An admin will review the evidence and issue the TEPS reference.");
        } catch (err: any) {
            setActionError(err.message || "Submit failed.");
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950">Field Site Verifications</h2>
                    <p className="text-charcoal-500 font-medium">Verify property details and capture evidence on-site.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assigned Audits */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-heading font-bold text-lg text-charcoal-900 border-b border-charcoal-200 pb-2">Assigned Audits</h3>
                    <div className="space-y-3">
                        {verifications.length === 0 ? (
                            <div className="p-4 text-center text-charcoal-500 font-medium">No assigned audits.</div>
                        ) : verifications.map((item) => {
                            const st = friendlyStatus(item.status);
                            const passed = item.checks.filter((c) => c.status === "Passed").length;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={`p-4 rounded-sm border cursor-pointer transition-all ${selectedId === item.id ? "bg-brand-50 border-brand-300 ring-1 ring-brand-300" : "bg-white border-charcoal-200 hover:border-brand-200"}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge className={`${st.className} border-none shadow-none font-bold text-xs`}>{st.label}</Badge>
                                        <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-wide">{passed}/{item.checks.length} done</span>
                                    </div>
                                    <h4 className="font-bold text-charcoal-900 text-sm leading-snug">{item.propertyTitle}</h4>
                                    <div className="flex items-center gap-1 mt-3 text-xs text-charcoal-500 font-bold uppercase tracking-wide">
                                        <MapPin className="h-3 w-3" /> {item.propertyLocation}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Audit Workflow Area */}
                <div className="lg:col-span-2">
                    {activeVerification && (
                        <div className="space-y-6">
                            {/* Header + schedule site visit */}
                            <Card className="border-charcoal-200 shadow-sm rounded-sm">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-charcoal-950 mb-1">{activeVerification.propertyTitle}</h3>
                                            <p className="text-sm font-medium text-charcoal-500">Location: <span className="text-charcoal-900 font-mono font-bold">{activeVerification.propertyLocation}</span></p>
                                            <div className="mt-2">
                                                <Badge className={`${friendlyStatus(activeVerification.status).className} border-none shadow-none font-bold text-xs`}>
                                                    {friendlyStatus(activeVerification.status).label}
                                                </Badge>
                                            </div>
                                        </div>
                                        {activeVerification.status !== "SiteVisitScheduled" && (
                                            <Button
                                                onClick={handleScheduleVisit}
                                                disabled={scheduling}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm shadow-sm"
                                            >
                                                {scheduling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2 -ml-1" />}
                                                Schedule Site Visit
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Per-check audit cards */}
                            <div className="space-y-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,video/*"
                                    onChange={handleFileSelect}
                                />
                                {CHECK_ORDER.map((checkType) => {
                                    const check = activeVerification.checks.find((c) => c.checkType === checkType);
                                    if (!check) return null;
                                    const meta = CHECK_META[checkType] ?? { label: checkType, hint: "", field: true, icon: ShieldCheck as unknown as typeof MapPin };
                                    const Icon = meta.icon;
                                    const badge = checkStatusBadge(check.status);
                                    const isUploading = uploadingCheckId === check.id;
                                    const isCapturingGps = capturingGpsFor === check.id;
                                    return (
                                        <Card key={check.id} className="border-charcoal-200 shadow-sm rounded-sm">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-brand-50 rounded-sm text-brand-600 shrink-0">
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-charcoal-900 text-sm">{meta.label}</span>
                                                                <Badge className={`${badge.className} border-none shadow-none font-bold text-[10px] uppercase tracking-wide`}>{badge.label}</Badge>
                                                            </div>
                                                            <p className="text-xs text-charcoal-500 mt-0.5">{meta.hint}</p>
                                                            {check.evidenceUrl && (
                                                                <a href={fileProxyUrl(check.evidenceUrl)} target="_blank" rel="noreferrer" className="text-xs text-brand-600 font-bold mt-1 inline-flex items-center gap-1 hover:underline">
                                                                    <ImageIcon className="h-3 w-3" /> View evidence
                                                                </a>
                                                            )}
                                                            {check.gpsLatitude && check.gpsLongitude && (
                                                                <p className="text-xs text-charcoal-600 font-mono mt-1">
                                                                    GPS: {check.gpsLatitude}, {check.gpsLongitude}
                                                                </p>
                                                            )}
                                                            {check.notes && !check.gpsLatitude && (
                                                                <p className="text-xs text-charcoal-500 italic mt-1">{check.notes}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {checkType === "GPSLocation" ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => captureGps(check)}
                                                                disabled={isCapturingGps || check.status === "Passed"}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                                            >
                                                                {isCapturingGps ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MapPinned className="h-4 w-4 mr-1" />}
                                                                {check.status === "Passed" ? "Checked In" : "GPS Check-In"}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openFilePicker(check.id)}
                                                                disabled={isUploading}
                                                                className="font-bold border-charcoal-200"
                                                            >
                                                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UploadCloud className="h-4 w-4 mr-1" />}
                                                                {check.evidenceUrl ? "Replace" : "Upload"}
                                                            </Button>
                                                        )}
                                                        {check.status !== "Passed" && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => markPassed(check)}
                                                                className="text-green-600 hover:bg-green-50 font-bold"
                                                                title="Mark passed"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {check.status !== "Failed" && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => markFailed(check)}
                                                                className="text-red-600 hover:bg-red-50 font-bold"
                                                                title="Mark failed"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {actionError && (
                                <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-sm font-medium text-red-700 flex items-center gap-2">
                                    <XCircle className="h-4 w-4 shrink-0" /> {actionError}
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button
                                    size="lg"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="bg-charcoal-950 hover:bg-charcoal-900 text-white font-bold px-8 shadow-sm"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                    {submitting ? "Submitting..." : "Submit Verification Report"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}