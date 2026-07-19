"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    User,
    MapPin,
    Briefcase,
    CreditCard,
    ShieldCheck,
    Loader2,
    UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { profileApi, uploadApi } from "@/lib/api";

// A focused subset of the backend's AgentApplicationInput (the rest are
// optional and left unset). The backend hard-requires fullName, email, phone
// and declarationAccepted; everything else is optional KYC/experience colour.
interface ApplicationForm {
    fullName: string;
    otherNames: string;
    surname: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    email: string;
    phone: string;
    residentialAddress: string;
    digitalAddress: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
    experienceYears: string;
    hasRealEstateExperience: boolean;
    educationLevel: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    education: string;
    fieldOfStudy: string;
    skills: string;
    coverageAreas: string;
    availability: string;
    hasSmartphone: boolean;
    transportMeans: string;
    internetReliability: string;
    criminalConviction: boolean;
    willingToTrain: boolean;
    referralSource: string;
    ghanaCardNumber: string;
    declarationAccepted: boolean;
}

const EMPTY_FORM: ApplicationForm = {
    fullName: "", otherNames: "", surname: "", dateOfBirth: "", gender: "", nationality: "",
    email: "", phone: "", residentialAddress: "", digitalAddress: "",
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
    experienceYears: "", hasRealEstateExperience: false, educationLevel: "", skills: "",
    bankName: "", bankAccountName: "", bankAccountNumber: "",
    education: "", fieldOfStudy: "",
    coverageAreas: "", availability: "", hasSmartphone: false, transportMeans: "",
    internetReliability: "", criminalConviction: false, willingToTrain: false,
    referralSource: "", ghanaCardNumber: "", declarationAccepted: false,
};

const GENDERS = ["Female", "Male", "Other"];
const EDUCATION_LEVELS = ["JHS", "SHS", "Vocational", "Diploma", "Degree", "Postgraduate", "None"];
const AVAILABILITY = ["FullTime", "PartTime", "Flexible"];

const ROLE_HOME: Record<string, string> = { client: "/client", owner: "/owner", agent: "/agent" };

export default function AgentApplicationPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [existing, setExisting] = useState<null | { status: string } | "loading">("loading");
    const [role, setRole] = useState<string>("");
    const [ghanaCardFile, setGhanaCardFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Defense-in-depth: proxy already gates this route on the access cookie;
        // confirm server-side the session is live and prefill identity defaults.
        let cancelled = false;
        void profileApi.me()
            .then((data) => {
                if (cancelled) return;
                const p = data as { fullName?: string; email?: string; phone?: string; role?: string };
                setRole(p.role ?? "");
                setForm((prev) => ({
                    ...prev,
                    fullName: prev.fullName || p.fullName || "",
                    email: prev.email || p.email || "",
                    phone: prev.phone || p.phone || "",
                }));
            })
            .catch(() => router.push("/auth/login"));
        // If the caller already has an agent application on file, show its status
        // instead of a blank form (the backend rejects duplicate submissions 409).
        void profileApi.getAgentApplication()
            .then((data) => {
                if (cancelled) return;
                if (data && typeof data === "object" && "status" in data) {
                    setExisting({ status: String((data as { status: unknown }).status) });
                } else {
                    setExisting(null);
                }
            })
            .catch(() => setExisting(null));
        return () => { cancelled = true; };
    }, [router]);

    const set = <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const canProceed = () => {
        if (step === 1) return form.fullName.trim() !== "" && form.dateOfBirth !== "";
        if (step === 2) return form.email.trim() !== "" && form.phone.trim() !== "" && form.residentialAddress.trim() !== "";
        if (step === 3) return form.availability !== "";
        if (step === 4) return form.ghanaCardNumber.trim() !== "" && form.declarationAccepted;
        return true;
    };

    const handleComplete = async () => {
        setSaving(true);
        setError("");
        try {
            const body: Record<string, unknown> = {
                fullName: form.fullName.trim(),
                otherNames: form.otherNames.trim() || undefined,
                surname: form.surname.trim() || undefined,
                dateOfBirth: form.dateOfBirth || undefined,
                gender: form.gender || undefined,
                nationality: form.nationality.trim() || undefined,
                email: form.email.trim(),
                phone: form.phone.trim(),
                residentialAddress: form.residentialAddress.trim() || undefined,
                digitalAddress: form.digitalAddress.trim() || undefined,
                emergencyContactName: form.emergencyContactName.trim() || undefined,
                emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
                emergencyContactRelationship: form.emergencyContactRelationship.trim() || undefined,
                experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
                hasRealEstateExperience: form.hasRealEstateExperience,
                educationLevel: form.educationLevel || undefined,
                skills: form.skills.trim() || undefined,
                coverageAreas: form.coverageAreas.trim() || undefined,
                availability: form.availability || undefined,
                hasSmartphone: form.hasSmartphone,
                transportMeans: form.transportMeans.trim() || undefined,
                internetReliability: form.internetReliability.trim() || undefined,
                criminalConviction: form.criminalConviction,
                willingToTrain: form.willingToTrain,
                referralSource: form.referralSource.trim() || undefined,
                declarationAccepted: form.declarationAccepted,
                bankAccountName: form.bankAccountName.trim() || undefined,
                bankAccountNumber: form.bankAccountNumber.trim() || undefined,
                bankName: form.bankName.trim() || undefined,
                education: form.education.trim() || undefined,
                fieldOfStudy: form.fieldOfStudy.trim() || undefined,
            };
            await profileApi.agentApplication(body);

            // Upload the Ghana Card scan separately (the application stores the
            // number; the scan goes to /profile/ghana-card, which writes the
            // number on the user + stores the doc).
            if (ghanaCardFile) {
                const presign = await uploadApi.presign(ghanaCardFile.name, "documents", ghanaCardFile.type);
                const put = await fetch(presign.url, { method: "PUT", body: ghanaCardFile, headers: { "Content-Type": ghanaCardFile.type } });
                if (!put.ok) throw new Error("Ghana Card upload failed");
                await profileApi.uploadGhanaCard({
                    documentUrl: presign.publicUrl,
                    ghanaCardNumber: form.ghanaCardNumber.trim(),
                    filename: ghanaCardFile.name,
                });
            }
            setStep(5);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to submit application");
        } finally {
            setSaving(false);
        }
    };

    const totalSteps = 4;
    const home = ROLE_HOME[role] ?? "/";

    if (existing === "loading") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    // An application already on file — don't let them submit a duplicate.
    if (existing && existing.status) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 text-amber-600 mb-6">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-heading font-bold text-slate-900 mb-2">Application Already Submitted</h1>
                    <p className="text-slate-500 mb-2">
                        You have an agent application on file with status:
                    </p>
                    <p className="text-lg font-bold text-brand-700 mb-8">{existing.status}</p>
                    <Button onClick={() => router.push(home)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                        Back to my workspace <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Progress Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-heading font-bold text-slate-900">Become an Agent</h1>
                            <p className="text-sm text-slate-500 mt-0.5">Submit your details and KYC documents for review</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Step {Math.min(step, totalSteps)} of {totalSteps}</span>
                    </div>
                    <div className="flex gap-2">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 flex-1 rounded-full transition-colors ${
                                    i + 1 < step ? "bg-brand-500" : i + 1 === step ? "bg-brand-400" : "bg-slate-200"
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
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center"><User className="h-5 w-5 text-brand-600" /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Identity</h2>
                                    <p className="text-sm text-slate-500">Tell us who you are</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Full Name *"><input className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
                                <Field label="Other Names"><input className={inputCls} value={form.otherNames} onChange={(e) => set("otherNames", e.target.value)} /></Field>
                                <Field label="Surname"><input className={inputCls} value={form.surname} onChange={(e) => set("surname", e.target.value)} /></Field>
                                <Field label="Date of Birth *"><input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
                                <Field label="Gender">
                                    <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                                        <option value="">Select…</option>
                                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </Field>
                                <Field label="Nationality"><input className={inputCls} value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="e.g. Ghanaian" /></Field>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center"><MapPin className="h-5 w-5 text-brand-600" /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Contact &amp; Address</h2>
                                    <p className="text-sm text-slate-500">How to reach you, and where you live</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Email *"><input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                                <Field label="Phone *"><input type="tel" className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 024 123 4567" /></Field>
                                <Field label="Residential Address *" full><input className={inputCls} value={form.residentialAddress} onChange={(e) => set("residentialAddress", e.target.value)} /></Field>
                                <Field label="Digital Address (Ghana Post GPS)"><input className={inputCls} value={form.digitalAddress} onChange={(e) => set("digitalAddress", e.target.value)} placeholder="e.g. GA-123-4567" /></Field>
                                <Field label="Emergency Contact Name"><input className={inputCls} value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} /></Field>
                                <Field label="Emergency Contact Phone"><input type="tel" className={inputCls} value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} /></Field>
                                <Field label="Emergency Contact Relationship"><input className={inputCls} value={form.emergencyContactRelationship} onChange={(e) => set("emergencyContactRelationship", e.target.value)} placeholder="e.g. Spouse" /></Field>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center"><Briefcase className="h-5 w-5 text-brand-600" /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Experience &amp; Availability</h2>
                                    <p className="text-sm text-slate-500">Your background and how you can work</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Years of Experience"><input type="number" min="0" className={inputCls} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} /></Field>
                                <Field label="Education Level">
                                    <select className={inputCls} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
                                        <option value="">Select…</option>
                                        {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </Field>
                                <Field label="Skills" full><input className={inputCls} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="e.g. Negotiation, Valuation, Sales" /></Field>
                                <Field label="Coverage Areas" full><input className={inputCls} value={form.coverageAreas} onChange={(e) => set("coverageAreas", e.target.value)} placeholder="Regions/constituencies you can cover" /></Field>
                                <Field label="Availability *">
                                    <select className={inputCls} value={form.availability} onChange={(e) => set("availability", e.target.value)}>
                                        <option value="">Select…</option>
                                        {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </Field>
                                <Field label="Transport Means"><input className={inputCls} value={form.transportMeans} onChange={(e) => set("transportMeans", e.target.value)} placeholder="e.g. Motorbike, Car" /></Field>
                                <Field label="Internet Reliability"><input className={inputCls} value={form.internetReliability} onChange={(e) => set("internetReliability", e.target.value)} placeholder="e.g. Stable, Intermittent" /></Field>
                                <Field label="Referral Source"><input className={inputCls} value={form.referralSource} onChange={(e) => set("referralSource", e.target.value)} placeholder="How did you hear about us?" /></Field>
                                <Field label="Bank Name"><input className={inputCls} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="e.g. Ecobank" /></Field>
                                <Field label="Bank Account Name"><input className={inputCls} value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} /></Field>
                                <Field label="Bank Account Number"><input className={inputCls} value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} /></Field>
                                <Field label="Field of Study"><input className={inputCls} value={form.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} placeholder="e.g. Land Economy" /></Field>
                                <Field label="Education (free text)" full>
                                    <textarea className={inputCls} rows={2} value={form.education} onChange={(e) => set("education", e.target.value)} placeholder="e.g. BSc Land Economy, KNUST (2018)" />
                                </Field>
                                <label className="sm:col-span-2 flex items-center gap-3 mt-1 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.hasRealEstateExperience} onChange={(e) => set("hasRealEstateExperience", e.target.checked)} />
                                    <span className="text-sm font-medium text-slate-700">I have prior real estate experience</span>
                                </label>
                                <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.hasSmartphone} onChange={(e) => set("hasSmartphone", e.target.checked)} />
                                    <span className="text-sm font-medium text-slate-700">I own a smartphone</span>
                                </label>
                                <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.willingToTrain} onChange={(e) => set("willingToTrain", e.target.checked)} />
                                    <span className="text-sm font-medium text-slate-700">I am willing to undergo training</span>
                                </label>
                                <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.criminalConviction} onChange={(e) => set("criminalConviction", e.target.checked)} />
                                    <span className="text-sm font-medium text-slate-700">I have a criminal conviction to disclose</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center"><CreditCard className="h-5 w-5 text-brand-600" /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Ghana Card &amp; Declaration</h2>
                                    <p className="text-sm text-slate-500">Verify your identity and confirm your details</p>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <Field label="Ghana Card Number *"><input className={inputCls} value={form.ghanaCardNumber} onChange={(e) => set("ghanaCardNumber", e.target.value)} placeholder="e.g. GHA-712345678-9" /></Field>
                                <div>
                                    <span className="block text-sm font-semibold text-slate-900 mb-1.5">Ghana Card Scan</span>
                                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setGhanaCardFile(e.target.files?.[0] ?? null)} />
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl p-6 text-center hover:bg-brand-50 hover:border-brand-300 transition-colors cursor-pointer"
                                    >
                                        <UploadCloud className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-slate-900">{ghanaCardFile ? ghanaCardFile.name : "Click to upload scan"}</p>
                                        <p className="text-xs text-slate-500 mt-1">High-res JPG, PNG or PDF.</p>
                                    </div>
                                </div>
                                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50">
                                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.declarationAccepted} onChange={(e) => set("declarationAccepted", e.target.checked)} />
                                    <span className="text-sm font-medium text-slate-700">
                                        I declare that the information provided is true and accurate to the best of my knowledge.
                                        I understand that providing false information may lead to disqualification.
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center animate-fade-in">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-6">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">Application Submitted</h2>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                Your agent application is pending admin review. We&apos;ll notify you when it&apos;s approved.
                            </p>
                            <Button size="lg" onClick={() => router.push(home)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                                Back to my workspace <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}

                    {/* Navigation */}
                    {step < 5 && (
                        <div className="flex items-center justify-between mt-6">
                            <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="text-slate-600">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Back
                            </Button>
                            {step < 4 ? (
                                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            ) : (
                                <Button onClick={handleComplete} disabled={!canProceed() || saving} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : <><ShieldCheck className="h-4 w-4 mr-1" /> Submit Application</>}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const inputCls = "block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all";

function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">{label}</label>
            {children}
        </div>
    );
}