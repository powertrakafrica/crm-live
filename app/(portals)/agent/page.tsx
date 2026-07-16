"use client";

import { useEffect, useState } from "react";
import {
    Map, Ticket, ShieldCheck,
    Home, Wallet, UserCircle,
    Lock, AlertTriangle, ArrowRight, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AgentOverview } from "./components/AgentOverview";
import { AgentTickets } from "./components/AgentTickets";
import { AgentVerification } from "./components/AgentVerification";
import { AgentListings } from "./components/AgentListings";
import { AgentEarnings } from "./components/AgentEarnings";
import { AgentProfile } from "./components/AgentProfile";
import { profileApi } from "@/lib/api";
import { useGeoRegions } from "@/lib/hooks/geo";
import { coverageHeaderLabel, coverageToItems, type CoverageItem } from "@/lib/coverage";

type TabId = "overview" | "tickets" | "verification" | "listings" | "earnings" | "profile";
// Suspended is an admin-locked state: the account was approved then re-locked.
// isVerified stays === "Approved" so Suspended is treated as locked (like Rejected)
// but with its own messaging.
type VerificationStatus = "Pending" | "Approved" | "Rejected" | "Suspended";

type DocType =
    | "Certificate"
    | "GhanaCard"
    | "Other"
    | "PartnershipAgreement"
    | "PoliceClearance"
    | "ProofOfAddress";

interface AgentDoc {
    id: number;
    docType: DocType;
    fileUrl: string;
    status: "Approved" | "Pending" | "Rejected";
}

interface AgentProfileData {
    coverage?: { items: CoverageItem[] } | null;
    fullName?: string;
    isOnboardingComplete?: boolean;
    agentCode?: string | null;
    documents?: AgentDoc[];
    verificationNotes?: string | null;
    verificationStatus?: VerificationStatus;
}

export default function AgentPortal() {
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [agentProfile, setAgentProfile] = useState<AgentProfileData | null>(null);

    useEffect(() => {
        // Load the agent profile to determine verification status. The (locked)
        // operational APIs are never called from the portal until verified, so a
        // pending agent doesn't eat a 403 on load.
        profileApi
            .agentProfile()
            .then((data: any) => {
                setAgentProfile(data as AgentProfileData);
            })
            .catch(() => {});
    }, []);

    const { data: regions } = useGeoRegions();

    const verificationStatus: VerificationStatus = agentProfile?.verificationStatus ?? "Pending";
    const isVerified = verificationStatus === "Approved";

    const assignedRegion = coverageHeaderLabel(
        coverageToItems(agentProfile?.coverage),
        regions,
    );

    const goProfile = () => setActiveTab("profile");

    const navItems = [
        { id: "overview" as TabId, label: "Overview & Map", icon: Map },
        { id: "tickets" as TabId, label: "Tickets & Leads", icon: Ticket },
        { id: "verification" as TabId, label: "Site Verifications", icon: ShieldCheck },
        { id: "listings" as TabId, label: "Managed Listings", icon: Home },
        { id: "earnings" as TabId, label: "Earnings & Payouts", icon: Wallet },
        { id: "profile" as TabId, label: "Profile & Identity", icon: UserCircle },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 pt-6 pb-20 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto w-full">
                {/* Horizontal top navigation (replaces the former vertical
                    sidebar). The tab row is full-width and sticky so it stays
                    in view as the agent scrolls through the content below. */}
                <nav className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 mb-8 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                                    activeTab === item.id
                                        ? "bg-brand-50 text-brand-700 border border-brand-200"
                                        : "text-slate-600 hover:bg-slate-100 border border-transparent"
                                }`}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Main Content — full width below the top nav */}
                <div className="min-h-[600px] animate-fade-in">
                    {activeTab === "overview" && (isVerified ? (
                        <AgentOverview regionLabel={assignedRegion} />
                    ) : (
                        <PendingOverview
                            status={verificationStatus}
                            notes={agentProfile?.verificationNotes}
                            profile={agentProfile}
                            onGoProfile={goProfile}
                        />
                    ))}
                    {activeTab === "tickets" && (isVerified ? <AgentTickets /> : <LockedSection title="Tickets & Leads" status={verificationStatus} onGoProfile={goProfile} />)}
                    {activeTab === "verification" && (isVerified ? <AgentVerification /> : <LockedSection title="Site Verifications" status={verificationStatus} onGoProfile={goProfile} />)}
                    {activeTab === "listings" && (isVerified ? <AgentListings /> : <LockedSection title="Managed Listings" status={verificationStatus} onGoProfile={goProfile} />)}
                    {activeTab === "earnings" && (isVerified ? <AgentEarnings /> : <LockedSection title="Earnings & Payouts" status={verificationStatus} onGoProfile={goProfile} />)}
                    {activeTab === "profile" && <AgentProfile />}
                </div>
            </div>
        </div>
    );
}

// Rendered in place of an operational tab while the agent account is not yet
// admin-verified. Mounting this instead of the real component means the locked
// APIs are never called from the portal, so there's no 403 noise.
function LockedSection({ title, status, onGoProfile }: { title: string; status: VerificationStatus; onGoProfile: () => void }) {
    const rejected = status === "Rejected";
    const suspended = status === "Suspended";
    const tone = rejected || suspended ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600";
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center text-center">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 ${tone}`}>
                <Lock className="h-7 w-7" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 text-lg">{title} are locked</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md">
                {rejected
                    ? "Your account verification was rejected. Review the notes on your Overview, update your information in Profile & Identity, and request re-review."
                    : suspended
                      ? "Your agent account has been suspended by an administrator. Contact TEPS support to resolve the issue and request reactivation."
                      : "Your agent account is pending admin verification. Once an administrator reviews and approves your account, this section will unlock."}
            </p>
            <Button onClick={onGoProfile} className="mt-6 bg-brand-600 hover:bg-brand-700 text-white font-bold">
                Go to Profile & Identity <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
        </div>
    );
}

// Pending overview: a verification-status banner plus a checklist of what the
// agent should submit for admin review. Shown instead of AgentOverview until
// verificationStatus === "Approved".
function PendingOverview({
    status,
    notes,
    profile,
    onGoProfile,
}: {
    status: VerificationStatus;
    notes?: string | null;
    profile: AgentProfileData | null;
    onGoProfile: () => void;
}) {
    const rejected = status === "Rejected";
    const suspended = status === "Suspended";
    const docs = profile?.documents ?? [];
    const hasDoc = (type: DocType) => docs.some((d) => d.docType === type);
    const coverageSet = (profile?.coverage?.items?.length ?? 0) > 0;
    const checklist = [
        { label: "Complete profile & upload Ghana Card", done: !!profile?.isOnboardingComplete && hasDoc("GhanaCard") },
        { label: "Upload signed Partnership Agreement", done: hasDoc("PartnershipAgreement") },
        { label: "Set your coverage regions", done: coverageSet },
    ];
    const allDone = checklist.every((c) => c.done);

    return (
        <div className="space-y-6">
            <div className={`rounded-2xl shadow-sm border p-6 ${rejected || suspended ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${rejected || suspended ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                        {rejected || suspended ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                        <h2 className="font-heading font-bold text-slate-900 text-lg">
                            {rejected ? "Verification rejected" : suspended ? "Account suspended" : "Account pending verification"}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            {rejected
                                ? "An administrator reviewed your account and could not approve it. Please address the note below, update your information, and request re-review."
                                : suspended
                                  ? "Your agent account has been suspended by an administrator. Please contact TEPS support to resolve the issue and request reactivation."
                                  : "Your account is awaiting administrator verification. Complete the checklist below so an admin can review and approve you."}
                        </p>
                        {(rejected || suspended) && notes && (
                            <div className="mt-3 bg-white border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                <span className="font-bold">Admin note: </span>{notes}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-heading font-bold text-slate-900 mb-4">Verification checklist</h3>
                <ul className="space-y-3">
                    {checklist.map((item) => (
                        <li key={item.label} className="flex items-center gap-3">
                            <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                <CheckCircle className="h-4 w-4" />
                            </span>
                            <span className={`text-sm ${item.done ? "text-slate-700 font-medium" : "text-slate-500"}`}>{item.label}</span>
                        </li>
                    ))}
                </ul>
                <div className="mt-6 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        {allDone ? "All set — waiting for an administrator to approve your account." : "Finish the steps above to be ready for review."}
                    </p>
                    <Button onClick={onGoProfile} className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                        Update profile <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
