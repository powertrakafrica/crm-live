"use client";

import { useState, useEffect } from "react";
import { CreditCard, Rocket, Download, ArrowUpRight, CheckCircle2, Building, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ownerApi, paymentApi } from "@/lib/api";

interface PaymentItem {
    id: number;
    amount: number;
    purpose: string;
    providerReference: string | null;
    createdAt: string;
    paidAt: string | null;
    propertyId: number | null;
}

export function OwnerFinance() {
    const [transactions, setTransactions] = useState<PaymentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [ownerProperties, setOwnerProperties] = useState<{ id: number; title: string }[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [boostLoading, setBoostLoading] = useState(false);
    const [boostMessage, setBoostMessage] = useState("");

    useEffect(() => {
        ownerApi.payments()
            .then((data: any) => setTransactions(data ?? []))
            .catch((err: any) => setError(err.message || "Failed to load payments"))
            .finally(() => setLoading(false));

        ownerApi.properties()
            .then((data: any) => {
                const props = (data ?? []).map((p: any) => ({ id: p.id, title: p.title }));
                setOwnerProperties(props);
                if (props.length > 0) setSelectedPropertyId(String(props[0].id));
            })
            .catch(() => setOwnerProperties([]));
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950">Financials & Boosts</h2>
                    <p className="text-charcoal-500 font-medium">Manage verification payments and propel your listings to the top.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Listing Boosts */}
                <div className="space-y-6">
                    <Card className="border-charcoal-200 shadow-sm rounded-sm bg-gradient-to-br from-brand-600 to-brand-800 text-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
                        <CardContent className="p-8 relative z-10">
                            <Rocket className="h-10 w-10 text-brand-200 mb-4" />
                            <h3 className="font-heading font-bold text-2xl mb-2">Turbocharge Your Listing</h3>
                            <p className="text-brand-100 font-medium mb-6 leading-relaxed">
                                Stand out in competitive markets like East Legon or Cantonments. A Premium Boost pins your property to the top of search results for 7 days, guaranteeing 5x more visibility.
                            </p>

                            <div className="bg-white/10 rounded-sm p-4 mb-6 backdrop-blur-sm border border-white/20">
                                <h4 className="font-bold text-white text-sm mb-3">Select Property to Boost:</h4>
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                    className="w-full bg-white text-charcoal-900 border-none font-medium rounded-sm px-3 py-2 outline-none shadow-sm cursor-pointer mb-3"
                                >
                                    {ownerProperties.length === 0 ? (
                                        <option disabled>No listings available</option>
                                    ) : (
                                        ownerProperties.map((p) => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))
                                    )}
                                </select>
                                {boostMessage && (
                                    <p className="text-xs font-bold text-brand-100 mb-2">{boostMessage}</p>
                                )}
                                <div className="flex justify-between items-center text-sm font-bold mt-2 pt-2 border-t border-white/20">
                                    <span className="text-brand-100">7-Day Local Area Boost</span>
                                    <span className="text-white bg-brand-900/50 px-2 py-1 rounded-sm">GH₵ 200</span>
                                </div>
                            </div>

                            <Button
                                disabled={boostLoading || ownerProperties.length === 0}
                                onClick={async () => {
                                    if (!selectedPropertyId) return;
                                    setBoostLoading(true);
                                    setBoostMessage("");
                                    try {
                                        await paymentApi.initiate({
                                            amount: 20000,
                                            currency: "GHS",
                                            purpose: "ListingBoost",
                                            propertyId: Number(selectedPropertyId),
                                            provider: "Hubtel",
                                            paymentMethod: "MTN_MoMo",
                                        });
                                        setBoostMessage("Boost payment initiated. Check your phone to approve.");
                                    } catch (err: any) {
                                        setBoostMessage(err.message || "Boost payment failed.");
                                    } finally {
                                        setBoostLoading(false);
                                    }
                                }}
                                className="w-full h-12 bg-white hover:bg-brand-50 text-brand-700 font-bold uppercase tracking-widest transition-colors shadow-lg"
                            >
                                {boostLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                                    </span>
                                ) : (
                                    <>
                                        Buy Boost Now <ArrowRight className="h-4 w-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="border-charcoal-200 shadow-sm rounded-sm">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                <div className="h-12 w-12 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 mb-3">
                                    <Building className="h-6 w-6" />
                                </div>
                                <h4 className="font-bold text-charcoal-900 mb-1">Portfolio Value</h4>
                                <p className="text-sm font-medium text-charcoal-500 leading-snug">Track aggregated market value of all active properties.</p>
                                <Badge variant="secondary" className="mt-3 shadow-none bg-charcoal-100 text-charcoal-600">Coming Soon</Badge>
                            </CardContent>
                        </Card>
                        <Card className="border-charcoal-200 shadow-sm rounded-sm">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                                <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <h4 className="font-bold text-charcoal-900 mb-1">Escrow Payouts</h4>
                                <p className="text-sm font-medium text-charcoal-500 leading-snug">Viewing fees collected automatically route here.</p>
                                <Badge variant="secondary" className="mt-3 shadow-none bg-charcoal-100 text-charcoal-600">Coming Soon</Badge>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Payment History */}
                <Card className="border-charcoal-200 shadow-sm rounded-sm h-full flex flex-col max-h-[70vh]">
                    <CardHeader className="pb-3 border-b border-charcoal-100 bg-charcoal-50">
                        <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-brand-600" />
                            Payment History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-12 text-center text-charcoal-500 font-medium">Loading payments...</div>
                        ) : error ? (
                            <div className="p-4 text-sm font-medium text-red-700">{error}</div>
                        ) : transactions.length === 0 ? (
                            <div className="p-12 text-center text-charcoal-500 font-medium">No payments found.</div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-charcoal-500 uppercase tracking-widest bg-white sticky top-0 border-b border-charcoal-100 z-10">
                                    <tr>
                                        <th className="px-6 py-3 font-bold">Transaction Detail</th>
                                        <th className="px-6 py-3 font-bold text-right">Amount</th>
                                        <th className="px-6 py-3 font-bold text-center">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-charcoal-50">
                                    {transactions.map((txn) => (
                                        <tr key={txn.id} className="hover:bg-charcoal-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-charcoal-900 mb-0.5">{txn.purpose}</div>
                                                <div className="text-xs text-charcoal-600 mb-1">{txn.propertyId ? `Property #${txn.propertyId}` : "Platform Payment"}</div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">
                                                    <span>{txn.createdAt ? new Date(txn.createdAt).toLocaleDateString() : "N/A"}</span>
                                                    <span>•</span>
                                                    <span className="font-mono">TXN-{txn.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-brand-700">GH₵ {(txn.amount / 100).toLocaleString()}</span>
                                                <div className="mt-1 flex justify-end">
                                                    <Badge variant="verified" className="shadow-none px-1.5 py-0 h-4 text-[9px]"><CheckCircle2 className="h-2 w-2 mr-1" /> Paid</Badge>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50" onClick={() => alert("Downloading PDF receipt...")}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
