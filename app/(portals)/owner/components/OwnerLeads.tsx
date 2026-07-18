"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ownerApi } from "@/lib/api";

interface LeadItem {
    assignedAgentName: string | null;
    budgetMax: number | null;
    budgetMin: number | null;
    closedAt: string | null;
    closedValue: number | null;
    contactName: string | null;
    createdAt: string;
    description: string | null;
    id: number;
    priority: string;
    propertyId: number;
    propertyTitle: string;
    source: string | null;
    status: string;
    title: string;
}

const PAGE_SIZE = 10;
const STATUSES = ["ClosedLost", "ClosedWon", "Negotiating", "New", "OfferMade", "Qualified", "ViewingScheduled"] as const;
const STATUS_BADGE_VARIANT: Record<string, "destructive" | "secondary" | "verified"> = {
    ClosedLost: "destructive",
    ClosedWon: "verified",
    Negotiating: "secondary",
    New: "secondary",
    OfferMade: "secondary",
    Qualified: "secondary",
    ViewingScheduled: "secondary",
};

function formatBudget(min: number | null, max: number | null): string {
    if (min == null && max == null) return "—";
    if (min != null && max != null) return `GHS ${min.toLocaleString()} – ${max.toLocaleString()}`;
    return `GHS ${(min ?? max ?? 0).toLocaleString()}`;
}

export function OwnerLeads() {
    const [leads, setLeads] = useState<LeadItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [committedSearch, setCommittedSearch] = useState("");
    const [propertyId, setPropertyId] = useState<number | "">("");
    const [ownerProperties, setOwnerProperties] = useState<{ id: number; title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        ownerApi.properties()
            .then((data) => setOwnerProperties(data as { id: number; title: string }[]))
            .catch(() => setOwnerProperties([]));
    }, []);

    useEffect(() => {
        const params: { limit: number; page: number; propertyId?: number; search?: string; status?: string } = {
            limit: PAGE_SIZE,
            page,
        };
        if (status) params.status = status;
        if (committedSearch) params.search = committedSearch;
        if (propertyId !== "") params.propertyId = Number(propertyId);
        ownerApi.leads.list(params)
            .then((res) => {
                setLeads(res.data as LeadItem[]);
                setTotal(res.total);
                setError("");
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load leads"))
            .finally(() => setLoading(false));
    }, [committedSearch, page, propertyId, status]);

    const applyFilters = (next: { page?: number; propertyId?: number | ""; status?: string }) => {
        setLoading(true);
        if (next.page !== undefined) setPage(next.page);
        if (next.status !== undefined) setStatus(next.status);
        if (next.propertyId !== undefined) setPropertyId(next.propertyId);
    };

    const commitSearch = () => {
        setLoading(true);
        setCommittedSearch(searchInput.trim());
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <Card className="border-charcoal-200 shadow-sm rounded-sm">
            <CardHeader className="pb-3 border-b border-charcoal-100 bg-charcoal-50">
                <CardTitle className="text-base font-bold text-charcoal-900">Leads on your properties</CardTitle>
                <p className="text-xs text-charcoal-500 mt-1">Read-only pipeline of agent-managed leads. Contact your assigned agent to act on a lead.</p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2 items-end">
                    <div>
                        <label className="block text-xs font-medium text-charcoal-600 mb-1">Status</label>
                        <select
                            className="border border-charcoal-200 rounded-sm px-2 py-1.5 text-sm bg-white"
                            value={status}
                            onChange={(e) => applyFilters({ page: 1, status: e.target.value })}
                        >
                            <option value="">All</option>
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-charcoal-600 mb-1">Property</label>
                        <select
                            className="border border-charcoal-200 rounded-sm px-2 py-1.5 text-sm bg-white"
                            value={propertyId}
                            onChange={(e) => applyFilters({ page: 1, propertyId: e.target.value === "" ? "" : Number(e.target.value) })}
                        >
                            <option value="">All</option>
                            {ownerProperties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-xs font-medium text-charcoal-600 mb-1">Search title</label>
                        <div className="flex gap-1">
                            <input className="border border-charcoal-200 rounded-sm px-2 py-1.5 text-sm bg-white flex-1" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitSearch(); }} placeholder="Lead title…" />
                            <Button variant="outline" size="sm" onClick={commitSearch}><Search className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                {loading ? (
                    <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-charcoal-400" /></div>
                ) : leads.length === 0 ? (
                    <p className="text-sm text-charcoal-500 py-10 text-center">No leads match your filters.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-charcoal-500 border-b border-charcoal-100">
                                <tr>
                                    <th className="px-3 py-2 font-medium">Title</th>
                                    <th className="px-3 py-2 font-medium">Property</th>
                                    <th className="px-3 py-2 font-medium">Status</th>
                                    <th className="px-3 py-2 font-medium">Priority</th>
                                    <th className="px-3 py-2 font-medium">Agent</th>
                                    <th className="px-3 py-2 font-medium">Contact</th>
                                    <th className="px-3 py-2 font-medium">Budget</th>
                                    <th className="px-3 py-2 font-medium">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="border-b border-charcoal-50">
                                        <td className="px-3 py-2 font-medium text-charcoal-900">{lead.title}</td>
                                        <td className="px-3 py-2 text-charcoal-600">{lead.propertyTitle}</td>
                                        <td className="px-3 py-2"><Badge variant={STATUS_BADGE_VARIANT[lead.status] ?? "secondary"} className="text-[10px]">{lead.status}</Badge></td>
                                        <td className="px-3 py-2 text-charcoal-600">{lead.priority}</td>
                                        <td className="px-3 py-2 text-charcoal-600">{lead.assignedAgentName ?? "—"}</td>
                                        <td className="px-3 py-2 text-charcoal-600">{lead.contactName ?? "—"}</td>
                                        <td className="px-3 py-2 text-charcoal-600">{formatBudget(lead.budgetMin, lead.budgetMax)}</td>
                                        <td className="px-3 py-2 text-charcoal-600">{new Date(lead.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-charcoal-500">Page {page} of {totalPages} · {total} leads</p>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => applyFilters({ page: page - 1 })}>Previous</Button>
                            <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => applyFilters({ page: page + 1 })}>Next</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}