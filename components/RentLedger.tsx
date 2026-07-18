"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

import type { RentPeriod } from "@/lib/api";

const STATUS_VARIANT: Record<RentPeriod["status"], "destructive" | "secondary" | "verified"> = {
    Due: "secondary",
    Overdue: "destructive",
    Paid: "verified",
};

const gh = (pesewas: number) => `GH₵ ${(pesewas / 100).toLocaleString()}`;

const fmtDate = (value: string): string => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export function RentLedger({ load }: { load: () => Promise<RentPeriod[]> }) {
    const [periods, setPeriods] = useState<RentPeriod[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const open = () => {
        if (periods) return;
        setLoading(true);
        load()
            .then((data) => {
                setPeriods(data);
                setError("");
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load ledger"))
            .finally(() => setLoading(false));
    };

    return (
        <div className="space-y-2">
            <button onClick={open} className="text-xs font-bold text-brand-700 hover:text-brand-800" type="button">
                {periods ? "Hide ledger" : "View ledger"}
            </button>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-charcoal-400" />}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {periods && (
                <div className="overflow-x-auto rounded-sm border border-charcoal-100">
                    <table className="w-full text-xs">
                        <thead className="text-left text-charcoal-500 border-b border-charcoal-100 bg-charcoal-50">
                            <tr>
                                <th className="px-2 py-1 font-medium">Period</th>
                                <th className="px-2 py-1 font-medium">Amount</th>
                                <th className="px-2 py-1 font-medium">Status</th>
                                <th className="px-2 py-1 font-medium">Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.map((p) => (
                                <tr key={p.id} className="border-b border-charcoal-50">
                                    <td className="px-2 py-1 text-charcoal-600">{fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}</td>
                                    <td className="px-2 py-1 text-charcoal-900 font-medium">{gh(p.amountDue)}</td>
                                    <td className="px-2 py-1"><Badge variant={STATUS_VARIANT[p.status]} className="text-[10px]">{p.status}</Badge></td>
                                    <td className="px-2 py-1 text-charcoal-600">{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}