"use client";

import { useEffect, useState } from "react";
import {
    Map, Ticket, ShieldCheck,
    Home, Wallet, UserCircle, Bell, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AgentOverview } from "./components/AgentOverview";
import { AgentTickets } from "./components/AgentTickets";
import { AgentVerification } from "./components/AgentVerification";
import { AgentListings } from "./components/AgentListings";
import { AgentEarnings } from "./components/AgentEarnings";
import { AgentProfile } from "./components/AgentProfile";
import { agentApi, profileApi } from "@/lib/api";

type TabId = "overview" | "tickets" | "verification" | "listings" | "earnings" | "profile";

export default function AgentPortal() {
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [agentProfile, setAgentProfile] = useState<{ coverageAreas?: string | null; fullName?: string } | null>(null);
    const [activeLeads, setActiveLeads] = useState(0);
    const [headerLoading, setHeaderLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            profileApi.agentProfile().then((data: any) => setAgentProfile(data)).catch(() => {}),
            agentApi.leads().then((data: any[]) => setActiveLeads(data?.length ?? 0)).catch(() => {}),
        ]).finally(() => setHeaderLoading(false));
    }, []);

    const initials = agentProfile?.fullName
        ? agentProfile.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
        : "AG";

    const assignedRegion = agentProfile?.coverageAreas
        ? agentProfile.coverageAreas.split(",")[0]?.trim() ?? "Ghana"
        : "Ghana";

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
                {/* Dashboard Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="h-12 w-12 bg-brand-600 text-white rounded-xl flex items-center justify-center font-heading font-bold text-lg">
                            {initials}
                        </div>
                        <div>
                            <h1 className="font-heading font-bold text-slate-900 text-lg leading-tight">Agent Workspace</h1>
                            <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">
                                {headerLoading ? (
                                    <span className="flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                                    </span>
                                ) : (
                                    `${assignedRegion} Territory`
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="relative">
                            <Bell className="h-5 w-5 text-slate-600" />
                            <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                        </Button>
                        <Badge variant="verified">{activeLeads} Active Leads</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Sidebar Navigation */}
                    <div className="xl:col-span-1">
                        <div className="sticky top-24 space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
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
                    </div>

                    {/* Main Content */}
                    <div className="xl:col-span-3 min-h-[600px] animate-fade-in">
                        {activeTab === "overview" && <AgentOverview />}
                        {activeTab === "tickets" && <AgentTickets />}
                        {activeTab === "verification" && <AgentVerification />}
                        {activeTab === "listings" && <AgentListings />}
                        {activeTab === "earnings" && <AgentEarnings />}
                        {activeTab === "profile" && <AgentProfile />}
                    </div>
                </div>
            </div>
        </div>
    );
}
