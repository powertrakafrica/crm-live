"use client";

import { useState, useEffect } from "react";
import { Search, Map as MapIcon, ShieldCheck, Home, MapPin, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/components/PropertyCard";
import { propertiesApi } from "@/lib/api";

interface Property {
    id: number;
    title: string;
    price: number;
    pricePeriod: string;
    location: string;
    bedrooms: number;
    bathrooms: number;
    images: { url: string; isPrimary: boolean }[];
    isVerified: boolean;
    category: string;
    district?: string;
}

export function ClientDiscovery() {
    const [searchMode, setSearchMode] = useState<"map" | "list">("list");
    const [verifiedOnly, setVerifiedOnly] = useState(true);
    const [activeCategory, setActiveCategory] = useState<"all" | "standard" | "land">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        propertiesApi.list()
            .then((data: any) => {
                const mapped = (data ?? []).map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    price: p.price,
                    pricePeriod: p.pricePeriod || "month",
                    location: p.location,
                    bedrooms: p.bedrooms || 0,
                    bathrooms: p.bathrooms || 0,
                    images: p.images || [],
                    isVerified: p.isVerified || false,
                    category: p.category,
                    district: p.district,
                }));
                setProperties(mapped);
            })
            .catch((err: any) => setError(err.message || "Failed to load properties"))
            .finally(() => setLoading(false));
    }, []);

    const filteredProperties = properties.filter(p => {
        if (verifiedOnly && !p.isVerified) return false;

        const isLand = p.title.toLowerCase().includes("land") || p.title.toLowerCase().includes("plot") || p.category?.toLowerCase().includes("land");

        if (activeCategory === "standard" && isLand) return false;
        if (activeCategory === "land" && !isLand) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return p.location?.toLowerCase().includes(query) || p.title?.toLowerCase().includes(query) || p.district?.toLowerCase().includes(query);
        }
        return true;
    });

    const getImageUrl = (p: Property) => {
        const primary = p.images?.find((img: any) => img.isPrimary);
        return primary?.url || p.images?.[0]?.url || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop";
    };

    const validPeriod = (p: string): "month" | "year" | "one-off" => {
        if (p === "month" || p === "year" || p === "one-off") return p;
        return "month";
    };

    const validCategory = (c: string): "Rent" | "Sale" | "Rent-to-Own" => {
        if (c === "Rent" || c === "Sale" || c === "Rent-to-Own") return c;
        return "Rent";
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <p className="text-charcoal-500 font-medium">Loading properties...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-2">
                <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Discover Properties</h2>
                <p className="text-charcoal-500 font-medium mt-1">Explore verified homes and lands across Ghana.</p>
            </div>

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-sm shadow-sm border border-charcoal-200 flex flex-col lg:flex-row gap-4 justify-between items-center sticky top-20 z-20">
                {/* Search Bar */}
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-charcoal-400" />
                    <input
                        type="text"
                        placeholder="Search 'East Legon' or 'Kumasi'..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-charcoal-50 border-none rounded-sm focus:ring-2 focus:ring-brand-600 outline-none font-medium"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto overflow-x-auto hide-scrollbar">
                    {/* Category Filters */}
                    <div className="flex bg-charcoal-50 p-1 rounded-sm border border-charcoal-200 shrink-0">
                        <button onClick={() => setActiveCategory("all")} className={`px-4 py-1.5 text-sm font-bold rounded-sm transition-colors ${activeCategory === "all" ? "bg-white text-charcoal-900 shadow-sm" : "text-charcoal-500 hover:text-charcoal-800"}`}>All</button>
                        <button onClick={() => setActiveCategory("standard")} className={`px-4 py-1.5 text-sm font-bold rounded-sm transition-colors flex items-center gap-1.5 ${activeCategory === "standard" ? "bg-white text-charcoal-900 shadow-sm" : "text-charcoal-500 hover:text-charcoal-800"}`}><Home className="h-4 w-4"/> Standard</button>
                        <button onClick={() => setActiveCategory("land")} className={`px-4 py-1.5 text-sm font-bold rounded-sm transition-colors flex items-center gap-1.5 ${activeCategory === "land" ? "bg-white text-charcoal-900 shadow-sm" : "text-charcoal-500 hover:text-charcoal-800"}`}><MapPin className="h-4 w-4"/> Land</button>
                    </div>

                    {/* Verified Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer shrink-0 bg-brand-50 border border-brand-200 px-4 py-2 rounded-sm ml-auto lg:ml-0 group transition-all hover:bg-brand-100">
                        <ShieldCheck className={`h-5 w-5 transition-colors ${verifiedOnly ? "text-brand-600" : "text-brand-300"}`} />
                        <span className={`text-sm font-bold transition-colors ${verifiedOnly ? "text-brand-900" : "text-brand-700"}`}>Verified Only</span>
                        <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ease-in-out ${verifiedOnly ? 'bg-brand-600' : 'bg-brand-200'}`}>
                            <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 ease-in-out ${verifiedOnly ? 'transform translate-x-5' : ''}`}></div>
                        </div>
                        <input type="checkbox" className="sr-only" checked={verifiedOnly} onChange={() => setVerifiedOnly(!verifiedOnly)} />
                    </label>

                    {/* View Toggle */}
                    <div className="flex bg-charcoal-50 p-1 rounded-sm border border-charcoal-200 shrink-0">
                        <button onClick={() => setSearchMode("list")} className={`p-1.5 rounded-sm transition-colors flex items-center gap-1 ${searchMode === "list" ? "bg-white text-brand-600 shadow-sm" : "text-charcoal-400 hover:text-charcoal-600"}`}><SlidersHorizontal className="h-4 w-4" /> <span className="text-xs font-bold sr-only sm:not-sr-only px-1">List</span></button>
                        <button onClick={() => setSearchMode("map")} className={`p-1.5 rounded-sm transition-colors flex items-center gap-1 ${searchMode === "map" ? "bg-white text-brand-600 shadow-sm" : "text-charcoal-400 hover:text-charcoal-600"}`}><MapIcon className="h-4 w-4" /> <span className="text-xs font-bold sr-only sm:not-sr-only px-1">Map</span></button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {searchMode === "map" ? (
                <div className="h-[650px] w-full bg-[#f8f9fa] rounded-sm border border-charcoal-200 relative flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 shadow-inner overflow-hidden">
                    {/* Simulated Map Background Details */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-100/20 to-transparent"></div>

                    {/* Decorative Map Rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-brand-200 rounded-full opacity-20 animate-pulse"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-brand-300 rounded-full opacity-30"></div>

                    <div className="relative z-10 bg-white/80 backdrop-blur-md p-8 rounded-sm shadow-xl border border-white max-w-lg mx-4">
                        <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MapIcon className="h-8 w-8 text-brand-600" />
                        </div>
                        <h3 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">Digital Feel Map Layout</h3>
                        <p className="text-charcoal-600 text-sm leading-relaxed mb-6">
                            In a production environment, this integrates `Leaflet.js` to render the interactive borders of Ghana's constituencies, pinging dynamic clusters of <strong className="text-brand-700">TEPS Verified Properties</strong>.
                        </p>

                        <div className="bg-charcoal-50 p-4 border border-charcoal-100 rounded-sm mb-6 flex justify-between items-center text-left">
                            <div>
                                <p className="text-xs font-bold text-charcoal-400 uppercase tracking-wider mb-1">Active Matching Results</p>
                                <p className="text-lg font-bold text-charcoal-900">{filteredProperties.length} Properties Found</p>
                            </div>
                            <ShieldCheck className="h-8 w-8 text-brand-300 opacity-50" />
                        </div>

                        <Button onClick={() => setSearchMode("list")} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold h-12 shadow-sm">
                            Switch to List View <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredProperties.length === 0 ? (
                        <div className="text-center py-24 bg-white border border-charcoal-200 rounded-sm shadow-sm">
                            <div className="h-16 w-16 bg-charcoal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-charcoal-400" />
                            </div>
                            <h3 className="text-xl font-heading font-bold text-charcoal-900">No properties align with these filters.</h3>
                            <p className="text-charcoal-500 mt-2 max-w-sm mx-auto">Try broadening your search term or turning off "Verified Only" to view unverified listings.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredProperties.map(property => (
                                <PropertyCard
                                    key={property.id}
                                    id={String(property.id)}
                                    title={property.title}
                                    price={`GH₵ ${property.price.toLocaleString()}`}
                                    pricePeriod={validPeriod(property.pricePeriod)}
                                    location={property.location}
                                    bedrooms={property.bedrooms}
                                    bathrooms={property.bathrooms}
                                    imageUrl={getImageUrl(property)}
                                    isVerified={property.isVerified}
                                    category={validCategory(property.category)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
