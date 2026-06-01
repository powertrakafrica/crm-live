"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, CalendarDays, ExternalLink, ShieldCheck, Activity, Phone, MessageSquare, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ownerApi } from "@/lib/api";

const MOCK_CALENDAR_SLOTS = [
    { day: "Today", date: "Oct 24", slots: [{ time: "10:00 AM", client: "Kwame M." }, { time: "02:00 PM", client: "Open" }] },
    { day: "Tomorrow", date: "Oct 25", slots: [{ time: "11:30 AM", client: "Open" }, { time: "04:00 PM", client: "Ama S." }] },
    { day: "Saturday", date: "Oct 26", slots: [{ time: "09:00 AM", client: "Open" }, { time: "10:00 AM", client: "Open" }, { time: "11:00 AM", client: "Open" }] },
];

interface Analytics {
    totalListings: number;
    verifiedListings: number;
    pendingVerification: number;
    totalViews: number;
    totalEnquiries: number;
    bookingRequests: number;
}

export function OwnerDashboard() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ownerApi.analytics()
            .then((data) => setAnalytics(data as Analytics))
            .catch(() => setAnalytics(null))
            .finally(() => setLoading(false));
    }, []);

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
                                Viewing Calendar
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-charcoal-200 text-charcoal-600">
                                <Plus className="h-3 w-3 mr-1" /> Add Slots
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-charcoal-100">
                                {MOCK_CALENDAR_SLOTS.map((day, i) => (
                                    <div key={i} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-8 hover:bg-charcoal-50/50 transition-colors">
                                        <div className="w-24 shrink-0">
                                            <h4 className="font-bold text-charcoal-900">{day.day}</h4>
                                            <p className="text-xs text-charcoal-500 font-medium">{day.date}</p>
                                        </div>
                                        <div className="flex gap-3 flex-wrap flex-1">
                                            {day.slots.map((slot, j) => (
                                                <div
                                                    key={j}
                                                    className={`px-3 py-2 rounded-sm border text-sm flex flex-col items-center justify-center min-w-[100px] cursor-pointer transition-colors ${
                                                        slot.client === "Open"
                                                            ? "border-dashed border-charcoal-300 bg-white hover:bg-charcoal-50 hover:border-brand-300"
                                                            : "border-brand-200 bg-brand-50 shadow-sm"
                                                    }`}
                                                >
                                                    <span className="font-bold text-charcoal-900">{slot.time}</span>
                                                    <span className={`text-xs mt-0.5 font-medium ${slot.client === "Open" ? "text-charcoal-400" : "text-brand-700"}`}>
                                                        {slot.client}
                                                    </span>
                                                </div>
                                            ))}
                                            <button className="px-3 py-2 rounded-sm border border-dashed border-charcoal-200 flex items-center justify-center text-charcoal-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
