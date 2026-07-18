"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RentLedger } from "@/components/RentLedger";
import { clientApi, paymentApi } from "@/lib/api";

interface Tenancy {
    amountOwing: number;
    createdAt: string;
    depositAmount: number;
    depositMonths: number;
    depositPaidAt: string | null;
    id: number;
    lastRentPaidAt: string | null;
    leaseEnd: string;
    leaseSignedAt: string | null;
    leaseStart: string;
    monthlyRent: number;
    nextRentDueAt: string | null;
    periodsOwing: number;
    propertyId: number;
    status: "Active" | "Completed" | "Pending" | "Terminated";
    tenantId: number;
}

const STATUS_BADGE_VARIANT: Record<Tenancy["status"], "default" | "destructive" | "secondary" | "verified"> = {
    Active: "verified",
    Completed: "default",
    Pending: "secondary",
    Terminated: "destructive",
};

const gh = (pesewas: number) => `GH₵ ${(pesewas / 100).toLocaleString()}`;

const fmtDate = (value: string | null): string => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export function ClientTenancies() {
    const [tenancies, setTenancies] = useState<Tenancy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);

    const refresh = () => {
        clientApi.tenancies.list()
            .then((data) => {
                setTenancies((data as Tenancy[]).sort((a, b) => b.id - a.id));
                setError("");
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load tenancies"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { refresh(); }, []);

    const pay = async (tenancyId: number, purpose: "RentalDeposit" | "RentPayment") => {
        setError("");
        setBusyId(tenancyId);
        try {
            const result = await paymentApi.initiate({ purpose, provider: "Paystack", tenancyId });
            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
            }
            refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Payment failed");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="pb-3 border-b border-charcoal-100 bg-charcoal-50">
                <CardTitle className="text-base font-bold text-charcoal-900">Tenancies</CardTitle>
                <p className="text-xs text-charcoal-500 mt-1">Your rental tenancies. Pay your deposit (held in escrow) and monthly rent here.</p>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
                {error && <p className="text-sm text-red-600">{error}</p>}

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-charcoal-400" />
                    </div>
                ) : tenancies.length === 0 ? (
                    <p className="text-sm text-charcoal-500 py-10 text-center">No tenancies yet.</p>
                ) : (
                    <div className="space-y-4">
                        {tenancies.map((t) => (
                            <div key={t.id} className="rounded-sm border border-charcoal-200 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-charcoal-900">Tenancy #{t.id}</span>
                                            <Badge variant={STATUS_BADGE_VARIANT[t.status]} className="text-[10px]">{t.status}</Badge>
                                        </div>
                                        <p className="text-xs text-charcoal-500 mt-0.5">Property #{t.propertyId}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-charcoal-400 font-medium">Monthly rent</p>
                                        <p className="text-charcoal-900 font-bold">{gh(t.monthlyRent)}</p>
                                    </div>
                                    <div>
                                        <p className="text-charcoal-400 font-medium">Deposit</p>
                                        <p className="text-charcoal-900 font-bold">{gh(t.depositAmount)} ({t.depositMonths}m)</p>
                                    </div>
                                    <div>
                                        <p className="text-charcoal-400 font-medium">Deposit paid</p>
                                        <p className="text-charcoal-900 font-bold">{t.depositPaidAt ? "Yes" : "No"}</p>
                                    </div>
                                    <div>
                                        <p className="text-charcoal-400 font-medium">Lease start</p>
                                        <p className="text-charcoal-900 font-bold">{fmtDate(t.leaseStart)}</p>
                                    </div>
                                    <div>
                                        <p className="text-charcoal-400 font-medium">Lease end</p>
                                        <p className="text-charcoal-900 font-bold">{fmtDate(t.leaseEnd)}</p>
                                    </div>
                                    <div>
                                        <p className="text-charcoal-400 font-medium">Last rent paid</p>
                                        <p className="text-charcoal-900 font-bold">{fmtDate(t.lastRentPaidAt)}</p>
                                    </div>
                                </div>

                                {(t.nextRentDueAt || t.periodsOwing > 0) && (
                                    <div className="text-xs space-y-1">
                                        {t.periodsOwing > 0 ? (
                                            <p className="text-red-600 font-bold">
                                                Overdue by {t.periodsOwing} month(s) — {gh(t.amountOwing)}
                                            </p>
                                        ) : (
                                            <p className="text-charcoal-600">
                                                Next rent due: {fmtDate(t.nextRentDueAt)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <RentLedger load={() => clientApi.tenancies.rentPeriods(t.id)} />

                                <div className="flex flex-wrap gap-2 pt-1">
                                    {!t.depositPaidAt && (
                                        <Button
                                            onClick={() => pay(t.id, "RentalDeposit")}
                                            disabled={busyId === t.id}
                                            size="sm"
                                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
                                        >
                                            {busyId === t.id ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Paying…
                                                </span>
                                            ) : (
                                                "Pay Deposit"
                                            )}
                                        </Button>
                                    )}
                                    {t.status === "Active" && (
                                        <Button
                                            onClick={() => pay(t.id, "RentPayment")}
                                            disabled={busyId === t.id}
                                            size="sm"
                                            variant="outline"
                                            className="font-bold"
                                        >
                                            {busyId === t.id ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Paying…
                                                </span>
                                            ) : (
                                                "Pay Monthly Rent"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}