"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Users, CalendarDays, ExternalLink, ShieldCheck, Activity, Phone, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { availabilityApi, bookingApi, ownerApi } from "@/lib/api";

interface Analytics {
    totalListings: number;
    verifiedListings: number;
    pendingVerification: number;
    totalViews: number;
    totalEnquiries: number;
    bookingRequests: number;
}

interface AvailabilityConfig {
    dayEndMinutes: number;
    dayStartMinutes: number;
    horizonDays: number;
    leadHours: number;
    slotMinutes: number;
    workingDays: number[];
}

interface Blackout {
    endAt: string;
    id: number;
    reason: string | null;
    startAt: string;
}

interface UpcomingBooking {
    id: number;
    scheduledDate: string;
    scheduledTime: string | null;
    status: string;
}

export function OwnerDashboard() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [ownerProperties, setOwnerProperties] = useState<{ id: number; title: string }[]>([]);
    const [availPropertyId, setAvailPropertyId] = useState<number | null>(null);
    const [config, setConfig] = useState<AvailabilityConfig | null>(null);
    const [blackouts, setBlackouts] = useState<Blackout[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingBooking[]>([]);
    const [availLoading, setAvailLoading] = useState(false);
    const [availSaving, setAvailSaving] = useState(false);
    const [newBlackout, setNewBlackout] = useState({ endAt: "", reason: "", startAt: "" });

    useEffect(() => {
        ownerApi.analytics()
            .then((data) => setAnalytics(data as Analytics))
            .catch(() => setAnalytics(null))
            .finally(() => setLoading(false));
        // Load the owner's OWN properties (owner-scoped /owner/properties) for the
        // availability editor selector. Editing another owner's property 403s, so
        // do NOT use the public propertiesApi.list() here.
        ownerApi.properties()
            .then((data) => {
                const owned = (data as { id: number; title: string }[]).map((p) => ({ id: p.id, title: p.title }));
                setOwnerProperties(owned);
                if (owned.length) setAvailPropertyId(owned[0].id);
            })
            .catch(() => setOwnerProperties([]));
    }, []);

    useEffect(() => {
        if (!availPropertyId) return;
        setAvailLoading(true);
        Promise.all([
            availabilityApi.get(availPropertyId),
            bookingApi.forProperty(availPropertyId),
        ]).then(([avail, books]) => {
            const a = avail as { config: AvailabilityConfig; blackouts: Blackout[] };
            setConfig(a.config);
            setBlackouts(a.blackouts);
            setUpcoming((books as UpcomingBooking[]).slice(0, 5));
        }).catch(() => { setConfig(null); setBlackouts([]); setUpcoming([]); })
            .finally(() => setAvailLoading(false));
    }, [availPropertyId]);

    const handleSaveConfig = async () => {
        if (!availPropertyId || !config) return;
        setAvailSaving(true);
        try {
            await availabilityApi.put(availPropertyId, {
                dayEndMinutes: config.dayEndMinutes,
                dayStartMinutes: config.dayStartMinutes,
                horizonDays: config.horizonDays,
                leadHours: config.leadHours,
                slotMinutes: config.slotMinutes,
                workingDays: config.workingDays,
            });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Save failed");
        } finally {
            setAvailSaving(false);
        }
    };

    const handleAddBlackout = async () => {
        if (!availPropertyId || !newBlackout.startAt || !newBlackout.endAt) return;
        try {
            const row = await availabilityApi.addBlackout(availPropertyId, newBlackout) as { id: number };
            setBlackouts((b) => [...b, { ...newBlackout, id: row.id, reason: newBlackout.reason || null }]);
            setNewBlackout({ endAt: "", reason: "", startAt: "" });
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to add blackout");
        }
    };

    const handleRemoveBlackout = async (blackoutId: number) => {
        if (!availPropertyId) return;
        try {
            await availabilityApi.removeBlackout(availPropertyId, blackoutId);
            setBlackouts((b) => b.filter((x) => x.id !== blackoutId));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to remove blackout");
        }
    };

    const stats = analytics ?? {
        totalListings: 0,
        verifiedListings: 0,
        pendingVerification: 0,
        totalViews: 0,
        totalEnquiries: 0,
        bookingRequests: 0,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950">Management Suite</h2>
                    <p className="text-charcoal-500 font-medium">Track performance, manage leads, and schedule viewings.</p>
                    <Link href="/agent-application" className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 mt-2">
                        <ShieldCheck className="h-4 w-4" /> Become an Agent
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: "Listings", value: stats.totalListings },
                    { label: "Verified", value: stats.verifiedListings },
                    { label: "Pending VRF", value: stats.pendingVerification },
                    { label: "Views", value: stats.totalViews },
                    { label: "Enquiries", value: stats.totalEnquiries },
                    { label: "Bookings", value: stats.bookingRequests },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-sm border border-charcoal-200 p-4 shadow-sm">
                        <div className="text-2xl font-heading font-bold text-charcoal-900">{s.value}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Analytics & Calendar */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-charcoal-200 shadow-sm rounded-sm">
                        <CardHeader className="pb-2 border-b border-charcoal-100 bg-charcoal-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-brand-600" />
                                Listing Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {loading ? (
                                <p className="text-charcoal-500 font-medium">Loading analytics...</p>
                            ) : analytics ? (
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">Total Views</p>
                                        <div className="text-3xl font-heading font-bold text-charcoal-900">{stats.totalViews.toLocaleString()}</div>
                                        <p className="text-xs text-green-600 font-bold mt-1 flex items-center"><Activity className="h-3 w-3 mr-1"/> All time</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1">Enquiries</p>
                                        <div className="text-3xl font-heading font-bold text-brand-600">{stats.totalEnquiries}</div>
                                        <p className="text-xs text-green-600 font-bold mt-1 flex items-center"><Activity className="h-3 w-3 mr-1"/> All time</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-charcoal-500 font-medium">No analytics data available yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-charcoal-200 shadow-sm rounded-sm">
                        <CardHeader className="pb-2 border-b border-charcoal-100 bg-charcoal-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-brand-600" />
                                Viewing Availability
                            </CardTitle>
                            {ownerProperties.length > 1 && (
                                <select
                                    value={availPropertyId ?? ""}
                                    onChange={(e) => setAvailPropertyId(Number(e.target.value))}
                                    className="text-xs border border-charcoal-200 rounded-sm px-2 h-8"
                                >
                                    {ownerProperties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            )}
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 space-y-6">
                            {!availLoading && ownerProperties.length === 0 ? (
                                <p className="text-sm text-charcoal-400 py-8 text-center">No listings yet — add a property to manage availability.</p>
                            ) : availLoading || !config ? (
                                <div className="flex items-center justify-center py-8 text-charcoal-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                            ) : (
                                <>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <label className="text-sm text-charcoal-600">Slot length (min)
                                            <input type="number" value={config.slotMinutes} onChange={(e) => setConfig({ ...config, slotMinutes: Number(e.target.value) })} className="w-full mt-1 border border-charcoal-200 rounded-sm px-2 h-9" />
                                        </label>
                                        <label className="text-sm text-charcoal-600">Lead time (hours)
                                            <input type="number" value={config.leadHours} onChange={(e) => setConfig({ ...config, leadHours: Number(e.target.value) })} className="w-full mt-1 border border-charcoal-200 rounded-sm px-2 h-9" />
                                        </label>
                                        <label className="text-sm text-charcoal-600">Horizon (days)
                                            <input type="number" value={config.horizonDays} onChange={(e) => setConfig({ ...config, horizonDays: Number(e.target.value) })} className="w-full mt-1 border border-charcoal-200 rounded-sm px-2 h-9" />
                                        </label>
                                        <label className="text-sm text-charcoal-600">Day start (e.g. 09:00)
                                            <input type="text" value={`${String(Math.floor(config.dayStartMinutes / 60)).padStart(2, "0")}:${String(config.dayStartMinutes % 60).padStart(2, "0")}`} onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); setConfig({ ...config, dayStartMinutes: (h || 0) * 60 + (m || 0) }); }} className="w-full mt-1 border border-charcoal-200 rounded-sm px-2 h-9" />
                                        </label>
                                        <label className="text-sm text-charcoal-600">Day end (e.g. 17:00)
                                            <input type="text" value={`${String(Math.floor(config.dayEndMinutes / 60)).padStart(2, "0")}:${String(config.dayEndMinutes % 60).padStart(2, "0")}`} onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); setConfig({ ...config, dayEndMinutes: (h || 0) * 60 + (m || 0) }); }} className="w-full mt-1 border border-charcoal-200 rounded-sm px-2 h-9" />
                                        </label>
                                        <div className="text-sm text-charcoal-600">Working days
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, idx) => (
                                                    <button key={d} type="button" onClick={() => setConfig((c) => c ? { ...c, workingDays: c.workingDays.includes(idx) ? c.workingDays.filter((x) => x !== idx) : [...c.workingDays, idx].sort() } : c)}
                                                        className={`px-3 h-9 rounded-sm border text-xs font-bold ${config.workingDays.includes(idx) ? "bg-brand-600 text-white border-brand-600" : "border-charcoal-200 text-charcoal-600"}`}>{d}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <Button onClick={handleSaveConfig} disabled={availSaving} className="h-9 bg-brand-600 hover:bg-brand-700 text-white font-bold">{availSaving ? "Saving…" : "Save availability"}</Button>

                                    <div>
                                        <h4 className="font-bold text-charcoal-900 mb-2">Blackouts</h4>
                                        <div className="space-y-2">
                                            {blackouts.map((b) => (
                                                <div key={b.id} className="flex items-center justify-between border border-charcoal-200 rounded-sm px-3 py-2 text-sm">
                                                    <span className="text-charcoal-700">{new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}{b.reason ? ` · ${b.reason}` : ""}</span>
                                                    <button onClick={() => handleRemoveBlackout(b.id)} className="text-charcoal-400 hover:text-red-600 text-xs font-bold">Remove</button>
                                                </div>
                                            ))}
                                            <div className="flex flex-wrap gap-2 items-end">
                                                <input type="datetime-local" value={newBlackout.startAt} onChange={(e) => setNewBlackout((n) => ({ ...n, startAt: e.target.value }))} className="border border-charcoal-200 rounded-sm px-2 h-9 text-sm" />
                                                <input type="datetime-local" value={newBlackout.endAt} onChange={(e) => setNewBlackout((n) => ({ ...n, endAt: e.target.value }))} className="border border-charcoal-200 rounded-sm px-2 h-9 text-sm" />
                                                <input type="text" placeholder="Reason" value={newBlackout.reason} onChange={(e) => setNewBlackout((n) => ({ ...n, reason: e.target.value }))} className="border border-charcoal-200 rounded-sm px-2 h-9 text-sm flex-1" />
                                                <Button onClick={handleAddBlackout} variant="outline" className="h-9">Add</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-charcoal-900 mb-2">Upcoming viewings</h4>
                                        <div className="divide-y divide-charcoal-100">
                                            {upcoming.length === 0 && <p className="text-sm text-charcoal-400 py-2">No upcoming viewings.</p>}
                                            {upcoming.map((b) => (
                                                <div key={b.id} className="py-2 flex justify-between text-sm">
                                                    <span className="text-charcoal-700">{new Date(b.scheduledDate).toLocaleString()}</span>
                                                    <Badge>{b.status}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Column 2: Lead Manager */}
                <div className="lg:col-span-1">
                    <Card className="border-charcoal-200 shadow-sm rounded-sm h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-charcoal-100 bg-charcoal-50">
                            <CardTitle className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-brand-600" />
                                Lead Manager
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 flex-1">
                            <p className="text-sm text-charcoal-500 font-medium">Lead data will be integrated in Phase 3.</p>
                        </CardContent>
                        <div className="p-4 border-t border-charcoal-100 bg-charcoal-50 text-center">
                            <Button variant="ghost" className="text-sm font-bold text-brand-600 hover:text-brand-700 w-full">View All Leads <ExternalLink className="h-4 w-4 ml-1" /></Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
