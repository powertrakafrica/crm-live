"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { profileApi } from "@/lib/api";

// A logged-in client or owner applies to become an agent here. The application
// is linked to the user's account, so when an admin approves it in the CRM the
// backend promotes the user's role to 'agent' in place — no second account, no
// password reset. Until then the applicant can see their own status below.
//
// The form captures every required Agent Enlistment Form field in one
// submission: identity (name split, DOB, gender, nationality, address, emergency
// contact), experience/availability, optional banking, referral source, and the
// mandatory declaration. Identity fields persist on the user; enlistment fields
// land on the application row. The backend rebuilds fullName from the split name
// parts, so we send those and let it derive the display name.

type AppStatus = "Approved" | "Pending" | "Rejected";

interface MyApplication {
    id: number;
    status: AppStatus;
    fullName?: string;
    submittedAt?: string;
    reviewNotes?: string | null;
}

const STATUS_META: Record<AppStatus, { icon: typeof Clock; label: string; tone: string }> = {
    Pending: { icon: Clock, label: "Under Review", tone: "text-amber-600 bg-amber-50 border-amber-200" },
    Approved: { icon: CheckCircle, label: "Approved", tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    Rejected: { icon: XCircle, label: "Rejected", tone: "text-red-600 bg-red-50 border-red-200" },
};

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const AVAILABILITY_OPTIONS = ["FullTime", "PartTime", "Flexible"] as const;
const AVAILABILITY_LABEL: Record<string, string> = {
    FullTime: "Full-time",
    PartTime: "Part-time",
    Flexible: "Flexible",
};
const EDUCATION_LEVEL_OPTIONS = ["None", "JHS", "SHS", "Vocational", "Diploma", "Degree", "Postgraduate"] as const;
const EDUCATION_LEVEL_LABEL: Record<string, string> = {
    Degree: "Degree",
    Diploma: "Diploma",
    JHS: "JHS (Junior High)",
    None: "None",
    Postgraduate: "Postgraduate",
    SHS: "SHS (Senior High)",
    Vocational: "Vocational",
};

export default function BecomeAgentPage() {
    // Identity / name split
    const [surname, setSurname] = useState("");
    const [firstName, setFirstName] = useState("");
    const [otherNames, setOtherNames] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [nationality, setNationality] = useState("Ghana");
    const [residentialAddress, setResidentialAddress] = useState("");
    const [digitalAddress, setDigitalAddress] = useState("");
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
    const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

    // Experience
    const [education, setEducation] = useState("");
    const [educationLevel, setEducationLevel] = useState("");
    const [fieldOfStudy, setFieldOfStudy] = useState("");
    const [experienceYears, setExperienceYears] = useState("");
    const [hasRealEstateExperience, setHasRealEstateExperience] = useState(false);
    const [skills, setSkills] = useState("");
    const [coverageAreas, setCoverageAreas] = useState("");
    const [transportMeans, setTransportMeans] = useState("");
    const [hasSmartphone, setHasSmartphone] = useState(true);
    const [internetReliability, setInternetReliability] = useState("");
    const [availability, setAvailability] = useState("");
    const [willingToTrain, setWillingToTrain] = useState(false);
    const [criminalConviction, setCriminalConviction] = useState(false);

    // Banking (optional)
    const [bankName, setBankName] = useState("");
    const [bankAccountName, setBankAccountName] = useState("");
    const [bankAccountNumber, setBankAccountNumber] = useState("");

    // Referral
    const [referralSource, setReferralSource] = useState("");

    // Declaration
    const [declarationAccepted, setDeclarationAccepted] = useState(false);

    const [existing, setExisting] = useState<MyApplication | null>(null);
    const [loadingExisting, setLoadingExisting] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        profileApi
            .myAgentApplication()
            .then((data: any) => {
                if (data) setExisting(data as MyApplication);
            })
            .catch(() => setExisting(null))
            .finally(() => setLoadingExisting(false));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Required (*) fields across Identity + Experience + Declaration.
        const missing: string[] = [];
        if (!firstName.trim()) missing.push("First name");
        if (!surname.trim()) missing.push("Surname");
        if (!email.trim()) missing.push("Email");
        if (!phone.trim()) missing.push("Phone");
        if (!dateOfBirth) missing.push("Date of birth");
        if (!gender) missing.push("Gender");
        if (!nationality.trim()) missing.push("Nationality");
        if (!digitalAddress.trim()) missing.push("Digital address");
        if (!residentialAddress.trim()) missing.push("Residential address");
        if (!emergencyContactName.trim()) missing.push("Emergency contact name");
        if (!emergencyContactRelationship.trim()) missing.push("Emergency contact relationship");
        if (!emergencyContactPhone.trim()) missing.push("Emergency contact phone");
        if (!availability) missing.push("Availability");
        if (!educationLevel) missing.push("Education level");
        if (!willingToTrain) missing.push("Willingness to train");
        if (!declarationAccepted) missing.push("Declaration acceptance");
        if (missing.length > 0) {
            setError(`Please complete required fields: ${missing.join(", ")}.`);
            return;
        }
        setSubmitting(true);
        setError("");
        try {
            // fullName is derived from the split parts; the backend re-derives it
            // too, but we send it so the required-field guard on the server passes.
            const fullName = [firstName, otherNames, surname].filter(Boolean).join(" ").trim();
            const app = await profileApi.submitAgentApplication({
                availability,
                bankAccountName: bankAccountName || undefined,
                bankAccountNumber: bankAccountNumber || undefined,
                bankName: bankName || undefined,
                coverageAreas,
                criminalConviction,
                dateOfBirth: dateOfBirth || undefined,
                declarationAccepted,
                digitalAddress: digitalAddress || undefined,
                education,
                educationLevel,
                email,
                emergencyContactName,
                emergencyContactPhone,
                emergencyContactRelationship,
                experienceYears: experienceYears ? Number(experienceYears) : undefined,
                fieldOfStudy: fieldOfStudy || undefined,
                firstName,
                fullName,
                gender: gender || undefined,
                hasRealEstateExperience,
                hasSmartphone,
                internetReliability,
                nationality,
                otherNames: otherNames || undefined,
                phone,
                referralSource: referralSource || undefined,
                residentialAddress,
                skills,
                surname,
                transportMeans,
                willingToTrain,
            });
            setExisting(app as MyApplication);
        } catch (err: any) {
            setError(err.message || "Submission failed");
        } finally {
            setSubmitting(false);
        }
    }

    if (loadingExisting) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
        );
    }

    // Once an application exists, show its status instead of the form. A
    // Pending/Approved app shouldn't be re-submitted (the backend rejects
    // duplicate Pending apps with 409 anyway).
    if (existing) {
        const meta = STATUS_META[existing.status] ?? STATUS_META.Pending;
        const StatusIcon = meta.icon;
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-6">
                        <ArrowLeft className="h-4 w-4" /> Back to home
                    </Link>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-brand-600" /> Agent Application
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${meta.tone}`}>
                                <StatusIcon className="h-4 w-4" /> {meta.label}
                            </div>
                            <p className="text-sm text-slate-600">
                                Submitted for <span className="font-semibold">{existing.fullName}</span>
                                {existing.submittedAt ? ` on ${new Date(existing.submittedAt).toLocaleDateString()}` : ""}.
                            </p>
                            {existing.status === "Pending" && (
                                <p className="text-sm text-slate-500">
                                    Our team is reviewing your application. You&apos;ll be able to access the agent portal once approved.
                                </p>
                            )}
                            {existing.status === "Approved" && (
                                <div className="text-sm text-slate-600 space-y-2">
                                    <p className="font-semibold text-emerald-700">You&apos;re approved! Welcome to the agent network.</p>
                                    <Link href="/auth/login" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:underline">
                                        Log in to continue onboarding <ArrowLeft className="h-4 w-4 rotate-180" />
                                    </Link>
                                </div>
                            )}
                            {existing.status === "Rejected" && (
                                <p className="text-sm text-slate-600">
                                    {existing.reviewNotes ? `Reason: ${existing.reviewNotes}` : "Your application was not approved at this time."}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-6">
                    <ArrowLeft className="h-4 w-4" /> Back to home
                </Link>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-brand-600" /> Become a TEPS Agent
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            Join the field verification network. Submit your details and our team will review your application.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Identity */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 border-b border-slate-200 pb-2">
                                    Identity
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Surname *">
                                        <input value={surname} onChange={(e) => setSurname(e.target.value)} className={inputCls} required />
                                    </Field>
                                    <Field label="First name *">
                                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} required />
                                    </Field>
                                    <Field label="Other names" className="sm:col-span-2">
                                        <input value={otherNames} onChange={(e) => setOtherNames(e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Date of birth *">
                                        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} required />
                                    </Field>
                                    <Select label="Gender *" value={gender} onChange={setGender} options={GENDER_OPTIONS as unknown as string[]} required />
                                    <Field label="Nationality *">
                                        <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputCls} required />
                                    </Field>
                                    <Field label="Digital address (GhanaPost) *">
                                        <input value={digitalAddress} onChange={(e) => setDigitalAddress(e.target.value)} className={inputCls} placeholder="e.g. GA-144-1234" required />
                                    </Field>
                                    <Field label="Residential address *" className="sm:col-span-2">
                                        <input value={residentialAddress} onChange={(e) => setResidentialAddress(e.target.value)} className={inputCls} required />
                                    </Field>
                                </div>
                            </section>

                            {/* Emergency contact */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 border-b border-slate-200 pb-2">
                                    Emergency Contact
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Contact name *">
                                        <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className={inputCls} required />
                                    </Field>
                                    <Field label="Relationship *">
                                        <input value={emergencyContactRelationship} onChange={(e) => setEmergencyContactRelationship(e.target.value)} className={inputCls} placeholder="e.g. Sibling, Spouse" required />
                                    </Field>
                                    <Field label="Contact phone *" className="sm:col-span-2">
                                        <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className={inputCls} required />
                                    </Field>
                                </div>
                            </section>

                            {/* Experience & logistics */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 border-b border-slate-200 pb-2">
                                    Experience &amp; Logistics
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select
                                        label="Availability *"
                                        value={availability}
                                        onChange={setAvailability}
                                        options={AVAILABILITY_OPTIONS as unknown as string[]}
                                        render={(o) => AVAILABILITY_LABEL[o] ?? o}
                                        required
                                    />
                                    <Select
                                        label="Education level *"
                                        value={educationLevel}
                                        onChange={setEducationLevel}
                                        options={EDUCATION_LEVEL_OPTIONS as unknown as string[]}
                                        render={(o) => EDUCATION_LEVEL_LABEL[o] ?? o}
                                        required
                                    />
                                    <Field label="Field of study">
                                        <input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} className={inputCls} placeholder="e.g. Land Economy" />
                                    </Field>
                                    <Field label="Education (free text)">
                                        <input value={education} onChange={(e) => setEducation(e.target.value)} className={inputCls} placeholder="e.g. Diploma" />
                                    </Field>
                                    <Field label="Years of experience">
                                        <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Internet reliability">
                                        <input value={internetReliability} onChange={(e) => setInternetReliability(e.target.value)} className={inputCls} placeholder="e.g. Good / Moderate" />
                                    </Field>
                                    <Field label="Transport means">
                                        <input value={transportMeans} onChange={(e) => setTransportMeans(e.target.value)} className={inputCls} placeholder="e.g. Motorbike" />
                                    </Field>
                                    <Field label="Skills" className="sm:col-span-2">
                                        <input value={skills} onChange={(e) => setSkills(e.target.value)} className={inputCls} placeholder="e.g. Surveying, negotiation" />
                                    </Field>
                                    <Field label="Coverage areas" className="sm:col-span-2">
                                        <input value={coverageAreas} onChange={(e) => setCoverageAreas(e.target.value)} className={inputCls} placeholder="Regions / constituencies you can cover" />
                                    </Field>
                                </div>
                                <div className="space-y-3 pt-1">
                                    <Toggle label="I have real estate experience" checked={hasRealEstateExperience} onChange={setHasRealEstateExperience} />
                                    <Toggle label="I have a smartphone" checked={hasSmartphone} onChange={setHasSmartphone} />
                                    <Toggle label="I am willing to undergo training *" checked={willingToTrain} onChange={setWillingToTrain} />
                                    <Toggle label="I have a criminal conviction" checked={criminalConviction} onChange={setCriminalConviction} />
                                </div>
                            </section>

                            {/* Banking (optional) */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 border-b border-slate-200 pb-2">
                                    Banking <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Bank name">
                                        <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Account name">
                                        <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className={inputCls} />
                                    </Field>
                                    <Field label="Account number" className="sm:col-span-2">
                                        <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className={inputCls} />
                                    </Field>
                                </div>
                            </section>

                            {/* Referral */}
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 border-b border-slate-200 pb-2">
                                    Referral
                                </h3>
                                <Field label="How did you hear about us?">
                                    <input value={referralSource} onChange={(e) => setReferralSource(e.target.value)} className={inputCls} placeholder="e.g. Friend, Facebook, Walk-in" />
                                </Field>
                            </section>

                            {/* Declaration */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 border-b border-slate-200 pb-2">
                                    Declaration
                                </h3>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={declarationAccepted}
                                        onChange={(e) => setDeclarationAccepted(e.target.checked)}
                                        className="h-5 w-5 mt-0.5 accent-brand-600"
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        I confirm the information above is accurate and complete, and I consent to TEPS
                                        conducting verification checks as part of the agent approval process. *
                                    </span>
                                </label>
                            </section>

                            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                            <Button type="submit" disabled={submitting} className="w-full font-bold">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Submit Application
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function Field({ label, children, className = "" }: { children: React.ReactNode; className?: string; label: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
            {children}
        </label>
    );
}

// Mirrors Field's styling but wraps a raw <select> with inputCls, the same
// pattern CoveragePicker uses (no shared select primitive exists yet).
function Select({
    label,
    value,
    onChange,
    options,
    render,
    required,
    className = "",
}: {
    className?: string;
    label: string;
    onChange: (v: string) => void;
    options: string[];
    render?: (o: string) => string;
    required?: boolean;
    value: string;
}) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className={inputCls}
            >
                <option value="">Select…</option>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {render ? render(o) : o}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Toggle({ label, checked, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-brand-600" />
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </label>
    );
}