"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import InteractiveMap from "@/components/InteractiveMap";
import { agentApi } from "@/lib/api";
import { MapPin, Receipt } from "lucide-react";

interface EarningsData {
    totalEarned: number;
    pending: number;
    commissions: unknown[];
    payouts: unknown[];
}

export function AgentOverview({ regionLabel }: { regionLabel?: string }) {
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        agentApi.earnings()
            .then((data) => setEarnings(data as EarningsData))
            .catch(() => setEarnings(null))
            .finally(() => setLoading(false));
    }, []);

    const stats = earnings ?? { totalEarned: 0, pending: 0 };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-heading font-bold text-charcoal-950">Territory Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-none border-charcoal-200">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                        <div className="text-4xl font-black text-brand-600 mb-2">
                            {loading ? "..." : `GH₵ ${(stats.totalEarned / 100).toLocaleString()}`}
                        </div>
                        <div className="text-sm font-bold text-charcoal-500 uppercase tracking-wider">Total Earned</div>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-charcoal-200">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                        <div className="text-4xl font-black text-accent-600 mb-2">
                            {loading ? "..." : `GH₵ ${(stats.pending / 100).toLocaleString()}`}
                        </div>
                        <div className="text-sm font-bold text-charcoal-500 uppercase tracking-wider">Pending Commissions</div>
                    </CardContent>
                </Card>
            </div>

            {/* Coverage Map */}
            <div className="bg-white rounded-sm border border-charcoal-200 shadow-sm overflow-hidden p-4">
                <div className="mb-4 flex items-center justify-between px-2">
                    <div>
                        <h3 className="font-heading font-bold text-lg text-charcoal-950">Territory Coverage</h3>
                        <p className="text-sm text-charcoal-500">Agent coverage map.</p>
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
