"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    MapPin,
    Languages,
    Briefcase,
    Smartphone,
    ShieldCheck,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { profileApi } from "@/lib/api";

const ALL_LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Fante", "Dagbani", "Hausa"];
const ALL_SPECIALTIES = [
    "Residential Appraisals",
    "Standard Viewings",
    "Commercial & Retail",
    "Land & Plots",
    "Rent-to-Own Deals",
];
const ALL_CONSTITUENCIES = [
    "Ayawaso West",
    "Okaikwei North",
    "Ablekuma Central",
    "Korle Klottey",
    "Nhyiaeso",
    "Oforikrom",
];
const MOMO_NETWORKS = ["MTN", "Vodafone", "AirtelTigo"];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [selectedConstituencies, setSelectedConstituencies] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [momoNumber, setMomoNumber] = useState("");
    const [momoNetwork, setMomoNetwork] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("teps_access_token");
        if (!token) {
            router.push("/auth/login");
        }
    }, [router]);

    const toggleConstituency = (c: string) => {
        setSelectedConstituencies((prev) =>
            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
        );
    };

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

    const canProceed = () => {
        if (step === 1) return selectedConstituencies.length > 0;
        if (step === 2) return selectedLanguages.length > 0 && selectedSpecialties.length > 0;
        if (step === 3) return momoNumber.length >= 10 && momoNetwork !== "";
        return true;
    };

    const handleComplete = async () => {
        setSaving(true);
        setError("");
        try {
            await profileApi.updateAgentProfile({
                coverageAreas: selectedConstituencies.join(","),
                languages: selectedLanguages.join(","),
                specialties: selectedSpecialties.join(","),
                momoNumber,
                momoNetwork,
                isOnboardingComplete: true,
            });
            setStep(4);
        } catch (err: any) {
            setError(err.message || "Failed to save profile");
        } finally {
            setSaving(false);
        }
    };

    const totalSteps = 4;

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
                                    <MapPin className="h-5 w-5 text-brand-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Coverage Area</h2>
                                    <p className="text-sm text-slate-500">Select the constituencies you want to cover</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {ALL_CONSTITUENCIES.map((c) => {
                                    const selected = selectedConstituencies.includes(c);
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => toggleConstituency(c)}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
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
                                            <span className={`font-semibold text-sm ${selected ? "text-brand-900" : "text-slate-700"}`}>
                                                {c}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
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

                    {step === 3 && (
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
                                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
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

                    {step === 4 && (
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
                    {step < 4 && (
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

                            {step < 3 ? (
                                <Button
                                    onClick={() => setStep((s) => s + 1)}
                                    disabled={!canProceed()}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                                >
                                    Continue
                                    <ChevronRight className="h-4 w-4 ml-1" />
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
