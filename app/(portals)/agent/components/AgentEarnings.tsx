"use client";

import { useState, useEffect } from "react";
import {
    Wallet, Receipt, ArrowRight,
    Star, StarHalf, TrendingUp, AlertCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { agentApi, payoutApi, profileApi, ratingApi } from "@/lib/api";

interface EarningsData {
    totalEarned: number;
    pending: number;
    commissions: any[];
    payouts: any[];
}

export function AgentEarnings() {
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payoutRequested, setPayoutRequested] = useState(false);
    const [momoNumber, setMomoNumber] = useState("");
    const [momoNetwork, setMomoNetwork] = useState("MTN");
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [ratingsData, setRatingsData] = useState<{ ratings: any[]; average: number }>({ ratings: [], average: 0 });
    const [ratingsLoading, setRatingsLoading] = useState(true);

    useEffect(() => {
        agentApi.earnings()
            .then((data) => setEarnings(data as EarningsData))
            .catch((err: any) => setError(err.message || "Failed to load earnings"))
            .finally(() => setLoading(false));

        profileApi.me()
            .then((profile: any) => {
                const id = profile?.id ?? profile?.userId;
                if (id) {
                    return ratingApi.agentRatings(id);
                }
                return { ratings: [], average: 0 };
            })
            .then((data) => setRatingsData(data as { ratings: any[]; average: number }))
            .catch(() => setRatingsData({ ratings: [], average: 0 }))
            .finally(() => setRatingsLoading(false));
    }, []);

    const handlePayout = async () => {
        if (!momoNumber.trim()) {
            alert("Please enter your MoMo number.");
            return;
        }
        const approvedIds = (stats.commissions ?? [])
            .filter((c: any) => c.status === "Approved")
            .map((c: any) => c.id);
        if (approvedIds.length === 0) {
            alert("No approved commissions available for payout.");
            return;
        }
        setPayoutLoading(true);
        try {
            await payoutApi.request({
                commissionIds: approvedIds,
                momoNumber: momoNumber.trim(),
                momoNetwork,
            });
            setPayoutRequested(true);
        } catch (err: any) {
            alert(err.message || "Payout request failed.");
        } finally {
            setPayoutLoading(false);
        }
    };

    const stats = earnings ?? { totalEarned: 0, pending: 0, commissions: [], payouts: [] };
    const commissionRate = stats.commissions.length > 0
        ? Number(stats.commissions[0]?.commissionRate || 0.03)
        : 0.03;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-heading font-bold text-charcoal-950">Earnings & Performance</h2>
            <p className="text-charcoal-500 font-medium">Track your commissions, request payouts, and view client feedback.</p>

            {loading ? (
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <p className="text-charcoal-500 font-medium">Loading earnings...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            ) : (
                <>
                    {/* Commissions Overview */}
                    <div className="bg-charcoal-950 rounded-sm p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-t-4 border-accent-500 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-charcoal-400 font-bold mb-1 flex items-center gap-2 uppercase tracking-wide text-sm">
                                <Receipt className="h-4 w-4" /> Pending Commission
                            </p>
                            <h3 className="text-4xl sm:text-5xl font-black mb-2">
                                GH₵ {(stats.pending / 100).toLocaleString()}
                                <span className="text-xl text-charcoal-500 font-medium">.00</span>
                            </h3>
                            <p className="text-sm text-charcoal-400 font-medium">
                                Total historical earnings: GH₵ {(stats.totalEarned / 100).toLocaleString()} <br/>
                                Commission tier: Premium ({(commissionRate * 100).toFixed(0)}%)
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full md:w-auto relative z-10">
                            {payoutRequested ? (
                                <div className="bg-green-600 border border-green-500 text-white p-4 rounded-sm flex items-start gap-3 w-[250px]">
                                    <svg className="h-5 w-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    <div>
                                        <h4 className="font-bold text-sm">Processing Payout</h4>
                                        <p className="text-xs text-green-100 mt-1">Funds will arrive in your registered MoMo wallet shortly.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-charcoal-900 border border-charcoal-800 p-4 rounded-sm w-[280px]">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs text-charcoal-400 font-bold uppercase">Ready to withdraw</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        <select
                                            value={momoNetwork}
                                            onChange={(e) => setMomoNetwork(e.target.value)}
                                            className="w-full bg-charcoal-800 border border-charcoal-700 text-charcoal-200 text-xs font-bold rounded-sm px-2 py-2 outline-none"
                                        >
                                            <option value="MTN">MTN MoMo</option>
                                            <option value="Vodafone">Vodafone Cash</option>
                                            <option value="Telecel">Telecel Cash</option>
                                        </select>
                                        <input
                                            type="tel"
                                            value={momoNumber}
                                            onChange={(e) => setMomoNumber(e.target.value)}
                                            placeholder="MoMo number"
                                            className="w-full bg-charcoal-800 border border-charcoal-700 text-charcoal-200 text-xs font-bold rounded-sm px-2 py-2 outline-none placeholder:text-charcoal-500"
                                        />
                                    </div>
                                    <Button
                                        onClick={handlePayout}
                                        disabled={payoutLoading}
                                        className="w-full bg-white text-charcoal-900 hover:bg-charcoal-50 h-11 font-bold shadow-sm"
                                    >
                                        {payoutLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                                            </span>
                                        ) : (
                                            <>
                                                Request MoMo Payout <ArrowRight className="h-4 w-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Decorative background element */}
                        <TrendingUp className="absolute -bottom-10 -right-10 h-64 w-64 text-white opacity-5 pointer-events-none" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                        {/* Recent Payouts */}
                        <Card className="border-charcoal-200 shadow-sm rounded-sm h-full">
                            <CardContent className="p-6">
                                <h4 className="text-base font-bold text-charcoal-900 flex items-center gap-2 mb-4">
                                    <Wallet className="h-4 w-4 text-brand-600" /> Recent Payout History
                                </h4>
                                <div className="space-y-4">
                                    {stats.payouts.length === 0 ? (
                                        <div className="text-sm text-charcoal-500 font-medium">No payouts yet.</div>
                                    ) : stats.payouts.slice(0, 5).map((p: any) => (
                                        <div key={p.id} className="flex justify-between items-center py-2 border-b border-charcoal-100 last:border-0 hover:bg-charcoal-50 transition-colors cursor-pointer px-2 rounded-sm -mx-2">
                                            <div>
                                                <p className="font-bold text-charcoal-900 text-sm">MoMo Transfer - {p.momoNetwork || "MTN"}</p>
                                                <p className="text-xs text-charcoal-500">{p.requestedAt ? new Date(p.requestedAt).toLocaleDateString() : "N/A"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600 text-sm">+ GH₵ {(p.totalAmount / 100).toLocaleString()}.00</p>
                                                <p className="text-xs text-charcoal-400 font-medium">{p.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Agent Ratings & Feedback */}
                        <Card className="border-charcoal-200 shadow-sm rounded-sm h-full flex flex-col">
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <h4 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                                        <Star className="h-4 w-4 text-yellow-500" /> Client Reputation
                                    </h4>
                                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full border border-yellow-200 font-bold text-lg">
                                        {ratingsData.average.toFixed(1)} <Star className="h-4 w-4 fill-current ml-1" />
                                    </div>
                                </div>

                                <div className="space-y-4 mb-4 flex-1">
                                    {ratingsLoading ? (
                                        <div className="text-sm text-charcoal-500 font-medium">Loading reviews...</div>
                                    ) : ratingsData.ratings.length === 0 ? (
                                        <div className="text-sm text-charcoal-500 font-medium">No reviews yet.</div>
                                    ) : (
                                        ratingsData.ratings.slice(0, 3).map((r: any, i: number) => (
                                            <div key={i} className="bg-charcoal-50 p-4 rounded-sm border border-charcoal-100 relative">
                                                <div className="flex text-yellow-400 mb-2 absolute top-4 right-4">
                                                    {Array.from({ length: 5 }).map((_, idx) => (
                                                        idx < Math.round(r.rating ?? r.score ?? 0) ? (
                                                            <Star key={idx} className="h-3 w-3 fill-current" />
                                                        ) : (
                                                            <Star key={idx} className="h-3 w-3 text-charcoal-300" />
                                                        )
                                                    ))}
                                                </div>
                                                <p className="text-sm font-bold text-charcoal-900 mb-1">{r.title ?? "Client Review"}</p>
                                                {r.comment && (
                                                    <p className="text-sm text-charcoal-600 leading-relaxed italic border-l-2 border-brand-200 pl-3">"{r.comment}"</p>
                                                )}
                                                <p className="text-xs text-charcoal-400 mt-2 font-bold uppercase tracking-wide">
                                                    &mdash; {r.clientName ?? r.reviewerName ?? "Anonymous"}
                                                    {r.propertyTitle && ` (${r.propertyTitle})`}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm flex items-start gap-3 mt-auto">
                                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-blue-800 font-medium">
                                        Maintaining a rating above 4.5 unlocks the "Premium Commission Tier" (5% instead of 3%).
                                        {ratingsData.average > 0 && ` Your current average is ${ratingsData.average.toFixed(1)}.`}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </>
            )}
        </div>
    );
}
