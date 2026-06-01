"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPinned, Loader2 } from "lucide-react";
import InteractiveMap from "@/components/InteractiveMap";
import { Card } from "@/components/ui/Card";
import { propertiesApi } from "@/lib/api";
import { REGIONS, getRegionById, getConstituenciesByRegion } from "@/lib/data";

export default function RegionPage({ params }: { params: Promise<{ regionId: string }> }) {
    const resolvedParams = use(params);
    const regionId = resolvedParams.regionId;

    const region = getRegionById(regionId) ?? REGIONS.find((r) => r.name === decodeURIComponent(regionId));
    const regionName = region?.name ?? decodeURIComponent(regionId);
    const constituencies = getConstituenciesByRegion(regionId);

    const [totalListings, setTotalListings] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        propertiesApi
            .list({ regionId, status: "Live", limit: "1" })
            .then((res: any) => {
                setTotalListings(res.pagination?.total ?? 0);
            })
            .catch(() => setTotalListings(0))
            .finally(() => setLoading(false));
    }, [regionId]);

    // Fallback generic constituencies if we don't have specific data
    const displayConstituencies = constituencies.length > 0
        ? constituencies
        : [
            { id: `${regionId}-c1`, name: "Capital Constituency", listingCount: 0, regionId, districts: [] },
            { id: `${regionId}-c2`, name: "North Constituency", listingCount: 0, regionId, districts: [] },
            { id: `${regionId}-c3`, name: "South Constituency", listingCount: 0, regionId, districts: [] },
        ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">

            {/* Header Area */}
            <div className="bg-white border-b border-slate-200 pt-8 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 mb-6 transition-colors uppercase tracking-wide">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Ghana Map
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-slate-950 mb-2">
                                Properties in <span className="text-brand-600">{regionName}</span>
                            </h1>
                            <p className="text-lg text-slate-600 font-medium max-w-2xl">
                                Select a constituency below to view verified homes and land available.
                            </p>
                            {region && (
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    Capital: <span className="text-slate-800">{region.capitalCity}</span>
                                    {" · "}
                                    <span className="text-slate-800">{region.constituencyCount}</span> constituencies
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2.5 rounded-xl font-bold border border-brand-200 text-sm uppercase tracking-wide">
                            <MapPinned className="h-5 w-5" />
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                                </span>
                            ) : (
                                <span>{totalListings.toLocaleString()} Active Listings</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-280px)] min-h-[600px]">

                    {/* Left Column: Local Map */}
                    <div className="lg:col-span-2 bg-white rounded-xl p-2 sm:p-4 shadow-sm border border-slate-200 flex flex-col h-full">
                        <InteractiveMap height="flex-1 min-h-[400px]" />
                    </div>

                    {/* Right Column: Constituency List */}
                    <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2 pb-8">
                        <h2 className="text-xl font-heading font-bold text-slate-900 sticky top-0 bg-slate-50 pb-2 z-10 uppercase tracking-wide">
                            Constituencies
                        </h2>

                        <div className="space-y-3">
                            {displayConstituencies.map((c) => (
                                <Link key={c.id} href={`/constituency/${c.id}`} className="block group">
                                    <Card className="p-5 border-slate-200 hover:border-brand-400 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-heading font-bold text-lg text-slate-900 group-hover:text-brand-600 transition-colors">
                                                {c.name}
                                            </h3>
                                            <span className="bg-brand-50 text-brand-700 font-bold px-2.5 py-0.5 rounded-xl text-xs border border-brand-200 uppercase tracking-wide">
                                                {c.listingCount} listings
                                            </span>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
