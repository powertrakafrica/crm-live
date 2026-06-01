"use client";

import { useState, useEffect, useRef } from "react";
import {
    MapPin, Camera, Video,
    CheckSquare, UploadCloud, CheckCircle,
    WifiOff, Send, ShieldCheck, Loader2, X, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { agentApi, uploadApi, verificationApi } from "@/lib/api";

interface AgentVerificationItem {
    id: number;
    propertyId: number;
    propertyTitle: string;
    propertyLocation: string;
    status: string;
    checks: { id: number; checkType: string; status: string; evidenceUrl?: string | null }[];
}

interface EvidenceItem {
    url: string;
    name: string;
    checkId?: number;
}

export function AgentVerification() {
    const [verifications, setVerifications] = useState<AgentVerificationItem[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [gpsCheckedIn, setGpsCheckedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        agentApi.verifications()
            .then((data: any) => {
                const mapped = (data ?? []).map((v: any) => ({
                    id: v.id,
                    propertyId: v.propertyId,
                    propertyTitle: v.propertyTitle || "Unknown Property",
                    propertyLocation: v.propertyLocation || "Unknown",
                    status: v.status,
                    checks: (v.checks ?? []).map((c: any) => ({
                        id: c.id,
                        checkType: c.checkType,
                        status: c.status,
                        evidenceUrl: c.evidenceUrl,
                    })),
                }));
                setVerifications(mapped);
                if (mapped.length > 0) setSelectedId(mapped[0].id);
            })
            .catch((err: any) => setError(err.message || "Failed to load verifications"))
            .finally(() => setLoading(false));
    }, []);

    const activeVerification = verifications.find(v => v.id === selectedId);

    const getCheckValue = (checks: { checkType: string; status: string }[], key: string) => {
        const found = checks.find(c => c.checkType === key);
        return found ? found.status === "Passed" : false;
    };

    const handleCheckToggle = async (checkKey: string) => {
        if (!activeVerification) return;
        const check = activeVerification.checks.find(c => c.checkType === checkKey);
        if (!check) return;

        const newStatus = check.status === "Passed" ? "Pending" : "Passed";

        // Optimistic update
        setVerifications(prev => prev.map(v => {
            if (v.id !== activeVerification.id) return v;
            return {
                ...v,
                checks: v.checks.map(c => c.checkType === checkKey ? { ...c, status: newStatus } : c),
            };
        }));

        if (!isOffline) {
            try {
                await verificationApi.updateCheck(activeVerification.propertyId, check.id, {
                    status: newStatus,
                });
            } catch {
                // Revert on error
                setVerifications(prev => prev.map(v => {
                    if (v.id !== activeVerification.id) return v;
                    return {
                        ...v,
                        checks: v.checks.map(c => c.checkType === checkKey ? { ...c, status: check.status } : c),
                    };
                }));
            }
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !activeVerification) return;

        setUploading(true);
        const newEvidence: EvidenceItem[] = [];

        for (const file of Array.from(files)) {
            try {
                const presign = await uploadApi.presign(file.name, "verification-evidence", file.type);
                const uploadRes = await fetch(presign.url, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });
                if (!uploadRes.ok) throw new Error("Upload failed");
                newEvidence.push({ url: presign.publicUrl, name: file.name });
            } catch {
                // Skip failed uploads
            }
        }

        setEvidence(prev => [...prev, ...newEvidence]);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeEvidence = (index: number) => {
        setEvidence(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!activeVerification) return;
        setSubmitting(true);
        setError("");

        try {
            // Attach evidence to the first pending check (or all checks)
            for (const item of evidence) {
                const pendingCheck = activeVerification.checks.find(c => c.status === "Pending" || c.status === "Failed");
                if (pendingCheck) {
                    await verificationApi.updateCheck(activeVerification.propertyId, pendingCheck.id, {
                        evidenceUrl: item.url,
                        notes: `Field evidence: ${item.name}`,
                    });
                }
            }

            if (isOffline) {
                alert("Report saved offline. It will sync automatically when connectivity is restored.");
            } else {
                alert("Verification report submitted to Admin queue successfully!");
                setVerifications(prev => prev.map(v => v.id === selectedId ? { ...v, status: "Under Review" } : v));
                setEvidence([]);
            }
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950">Field Site Verifications</h2>
                    <p className="text-charcoal-500 font-medium">Verify property details and capture evidence on-site.</p>
                </div>
                {/* Offline Mode Toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-charcoal-600">Simulate Connection:</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsOffline(!isOffline)}
                        className={`font-bold ${isOffline ? "border-red-300 text-red-600 hover:bg-red-50" : "bg-green-600 hover:bg-green-700 text-white"}`}
                    >
                        {isOffline ? <><WifiOff className="h-4 w-4 mr-2" /> Offline Mode</> : <><CheckCircle className="h-4 w-4 mr-2" /> Online</>}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pending Verification List */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-heading font-bold text-lg text-charcoal-900 border-b border-charcoal-200 pb-2">Assigned Audits</h3>
                    <div className="space-y-3">
                        {verifications.length === 0 ? (
                            <div className="p-4 text-center text-charcoal-500 font-medium">No assigned audits.</div>
                        ) : verifications.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    setSelectedId(item.id);
                                    setGpsCheckedIn(false);
                                }}
                                className={`p-4 rounded-sm border cursor-pointer transition-all ${selectedId === item.id ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-300' : 'bg-white border-charcoal-200 hover:border-brand-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className={`${item.status === 'Pending Action' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'} border-none shadow-none font-bold text-xs`}>{item.status}</Badge>
                                </div>
                                <h4 className="font-bold text-charcoal-900 text-sm leading-snug">{item.propertyTitle}</h4>
                                <div className="flex items-center gap-1 mt-3 text-xs text-charcoal-500 font-bold uppercase tracking-wide">
                                    <MapPin className="h-3 w-3" /> {item.propertyLocation}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Workflow Area */}
                <div className="lg:col-span-2">
                    {activeVerification && (
                        <div className="space-y-6">

                            {/* GPS Audit Header */}
                            <Card className="border-charcoal-200 shadow-sm rounded-sm">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-charcoal-950 mb-1">{activeVerification.propertyTitle}</h3>
                                            <p className="text-sm font-medium text-charcoal-500">Location: <span className="text-charcoal-900 font-mono font-bold">{activeVerification.propertyLocation}</span></p>
                                        </div>
                                        <Button
                                            onClick={() => setGpsCheckedIn(true)}
                                            size="lg"
                                            disabled={gpsCheckedIn}
                                            className={`${gpsCheckedIn ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold rounded-sm shadow-sm transition-all`}
                                        >
                                            {gpsCheckedIn ? <><CheckCircle className="h-5 w-5 mr-2" /> Checked In On-Site</> : <><MapPin className="h-5 w-5 mr-2 -ml-1" /> GPS Check-In</>}
                                        </Button>
                                    </div>
                                    {!gpsCheckedIn && <p className="text-xs text-red-500 font-bold mt-4 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> You must be within 50 meters of the property to check in.</p>}
                                </CardContent>
                            </Card>

                            {/* Checklist and Media - Only allow interaction if Checked In (simulated) */}
                            <div className={`space-y-6 transition-opacity duration-300 ${!gpsCheckedIn ? 'opacity-50 pointer-events-none' : ''}`}>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Physical Checklist */}
                                    <Card className="border-charcoal-200 shadow-sm rounded-sm h-full">
                                        <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-3">
                                            <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                                                <CheckSquare className="h-4 w-4 text-brand-600" /> Physical Audit Checklist
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-4">
                                            <label className="flex items-start gap-3 cursor-pointer p-2 rounded-sm hover:bg-charcoal-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={getCheckValue(activeVerification.checks, 'DocumentAuthenticity')}
                                                    onChange={() => handleCheckToggle('DocumentAuthenticity')}
                                                    className="mt-1 w-4 h-4 text-brand-600 border-charcoal-300 rounded focus:ring-brand-500"
                                                />
                                                <div>
                                                    <span className="font-bold text-charcoal-900 text-sm">Photos Match Reality</span>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">Does the current state match owner uploaded photos?</p>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-3 cursor-pointer p-2 rounded-sm hover:bg-charcoal-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={getCheckValue(activeVerification.checks, 'GPSBoundary')}
                                                    onChange={() => handleCheckToggle('GPSBoundary')}
                                                    className="mt-1 w-4 h-4 text-brand-600 border-charcoal-300 rounded focus:ring-brand-500"
                                                />
                                                <div>
                                                    <span className="font-bold text-charcoal-900 text-sm">Clear Boundary Wall</span>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">Is the property fully walled or fenced and demarcated?</p>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-3 cursor-pointer p-2 rounded-sm hover:bg-charcoal-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={getCheckValue(activeVerification.checks, 'UtilitiesConnected')}
                                                    onChange={() => handleCheckToggle('UtilitiesConnected')}
                                                    className="mt-1 w-4 h-4 text-brand-600 border-charcoal-300 rounded focus:ring-brand-500"
                                                />
                                                <div>
                                                    <span className="font-bold text-charcoal-900 text-sm">Utilities Connected</span>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">Is ECG and Water visibly connected to the premises?</p>
                                                </div>
                                            </label>
                                        </CardContent>
                                    </Card>

                                    {/* Media Capture */}
                                    <Card className="border-charcoal-200 shadow-sm rounded-sm h-full flex flex-col">
                                        <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-3">
                                            <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                                                <Camera className="h-4 w-4 text-brand-600" /> Evidence Capture
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 flex-1 flex flex-col gap-3">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*,video/*"
                                                multiple
                                                onChange={handleFileSelect}
                                            />
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-2 border-dashed border-charcoal-200 bg-charcoal-50 rounded-sm p-6 text-center hover:bg-brand-50 hover:border-brand-300 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex justify-center gap-4 mb-3">
                                                    <div className="p-3 bg-white shadow-sm rounded-full text-brand-600 group-hover:scale-110 transition-transform">
                                                        <Camera className="h-6 w-6" />
                                                    </div>
                                                    <div className="p-3 bg-white shadow-sm rounded-full text-brand-600 group-hover:scale-110 transition-transform delay-75">
                                                        <Video className="h-6 w-6" />
                                                    </div>
                                                </div>
                                                <p className="font-bold text-charcoal-900 text-sm">{uploading ? "Uploading..." : "Capture Photo/Video"}</p>
                                                <p className="text-xs text-charcoal-500 mt-1">Click to upload field evidence. Supports images and videos.</p>
                                                {uploading && <Loader2 className="h-5 w-5 animate-spin text-brand-600 mx-auto mt-2" />}
                                            </div>

                                            {/* Evidence Preview */}
                                            {evidence.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Uploaded Evidence</p>
                                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                        {evidence.map((item, idx) => (
                                                            <div key={idx} className="relative shrink-0 h-20 w-20 rounded-sm overflow-hidden border border-charcoal-200 group">
                                                                {item.name.match(/\.(mp4|mov|avi)$/i) ? (
                                                                    <div className="h-full w-full bg-charcoal-800 flex items-center justify-center">
                                                                        <Video className="h-6 w-6 text-white" />
                                                                    </div>
                                                                ) : (
                                                                    <img src={item.url} alt={item.name} className="object-cover w-full h-full" />
                                                                )}
                                                                <button
                                                                    onClick={() => removeEvidence(idx)}
                                                                    className="absolute top-0.5 right-0.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="flex justify-end pt-4">
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
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

function AlertCircle(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
