"use client";

import { useState, useEffect, useRef } from "react";
import { UserCircle, UploadCloud, ShieldCheck, CreditCard, Building2, Users, Loader2, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { profileApi, uploadApi } from "@/lib/api";

interface UserProfile {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    ghanaCardNumber: string | null;
    isVerified: boolean;
    isPhoneVerified: boolean;
    role: string;
}

export function OwnerProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const [livenessStatus, setLivenessStatus] = useState<"pending" | "scanning" | "verified">("pending");
    const [idUploaded, setIdUploaded] = useState(false);
    const [profileType, setProfileType] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        profileApi.me()
            .then((data) => {
                const p = data as UserProfile;
                setProfile(p);
                if (p.ghanaCardNumber) setIdUploaded(true);
                setLivenessStatus(p.isVerified ? "verified" : "pending");
            })
            .catch((err: any) => setError(err.message || "Failed to load profile"))
            .finally(() => setLoading(false));
    }, []);

    const handleLivenessSimulation = () => {
        setLivenessStatus("scanning");
        setTimeout(() => {
            setLivenessStatus("verified");
        }, 3000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSaving(true);
        try {
            await uploadApi.uploadFile(file, "documents");
            await profileApi.update({ ghanaCardNumber: "PENDING-VERIFY" });
            setIdUploaded(true);
        } catch (err: any) {
            setError(err.message || "Upload failed");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            await profileApi.update({
                fullName: profile.fullName,
                phone: profile.phone,
                ghanaCardNumber: profile.ghanaCardNumber,
            });
        } catch (err: any) {
            setError(err.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <span className="ml-3 text-charcoal-600 font-medium">Loading profile...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950">Identity Vault</h2>
                <p className="text-charcoal-500 font-medium">Complete your identity verification to enable public property listings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: ID & Liveness */}
                <div className="space-y-6">
                    <Card className="border-charcoal-200 shadow-sm rounded-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-charcoal-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-charcoal-900">1. Government ID</h3>
                                        <p className="text-sm text-charcoal-500">Upload Ghana Card or Passport</p>
                                    </div>
                                </div>
                                {idUploaded && <Badge variant="verified" className="shadow-none px-3 font-bold">Uploaded</Badge>}
                            </div>

                            {!idUploaded ? (
                                <div
                                    className="border-2 border-dashed border-charcoal-200 rounded-sm p-8 flex flex-col items-center justify-center bg-charcoal-50 hover:bg-brand-50 hover:border-brand-300 transition-colors cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                                    <UploadCloud className="h-8 w-8 text-charcoal-400 mb-2" />
                                    <p className="text-sm font-bold text-charcoal-900">Click to upload scan</p>
                                    <p className="text-xs text-charcoal-500 mt-1">High-res JPG or PNG only.</p>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-sm p-4 flex items-center gap-3 text-green-800">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-sm font-bold">ID Document Uploaded</p>
                                        <p className="text-xs font-medium text-green-700/80">Pending Liveness Match</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="ml-auto text-charcoal-500" onClick={() => setIdUploaded(false)}>Mismatched?</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className={`border-charcoal-200 shadow-sm rounded-sm transition-all ${idUploaded ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-charcoal-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Camera className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-charcoal-900">2. Biometric Liveness</h3>
                                        <p className="text-sm text-charcoal-500">Match face to ID document</p>
                                    </div>
                                </div>
                                {livenessStatus === "verified" && <Badge variant="verified" className="shadow-none px-3 font-bold">Verified</Badge>}
                            </div>

                            {livenessStatus === "pending" && (
                                <div className="text-center py-6">
                                    <p className="text-sm text-charcoal-600 mb-4 font-medium max-w-xs mx-auto">
                                        We need to verify you are a real person matching the ID provided above.
                                    </p>
                                    <Button
                                        onClick={handleLivenessSimulation}
                                        className="h-11 px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm shadow-sm"
                                    >
                                        <Camera className="h-4 w-4 mr-2" /> Start Camera Scan
                                    </Button>
                                </div>
                            )}

                            {livenessStatus === "scanning" && (
                                <div className="py-8 flex flex-col items-center justify-center">
                                    <div className="relative">
                                        <div className="h-32 w-32 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                                        <UserCircle className="h-16 w-16 text-indigo-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <h4 className="font-bold text-charcoal-900 mt-6 text-lg">Analyzing Biometrics...</h4>
                                    <p className="text-sm text-charcoal-500 font-medium">Please frame your face in the oval and hold still.</p>
                                </div>
                            )}

                            {livenessStatus === "verified" && (
                                <div className="bg-green-50 border border-green-200 rounded-sm p-6 text-center">
                                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <ShieldCheck className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h4 className="font-bold text-green-900 text-lg mb-1">Identity Confirmed</h4>
                                    <p className="text-sm text-green-700 font-medium">Your liveness check matched your Government ID.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Profiling */}
                <Card className={`border-charcoal-200 shadow-sm rounded-sm transition-all ${livenessStatus === "verified" ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                    <CardContent className="p-6">
                        <div className="mb-6 pb-4 border-b border-charcoal-100">
                            <h3 className="font-bold text-charcoal-900 text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-brand-600" />
                                3. Owner Profiling
                            </h3>
                            <p className="text-sm text-charcoal-500 mt-1 font-medium">
                                Select your ownership type. This determines the kind of land documentation required subsequently.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {[
                                { id: "individual", title: "Individual Landlord", desc: "Private citizen leasing or selling personal property.", icon: <UserCircle /> },
                                { id: "developer", title: "Real Estate Developer", desc: "Registered firm actively building housing blocks or estates.", icon: <Building2 /> },
                                { id: "family", title: "Family Head", desc: "Acting on behalf of family lands with signatory authority.", icon: <Users /> }
                            ].map((type) => (
                                <div
                                    key={type.id}
                                    onClick={() => setProfileType(type.id)}
                                    className={`p-4 rounded-sm border-2 cursor-pointer transition-all flex gap-4 ${
                                        profileType === type.id
                                            ? "border-brand-600 bg-brand-50 shadow-sm"
                                            : "border-charcoal-200 hover:border-brand-300 hover:bg-charcoal-50"
                                    }`}
                                >
                                    <div className={`mt-1 h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${profileType === type.id ? "bg-brand-600 text-white" : "bg-charcoal-100 text-charcoal-500"}`}>
                                        {type.icon}
                                    </div>
                                    <div>
                                        <h4 className={`font-bold ${profileType === type.id ? "text-brand-900" : "text-charcoal-900"}`}>{type.title}</h4>
                                        <p className="text-sm text-charcoal-500 leading-snug mt-0.5 font-medium">{type.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {profileType && (
                            <div className="mt-8 pt-6 border-t border-charcoal-100 flex justify-end">
                                <Button onClick={handleSaveProfile} disabled={saving} className="h-11 px-8 font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-sm shadow-sm">
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                    Complete Registration
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
