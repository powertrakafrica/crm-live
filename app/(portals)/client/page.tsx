"use client";

import { useEffect, useState } from "react";
import { Search, Briefcase, LayoutDashboard, MessageSquare, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

import { ClientDiscovery } from "./components/ClientDiscovery";
import { ClientServices } from "./components/ClientServices";
import { ClientDashboard } from "./components/ClientDashboard";
import { ClientCommunications } from "./components/ClientCommunications";

export default function ClientPortal() {
    const [activeTab, setActiveTab] = useState("discovery");
    const [user, setUser] = useState<{ fullName?: string; name?: string } | null>(null);
    const [userLoading, setUserLoading] = useState(true);

    useEffect(() => {
        api.me()
            .then((data: any) => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setUserLoading(false));
    }, []);

    const displayName = user?.fullName ?? user?.name ?? "Client";
    const initials = displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const tabs = [
        { id: "discovery", label: "Discovery", icon: Search },
        { id: "services", label: "Marketplace", icon: Briefcase },
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "communications", label: "Comms & Tools", icon: MessageSquare },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "discovery": return <ClientDiscovery />;
            case "services": return <ClientServices />;
            case "dashboard": return <ClientDashboard />;
            case "communications": return <ClientCommunications />;
            default: return <ClientDiscovery />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-5 gap-4">
                        <div>
                            <h1 className="text-xl font-heading font-bold text-slate-900">Client Portal</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {userLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                                    </span>
                                ) : (
                                    `Welcome back, ${displayName}`
                                )}
                            </p>
                        </div>
                        <div className="h-10 w-10 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-bold font-heading text-sm">
                            {initials}
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex overflow-x-auto hide-scrollbar border-t border-slate-100 pt-2 gap-2 pb-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                                    activeTab === tab.id
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "bg-transparent text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
                {renderContent()}
            </main>
        </div>
    );
}
