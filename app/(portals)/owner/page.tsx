"use client";

import { useState } from "react";
import { LayoutDashboard, ListPlus, ShieldCheck, Wallet, UserCircle } from "lucide-react";
import { OwnerDashboard } from "./components/OwnerDashboard";
import { OwnerListings } from "./components/OwnerListings";
import { OwnerVerification } from "./components/OwnerVerification";
import { OwnerProfile } from "./components/OwnerProfile";
import { OwnerFinance } from "./components/OwnerFinance";

export default function OwnerPortal() {
    const [activeTab, setActiveTab] = useState("dashboard");

    const tabs = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "listings", label: "My Listings", icon: ListPlus },
        { id: "verification", label: "Trust Engine", icon: ShieldCheck },
        { id: "finance", label: "Financials", icon: Wallet },
        { id: "profile", label: "Identity Vault", icon: UserCircle },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "dashboard": return <OwnerDashboard />;
            case "listings": return <OwnerListings />;
            case "verification": return <OwnerVerification />;
            case "finance": return <OwnerFinance />;
            case "profile": return <OwnerProfile />;
            default: return <OwnerDashboard />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 pt-6 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-slate-900">Property Owner Portal</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage your properties, clients, and trust verifications.</p>
                </div>

                {/* Navigation */}
                <div className="mb-8 overflow-x-auto pb-2">
                    <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 min-w-max gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? "bg-brand-50 text-brand-700 border border-brand-200"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="animate-fade-in">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
