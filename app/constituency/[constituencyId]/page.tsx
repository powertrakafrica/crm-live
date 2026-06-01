"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal, Search, ChevronLeft, ChevronRight, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/components/PropertyCard";
import { propertiesApi } from "@/lib/api";
import { CONSTITUENCIES, getConstituencyById } from "@/lib/data";

interface ApiProperty {
    id: number;
    title: string;
    price: number;
    pricePeriod?: string | null;
    location: string;
    bedrooms: number;
    bathrooms: number;
    images?: { url: string }[];
    isVerified: boolean;
    category: string;
}

export default function ConstituencyPage({ params }: { params: Promise<{ constituencyId: string }> }) {
    const resolvedParams = use(params);
    const constituencyId = resolvedParams.constituencyId;

    const constituency = getConstituencyById(constituencyId)
        ?? CONSTITUENCIES.find((c) => c.name === decodeURIComponent(constituencyId));

    const constituencyName = constituency?.name ?? decodeURIComponent(constituencyId);
    const districts = constituency?.districts ?? ["Main District"];

    const [properties, setProperties] = useState<ApiProperty[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const itemsPerPage = 9;

    useEffect(() => {
        setLoading(true);
        setPage(1);
        const filters: Record<string, string> = {
            constituencyId,
            limit: String(itemsPerPage),
            status: "Live",
        };
        if (searchQuery) filters.search = searchQuery;
        if (selectedCategory !== "All") filters.category = selectedCategory;

        propertiesApi
            .list(filters)
            .then((res: any) => {
                setProperties(res.data ?? []);
                setTotal(res.pagination?.total ?? 0);
            })
            .catch(() => {
                setProperties([]);
                setTotal(0);
            })
            .finally(() => setLoading(false));
    }, [constituencyId, searchQuery, selectedCategory]);

    useEffect(() => {
        setLoading(true);
        const filters: Record<string, string> = {
            constituencyId,
            limit: String(itemsPerPage),
            page: String(page),
            status: "Live",
        };
        if (searchQuery) filters.search = searchQuery;
        if (selectedCategory !== "All") filters.category = selectedCategory;

        propertiesApi
            .list(filters)
            .then((res: any) => {
                setProperties(res.data ?? []);
            })
            .catch(() => setProperties([]))
            .finally(() => setLoading(false));
    }, [page]);

    const totalPages = Math.ceil(total / itemsPerPage);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {/* Header / Filter Area */}
            <div className="bg-white border-b border-slate-200 pt-8 pb-6 px-4 sm:px-6 lg:px-8 sticky top-20 z-40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 mb-4 transition-colors uppercase tracking-wide">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Regions
                        </Link>
                        <h1 className="text-3xl font-heading font-bold tracking-tight text-slate-950">
                            {constituencyName}
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">
                            Showing {total} verified listing{total !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by title or area..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 transition-all font-medium text-slate-900"
                            />
                        </div>

                        <div className="flex gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                            <Button variant="outline" className="gap-2 rounded-xl font-bold shadow-sm flex-1 sm:flex-none border-slate-300 text-slate-700">
                                <SlidersHorizontal className="h-4 w-4" />
                                Filters
                            </Button>
                            <select
                                value={selectedCategory}
                                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                                className="bg-slate-100 border border-slate-200 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-600 cursor-pointer flex-1 sm:flex-none text-slate-800"
                            >
                                <option value="All">All Types</option>
                                <option value="Rent">Rent</option>
                                <option value="Sale">For Sale</option>
                                <option value="Rent-to-Own">Rent-to-Own</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Districts Horizontal Scroll */}
                <div className="max-w-7xl mx-auto mt-6 flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                    <button className="shrink-0 px-4 py-2 rounded-xl border text-sm font-bold transition-all bg-slate-950 border-slate-950 text-white shadow-md">
                        All Districts
                    </button>
                    {districts.map((district) => (
                        <button
                            key={district}
                            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold transition-all bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        >
                            <MapPin className="h-3.5 w-3.5" />
                            {district}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className="hidden lg:block w-64 shrink-0 space-y-8 sticky top-56 self-start">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Property Type</h3>
                            <div className="space-y-3">
                                {["Houses", "Apartments", "Commercial", "Land"].map((type) => (
                                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" defaultChecked={type === "Houses" || type === "Apartments"} className="w-5 h-5 rounded-xl border-slate-300 text-brand-600 focus:ring-brand-600" />
                                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Listings Section */}
                    <div className="flex-1 flex flex-col min-h-[600px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
                                <p className="text-slate-500 font-medium">Loading properties...</p>
                            </div>
                        ) : properties.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                                    {properties.map((prop) => (
                                        <Link key={prop.id} href={`/property/${prop.id}`}>
                                            <PropertyCard
                                                id={String(prop.id)}
                                                title={prop.title}
                                                price={`GH₵ ${prop.price.toLocaleString()}`}
                                                pricePeriod={(prop.pricePeriod ?? "one-off") as "month" | "year" | "one-off"}
                                                location={prop.location}
                                                bedrooms={prop.bedrooms}
                                                bathrooms={prop.bathrooms}
                                                imageUrl={prop.images?.[0]?.url ?? "/placeholder.jpg"}
                                                isVerified={prop.isVerified}
                                                category={prop.category as "Rent" | "Sale" | "Rent-to-Own"}
                                            />
                                        </Link>
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-auto flex items-center justify-center gap-2 pt-8 border-t border-slate-200">
                                        <Button
                                            variant="outline"
                                            className="h-10 w-10 p-0 rounded-xl bg-white shadow-sm hover:shadow border-slate-200"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>

                                        <div className="flex items-center gap-1 mx-2">
                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setPage(i + 1)}
                                                    className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${page === i + 1
                                                        ? "bg-slate-950 text-white shadow-md"
                                                        : "text-slate-600 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="h-10 w-10 p-0 rounded-xl bg-white shadow-sm hover:shadow border-slate-200"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-slate-100 mb-6 border-4 border-white shadow-sm">
                                    <Search className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-slate-900">No properties found</h3>
                                <p className="text-slate-500 mt-2 max-w-sm mx-auto text-lg leading-relaxed">
                                    We couldn&apos;t find any properties matching your criteria.
                                </p>
                                <Button
                                    onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setPage(1); }}
                                    className="mt-8 px-8 h-12 shadow-sm rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white"
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
