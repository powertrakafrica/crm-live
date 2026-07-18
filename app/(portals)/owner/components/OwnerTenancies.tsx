"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ownerApi } from "@/lib/api";

interface OwnerProperty {
    id: number;
    status: string;
    title: string;
    transactionType: string;
}

interface Tenancy {
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

export function OwnerTenancies() {
    const [tenancies, setTenancies] = useState<Tenancy[]>([]);
    const [ownerProperties, setOwnerProperties] = useState<OwnerProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [propertyId, setPropertyId] = useState("");
    const [tenantId, setTenantId] = useState("");
    const [monthlyRent, setMonthlyRent] = useState("");
    const [depositMonths, setDepositMonths] = useState("1");
    const [leaseStart, setLeaseStart] = useState("");
    const [leaseEnd, setLeaseEnd] = useState("");
    const [creating, setCreating] = useState(false);

    const refresh = () => {
        ownerApi.tenancies.list()
            .then((data) => {
                setTenancies((data as Tenancy[]).sort((a, b) => b.id - a.id));
                setError("");
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load tenancies"))
            .finally(() => setLoading(false));
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { refresh(); }, []);

    useEffect(() => {
        ownerApi.properties()
            .then((data) => {
                const rental = (data as OwnerProperty[]).filter(
                    (p) => p.status === "Live" && (p.transactionType === "Rent" || p.transactionType === "Rent-to-Own"),
                );
                setOwnerProperties(rental);
            })
            .catch(() => setOwnerProperties([]));
    }, []);

    const handleCreate = async () => {
        setError("");
        const pid = Number(propertyId);
        const tid = Number(tenantId);
        const rent = Number(monthlyRent);
        const months = Number(depositMonths);
        if (!pid || !tid || !rent || !months || !leaseStart || !leaseEnd) {
            setError("All fields are required");
            return;
        }
        setCreating(true);
        try {
            await ownerApi.tenancies.create({
                depositMonths: months,
                leaseEnd,
                leaseStart,
                monthlyRent: rent,
                propertyId: pid,
                tenantId: tid,
            });
            setPropertyId("");
            setTenantId("");
            setMonthlyRent("");
            setDepositMonths("1");
            setLeaseStart("");
            setLeaseEnd("");
            setLoading(true);
            refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Create failed");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="pb-3 border-b border-charcoal-100 bg-charcoal-50">
                <CardTitle className="text-base font-bold text-charcoal-900">Tenancies</CardTitle>
                <p className="text-xs text-charcoal-500 mt-1">Rental tenancies on your Live Rent / Rent-to-Own properties. Deposit is held in escrow.</p>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="rounded-sm border border-charcoal-200 p-4 space-y-3">
                    <h3 className="font-semibold text-charcoal-900">Create Tenancy</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-charcoal-600 mb-1">Property</label>
                            <select
                                value={propertyId}
                                onChange={(e) => setPropertyId(e.target.value)}
                                className="border border-charcoal-200 rounded-sm px-3 py-2 text-sm bg-white w-full"
                            >
                                <option value="">Select a rental property…</option>
                                {ownerProperties.map((p) => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                            {ownerProperties.length === 0 && (
                                <p className="text-[10px] text-charcoal-400 mt-1">No Live Rent / Rent-to-Own listings. Mark a listing Live first.</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-charcoal-600 mb-1">Tenant ID</label>
                            <input
                                value={tenantId}
                                onChange={(e) => setTenantId(e.target.value)}
                                placeholder="User id of the tenant"
                                className="border border-charcoal-200 rounded-sm px-3 py-2 text-sm bg-white w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-charcoal-600 mb-1">Monthly rent (pesewas)</label>
                            <input
                                value={monthlyRent}
                                onChange={(e) => setMonthlyRent(e.target.value)}
                                placeholder="e.g. 500000 = GH₵ 5,000"
                                className="border border-charcoal-200 rounded-sm px-3 py-2 text-sm bg-white w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-charcoal-600 mb-1">Deposit</label>
                            <select
                                value={depositMonths}
                                onChange={(e) => setDepositMonths(e.target.value)}
                                className="border border-charcoal-200 rounded-sm px-3 py-2 text-sm bg-white w-full"
                            >
                                <option value="1">1 month deposit</option>
                                <option value="2">2 months deposit</option>
                                <option value="3">3 months deposit</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-charcoal-600 mb-1">Lease start</label>
                            <input
                                type="date"
                                value={leaseStart}
                                onChange={(e) => setLeaseStart(e.target.value)}
                                className="border border-charcoal-200 rounded-sm px-3 py-2 text-sm bg-white w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-charcoal-600 mb-1">Lease end</label>
                            <input
                                type="date"
                                value={leaseEnd}
                                onChange={(e) => setLeaseEnd(e.target.value)}
                                className="border border-charcoal-200 rounded-sm px-3 py-2 text-sm bg-white w-full"
                            />
                        </div>
                    </div>
                    <Button onClick={handleCreate} disabled={creating} size="sm">
                        {creating ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                            </span>
                        ) : (
                            "Create Tenancy"
                        )}
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-charcoal-400" />
                    </div>
                ) : tenancies.length === 0 ? (
                    <p className="text-sm text-charcoal-500 py-10 text-center">No tenancies yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-charcoal-500 border-b border-charcoal-100">
                                <tr>
                                    <th className="px-3 py-2 font-medium">ID</th>
                                    <th className="px-3 py-2 font-medium">Property</th>
                                    <th className="px-3 py-2 font-medium">Tenant</th>
                                    <th className="px-3 py-2 font-medium">Monthly rent</th>
                                    <th className="px-3 py-2 font-medium">Deposit</th>
                                    <th className="px-3 py-2 font-medium">Status</th>
                                    <th className="px-3 py-2 font-medium">Deposit paid</th>
                                    <th className="px-3 py-2 font-medium">Lease signed</th>
                                    <th className="px-3 py-2 font-medium">Last rent paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenancies.map((t) => {
                                    const property = ownerProperties.find((p) => p.id === t.propertyId);
                                    return (
                                        <tr key={t.id} className="border-b border-charcoal-50">
                                            <td className="px-3 py-2 text-charcoal-600">{t.id}</td>
                                            <td className="px-3 py-2 text-charcoal-600">{property?.title ?? `#${t.propertyId}`}</td>
                                            <td className="px-3 py-2 text-charcoal-600">#{t.tenantId}</td>
                                            <td className="px-3 py-2 text-charcoal-900 font-medium">{gh(t.monthlyRent)}</td>
                                            <td className="px-3 py-2 text-charcoal-600">{gh(t.depositAmount)} ({t.depositMonths}m)</td>
                                            <td className="px-3 py-2">
                                                <Badge variant={STATUS_BADGE_VARIANT[t.status]} className="text-[10px]">{t.status}</Badge>
                                            </td>
                                            <td className="px-3 py-2 text-charcoal-600">{t.depositPaidAt ? "Yes" : "No"}</td>
                                            <td className="px-3 py-2 text-charcoal-600">{t.leaseSignedAt ? "Yes" : "No"}</td>
                                            <td className="px-3 py-2 text-charcoal-600">{fmtDate(t.lastRentPaidAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}