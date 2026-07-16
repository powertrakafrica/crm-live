"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    MapPin,
    Languages,
    Smartphone,
    ShieldCheck,
    Loader2,
    UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { profileApi } from "@/lib/api";
import { CoveragePicker } from "@/app/(portals)/agent/components/CoveragePicker";
import { itemsToCoverage, type CoverageItem } from "@/lib/coverage";

const ALL_LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Fante", "Dagbani", "Hausa"];
const ALL_SPECIALTIES = [
    "Residential Appraisals",
    "Standard Viewings",
    "Commercial & Retail",
    "Land & Plots",
    "Rent-to-Own Deals",
];
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"];
const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

// Shape of the identity slice returned by GET /profile/me (getUserProfile).
// Only the fields this wizard reads/prefills are typed here.
interface MeProfile {
    dateOfBirth?: string | null;
    gender?: string | null;
    nationality?: string | null;
    residentialAddress?: string | null;
    digitalAddress?: string | null;
    emergencyContactName?: string | null;
    emergencyContactRelationship?: string | null;
    emergencyContactPhone?: string | null;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Identity & contact — collected up front so the system actually has the
    // agent's DOB / address / emergency contact on file (the become-agent form
    // captures these too, but onboarding is the gate that blocks completion
    // until they're present, and lets a returning agent re-confirm them).
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [nationality, setNationality] = useState("Ghana");
    const [residentialAddress, setResidentialAddress] = useState("");
    const [digitalAddress, setDigitalAddress] = useState("");
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

    const [coverageItems, setCoverageItems] = useState<CoverageItem[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [momoNumber, setMomoNumber] = useState("");
    const [momoNetwork, setMomoNetwork] = useState("");

    useEffect(() => {
        // Defense-in-depth: middleware already gates this route on the access
        // cookie. Confirm server-side that the session is live (the cookie may
        // have expired) AND prefill any identity already on the user's profile
        // so a returning agent doesn't retype it. profileApi.me() -> getUserProfile
        // returns the identity fields; on 401 we bail to login.
        void profileApi
            .me()
            .then((u) => {
                const me = u as MeProfile;
                if (me.dateOfBirth) setDateOfBirth(me.dateOfBirth.slice(0, 10));
                if (me.gender) setGender(me.gender);
                if (me.nationality) setNationality(me.nationality);
                if (me.residentialAddress) setResidentialAddress(me.residentialAddress);
                if (me.digitalAddress) setDigitalAddress(me.digitalAddress);
                if (me.emergencyContactName) setEmergencyContactName(me.emergencyContactName);
                if (me.emergencyContactRelationship)
                    setEmergencyContactRelationship(me.emergencyContactRelationship);
                if (me.emergencyContactPhone) setEmergencyContactPhone(me.emergencyContactPhone);
            })
            .catch(() => router.push("/auth/login"));
    }, [router]);

    const toggleLanguage = (l: string) => {
        setSelectedLanguages((prev) =>
            prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
        );
    };

    const toggleSpecialty = (s: string) => {
        setSelectedSpecialties((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );
    };

    const identityComplete = () =>
        !!dateOfBirth &&
        !!gender &&
        !!nationality.trim() &&
        !!residentialAddress.trim() &&
        !!digitalAddress.trim() &&
        !!emergencyContactName.trim() &&
        !!emergencyContactRelationship.trim() &&
        !!emergencyContactPhone.trim();

    const canProceed = () => {
        if (step === 1) return identityComplete();
        if (step === 2) return coverageItems.length > 0;
        if (step === 3) return selectedLanguages.length > 0 && selectedSpecialties.length > 0;
        if (step === 4) return momoNumber.length >= 10 && momoNetwork !== "";
        return true;
    };

    // Persist identity to the user profile when leaving step 1, so the data
    // lands even if the agent abandons the wizard before finishing. Steps 2–3
    // advance locally; step 4 calls handleComplete (agent profile + finish).
    const handleNext = async () => {
        if (step === 1) {
            setSaving(true);
            setError("");
            try {
                await profileApi.update({
                    dateOfBirth,
                    gender,
                    nationality,
                    residentialAddress,
                    digitalAddress,
                    emergencyContactName,
                    emergencyContactRelationship,
                    emergencyContactPhone,
                });
                setStep((s) => s + 1);
            } catch (err: any) {
                setError(err.message || "Failed to save identity details");
            } finally {
                setSaving(false);
            }
            return;
        }
        setStep((s) => s + 1);
    };

    const handleComplete = async () => {
        setSaving(true);
        setError("");
        try {
            await profileApi.updateAgentProfile({
                coverage: itemsToCoverage(coverageItems),
                languages: selectedLanguages.join(","),
                specialties: selectedSpecialties.join(","),
                momoNumber,
                momoNetwork,
                isOnboardingComplete: true,
            });
            setStep(5);
        } catch (err: any) {
            setError(err.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const totalSteps = 5;

    const inputCls =
        "block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Progress Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-heading font-bold text-slate-900">Agent Onboarding</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Complete your profile to start receiving assignments</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-500">
                            Step {step} of {totalSteps}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 flex-1 rounded-full transition-colors ${
                                    i + 1 < step
                                        ? "bg-brand-500"
                                        : i + 1 === step
                                            ? "bg-brand-400"
                                            : "bg-slate-200"
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-start justify-center py-8 px-4 sm:px-6">
                <div className="w-full max-w-3xl">
                    {error && (
                        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-100">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
                                    <UserCheck className="h-5 w-5 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Identity &amp; Contact</h2>
                                    <p className="text-sm text-slate-500">Verify your personal details before going live</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="dob" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Date of birth *
                                    </label>
                                    <input
                                        id="dob"
                                        type="date"
                                        value={dateOfBirth}
                                        onChange={(e) => setDateOfBirth(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-1.5">Gender *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {GENDER_OPTIONS.map((g) => {
                                            const selected = gender === g;
                                            return (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setGender(g)}
                                                    className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                                                        selected
                                                            ? "border-brand-500 bg-brand-50 text-brand-900"
                                                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                                                    }`}
                                                >
                                                    {g}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="nationality" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Nationality *
                                    </label>
                                    <input
                                        id="nationality"
                                        value={nationality}
                                        onChange={(e) => setNationality(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="digital" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Digital address (GhanaPost) *
                                    </label>
                                    <input
                                        id="digital"
                                        value={digitalAddress}
                                        onChange={(e) => setDigitalAddress(e.target.value)}
                                        placeholder="e.g. GA-144-1234"
                                        className={inputCls}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="residential" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Residential address *
                                    </label>
                                    <input
                                        id="residential"
                                        value={residentialAddress}
                                        onChange={(e) => setResidentialAddress(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="emName" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Emergency contact name *
                                    </label>
                                    <input
                                        id="emName"
                                        value={emergencyContactName}
                                        onChange={(e) => setEmergencyContactName(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="emRel" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Relationship *
                                    </label>
                                    <input
                                        id="emRel"
                                        value={emergencyContactRelationship}
                                        onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                                        placeholder="e.g. Sibling, Spouse"
                                        className={inputCls}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="emPhone" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Emergency contact phone *
                                    </label>
                                    <input
                                        id="emPhone"
                                        type="tel"
                                        value={emergencyContactPhone}
                                        onChange={(e) => setEmergencyContactPhone(e.target.value.replace(/\D/g, ""))}
                                        placeholder="e.g. 024 123 4567"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
                                    <MapPin className="h-5 w-5 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Coverage Area</h2>
                                    <p className="text-sm text-slate-500">Select the regions and constituencies you want to cover</p>
                                </div>
                            </div>

                            <CoveragePicker
                                value={coverageItems}
                                onChange={setCoverageItems}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
                                    <Languages className="h-5 w-5 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Languages &amp; Specialties</h2>
                                    <p className="text-sm text-slate-500">Tell us about your skills and expertise</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-3">Languages Spoken</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {ALL_LANGUAGES.map((lang) => {
                                            const selected = selectedLanguages.includes(lang);
                                            return (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => toggleLanguage(lang)}
                                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                                                        selected
                                                            ? "border-brand-500 bg-brand-50"
                                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    <div
                                                        className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                            selected ? "border-brand-500 bg-brand-500" : "border-slate-300"
                                                        }`}
                                                    >
                                                        {selected && <CheckCircle className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <span className={`font-medium text-sm ${selected ? "text-brand-900" : "text-slate-700"}`}>
                                                        {lang}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <label className="block text-sm font-semibold text-slate-900 mb-3">Property Specialties</label>
                                    <div className="space-y-3">
                                        {ALL_SPECIALTIES.map((spec) => {
                                            const selected = selectedSpecialties.includes(spec);
                                            return (
                                                <button
                                                    key={spec}
                                                    type="button"
                                                    onClick={() => toggleSpecialty(spec)}
                                                    className={`flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all text-left ${
                                                        selected
                                                            ? "border-brand-500 bg-brand-50"
                                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    <div
                                                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                            selected ? "border-brand-500 bg-brand-500" : "border-slate-300"
                                                        }`}
                                                    >
                                                        {selected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                                    </div>
                                                    <div>
                                                        <span className={`font-semibold text-sm block ${selected ? "text-brand-900" : "text-slate-700"}`}>
                                                            {spec}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
                                    <Smartphone className="h-5 w-5 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Payment Details</h2>
                                    <p className="text-sm text-slate-500">How you will receive commission payouts</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="momoNumber" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Mobile Money Number
                                    </label>
                                    <input
                                        id="momoNumber"
                                        type="tel"
                                        placeholder="e.g. 024 123 4567"
                                        value={momoNumber}
                                        onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ""))}
                                        className={inputCls}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-3">Network Provider</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {MOMO_NETWORKS.map((net) => {
                                            const selected = momoNetwork === net;
                                            return (
                                                <button
                                                    key={net}
                                                    type="button"
                                                    onClick={() => setMomoNetwork(net)}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                        selected
                                                            ? "border-brand-500 bg-brand-50"
                                                            : "border-slate-200 hover:border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    <div
                                                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                                            selected ? "border-brand-500 bg-brand-500" : "border-slate-300"
                                                        }`}
                                                    >
                                                        {selected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                                    </div>
                                                    <span className={`font-semibold text-sm ${selected ? "text-brand-900" : "text-slate-700"}`}>
                                                        {net}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center animate-fade-in">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-6">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">
                                Onboarding Complete
                            </h2>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                Your agent profile is set up. You can now access your workspace and start receiving property assignments.
                            </p>
                            <Button
                                size="lg"
                                onClick={() => router.push("/agent")}
                                className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                            >
                                Go to Agent Workspace
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {step < totalSteps && (
                        <div className="flex items-center justify-between mt-6">
                            <Button
                                variant="ghost"
                                onClick={() => setStep((s) => Math.max(1, s - 1))}
                                disabled={step === 1}
                                className="text-slate-600"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>

                            {step < 4 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={!canProceed() || saving}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                                >
                                    {saving && step === 1 ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Continue
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleComplete}
                                    disabled={!canProceed() || saving}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Complete Setup
                                            <CheckCircle className="h-4 w-4 ml-1" />
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}