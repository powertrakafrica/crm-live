"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    MapPin, Receipt, Clock, ClipboardCheck, Users, Home, ArrowRight, CheckCircle2, XCircle, CircleDashed,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import InteractiveMap from "@/components/InteractiveMap";
import { agentApi } from "@/lib/api";

// VerificationStatusEnum: Unverified, DocumentsUploaded, AgentAssigned,
// SiteVisitScheduled, UnderReview, Verified, Rejected. Terminal = Verified/Rejected.
type VerificationStatus =
    | "Unverified" | "DocumentsUploaded" | "AgentAssigned"
    | "SiteVisitScheduled" | "UnderReview" | "Verified" | "Rejected";
type CheckStatus = "Pending" | "Passed" | "Failed";
type BookingStatus = "Cancelled" | "Completed" | "Confirmed" | "NoShow" | "Pending";
type LeadStatus = "New" | "Qualified" | "ViewingScheduled" | "OfferMade" | "Negotiating" | "ClosedWon" | "ClosedLost";

interface EarningsData { totalEarned: number; pending: number; }
interface Ticket {
    id: number; clientName: string; propertyTitle: string; propertyLocation: string;
    scheduledDate: string; status: BookingStatus;
}
interface Verification {
    id: number; propertyId: number; propertyTitle: string; propertyLocation: string;
    status: VerificationStatus; createdAt: string; checks: { status: CheckStatus }[];
}
interface Lead { id: number; title: string; status: LeadStatus; priority: string; createdAt: string; }
interface Listing { id: number; title: string; }

const TERMINAL_VERIFICATION: ReadonlySet<VerificationStatus> = new Set(["Verified", "Rejected"]);
const OPEN_BOOKING: ReadonlySet<BookingStatus> = new Set(["Pending", "Confirmed"]);

function verificationBadge(status: VerificationStatus): { label: string; className: string } {
    switch (status) {
        case "Verified": return { label: "Verified", className: "bg-green-100 text-green-700" };
        case "Rejected": return { label: "Rejected", className: "bg-red-100 text-red-700" };
        case "UnderReview": return { label: "Under Review", className: "bg-amber-100 text-amber-700" };
        case "SiteVisitScheduled": return { label: "Visit Scheduled", className: "bg-blue-100 text-blue-700" };
        case "AgentAssigned": return { label: "Agent Assigned", className: "bg-charcoal-100 text-charcoal-700" };
        case "DocumentsUploaded": return { label: "Docs Uploaded", className: "bg-charcoal-100 text-charcoal-700" };
        default: return { label: "Unverified", className: "bg-charcoal-100 text-charcoal-500" };
    }
}

function bookingBadge(status: BookingStatus): { label: string; className: string } {
    switch (status) {
        case "Completed": return { label: "Completed", className: "bg-green-100 text-green-700" };
        case "Confirmed": return { label: "Confirmed", className: "bg-blue-100 text-blue-700" };
        case "Pending": return { label: "Pending", className: "bg-amber-100 text-amber-700" };
        case "Cancelled": return { label: "Cancelled", className: "bg-red-100 text-red-700" };
        case "NoShow": return { label: "No-show", className: "bg-charcoal-200 text-charcoal-700" };
        default: return { label: status, className: "bg-charcoal-100 text-charcoal-700" };
    }
}

function StatCard({ icon: Icon, label, value, sub, tone }: {
    icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; tone: "brand" | "accent" | "charcoal";
}) {
    const toneMap = {
        brand: "text-brand-600 bg-brand-50",
        accent: "text-accent-600 bg-accent-50",
        charcoal: "text-charcoal-700 bg-charcoal-100",
    } as const;
    return (
        <Card className="shadow-sm border-charcoal-200">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">{label}</p>
                        <p className="text-2xl font-black text-charcoal-950 mt-1.5 truncate">{value}</p>
                        {sub && <p className="text-xs text-charcoal-500 font-medium mt-0.5">{sub}</p>}
                    </div>
                    <div className={`h-10 w-10 rounded-sm flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function AgentOverview({ regionLabel }: { regionLabel?: string }) {
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Each source loads independently via allSettled so one slow/failing
        // endpoint never blanks the whole dashboard.
        Promise.allSettled([
            agentApi.earnings(),
            agentApi.tickets(),
            agentApi.verifications(),
            agentApi.leads(),
            agentApi.myListings(),
        ]).then(([e, t, v, l, m]) => {
            if (e.status === "fulfilled") {
                const d = e.value as EarningsData & { commissions?: unknown[]; payouts?: unknown[] };
                setEarnings({ totalEarned: d.totalEarned ?? 0, pending: d.pending ?? 0 });
            }
            if (t.status === "fulfilled") setTickets((t.value as Ticket[]).map((x) => ({
                id: x.id, clientName: x.clientName ?? "Unknown", propertyTitle: x.propertyTitle ?? "Unknown",
                propertyLocation: x.propertyLocation ?? "", scheduledDate: x.scheduledDate, status: x.status,
            })));
            if (v.status === "fulfilled") setVerifications(v.value as Verification[]);
            if (l.status === "fulfilled") setLeads(l.value as Lead[]);
            if (m.status === "fulfilled") setListings((m.value as Listing[]).map((p: any) => ({ id: p.id, title: p.title })));
            setLoading(false);
        });
    }, []);

    const activeVerifications = verifications.filter((x) => !TERMINAL_VERIFICATION.has(x.status)).length;
    const openTickets = tickets.filter((t) => OPEN_BOOKING.has(t.status)).length;
    const newLeads = leads.filter((l) => l.status === "New").length;
    const recentTickets = tickets.slice(0, 5);
    const recentVerifications = verifications.slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Territory Overview</h2>
                <p className="text-charcoal-500 font-medium mt-1">Your earnings, workload, and coverage at a glance.</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard icon={Receipt} tone="brand" label="Total Earned"
                    value={loading && !earnings ? "…" : `GH₵ ${((earnings?.totalEarned ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    sub="Lifetime commissions" />
                <StatCard icon={Clock} tone="accent" label="Pending"
                    value={loading && !earnings ? "…" : `GH₵ ${((earnings?.pending ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    sub="Awaiting payout" />
                <StatCard icon={ClipboardCheck} tone="charcoal" label="Active Verifications"
                    value={loading ? "…" : String(activeVerifications)} sub={`${verifications.length} total assigned`} />
                <StatCard icon={Users} tone="brand" label="Open Tickets"
                    value={loading ? "…" : String(openTickets)} sub="Upcoming viewings" />
                <StatCard icon={Users} tone="accent" label="New Leads"
                    value={loading ? "…" : String(newLeads)} sub={`${leads.length} total leads`} />
                <StatCard icon={Home} tone="charcoal" label="My Listings"
                    value={loading ? "…" : String(listings.length)} sub="Properties you own" />
            </div>

            {/* Recent activity lists */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Tickets */}
                <Card className="shadow-sm border-charcoal-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-bold text-charcoal-950 flex items-center gap-2">
                                <Users className="h-4 w-4 text-brand-600" /> Upcoming Viewings
                            </h3>
                            <Link href="/agent/tickets" className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="space-y-3">
                                {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-charcoal-50 rounded-sm animate-pulse" />)}
                            </div>
                        ) : recentTickets.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-8 w-8 text-charcoal-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-charcoal-500">No viewings scheduled.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentTickets.map((t) => {
                                    const b = bookingBadge(t.status);
                                    return (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-sm border border-charcoal-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-charcoal-900 truncate">{t.propertyTitle}</p>
                                                <p className="text-xs text-charcoal-500 truncate">{t.clientName}{t.propertyLocation ? ` · ${t.propertyLocation}` : ""}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <Badge className={`${b.className} border-none shadow-none text-[10px] font-bold uppercase tracking-wider`}>{b.label}</Badge>
                                                <p className="text-[11px] text-charcoal-500 font-medium mt-0.5">{t.scheduledDate ? new Date(t.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Verifications */}
                <Card className="shadow-sm border-charcoal-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-bold text-charcoal-950 flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-brand-600" /> Recent Verifications
                            </h3>
                            <Link href="/agent/verifications" className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>
                        {loading ? (
                            <div className="space-y-3">
                                {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-charcoal-50 rounded-sm animate-pulse" />)}
                            </div>
                        ) : recentVerifications.length === 0 ? (
                            <div className="text-center py-8">
                                <ClipboardCheck className="h-8 w-8 text-charcoal-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-charcoal-500">No verifications assigned.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentVerifications.map((v) => {
                                    const b = verificationBadge(v.status);
                                    const passed = v.checks.filter((c) => c.status === "Passed").length;
                                    const failed = v.checks.filter((c) => c.status === "Failed").length;
                                    const total = v.checks.length;
                                    return (
                                        <div key={v.id} className="flex items-center gap-3 p-3 rounded-sm border border-charcoal-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-charcoal-900 truncate">{v.propertyTitle}</p>
                                                <p className="text-xs text-charcoal-500 truncate flex items-center gap-1.5">
                                                    {v.propertyLocation}
                                                    {total > 0 && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3 text-green-600" />{passed}
                                                            {failed > 0 && <><XCircle className="h-3 w-3 text-red-500 ml-1" />{failed}</>}
                                                            <CircleDashed className="h-3 w-3 text-charcoal-400 ml-1" />{total - passed - failed}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <Badge className={`${b.className} border-none shadow-none text-[10px] font-bold uppercase tracking-wider shrink-0`}>{b.label}</Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Coverage Map */}
            <div className="bg-white rounded-sm border border-charcoal-200 shadow-sm overflow-hidden p-4">
                <div className="mb-4 flex items-center justify-between px-2">
                    <div>
                        <h3 className="font-heading font-bold text-lg text-charcoal-950">Territory Coverage</h3>
                        <p className="text-sm text-charcoal-500">Properties and demand across your assigned region.</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold bg-brand-50 text-brand-700 px-3 py-1.5 rounded-sm border border-brand-200">
                        <MapPin className="h-4 w-4" />
                        {regionLabel ?? "Ghana"}
                    </div>
                </div>
                <div className="rounded-sm overflow-hidden border border-charcoal-200">
                    <InteractiveMap height="h-[400px]" />
                </div>
            </div>
        </div>
    );
}