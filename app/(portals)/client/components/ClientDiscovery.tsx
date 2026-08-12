"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Map as MapIcon, ShieldCheck, Home, MapPin, SlidersHorizontal } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";
import InteractiveMap from "@/components/InteractiveMap";
import { propertiesApi } from "@/lib/api";
import { imageVariantUrl } from "@/lib/images";
import { SavedSearches } from "./SavedSearches";

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
    gpsLatitude?: string;
    gpsLongitude?: string;
}

const mapProperty = (p: unknown): Property => {
    const prop = p as Record<string, unknown>;
    const images = (prop.images as { isPrimary: boolean; url: string }[] | undefined) ?? [];
    return {
        bathrooms: Number(prop.bathrooms ?? 0),
        bedrooms: Number(prop.bedrooms ?? 0),
        category: String(prop.category ?? ""),
        district: prop.district as string | undefined,
        gpsLatitude: prop.gpsLatitude as string | undefined,
        gpsLongitude: prop.gpsLongitude as string | undefined,
        id: Number(prop.id),
        images,
        isVerified: Boolean(prop.isVerified ?? false),
        location: String(prop.location ?? ""),
        price: Number(prop.price ?? 0),
        pricePeriod: (prop.pricePeriod as string) || "month",
        title: String(prop.title ?? ""),
    };
};

export function ClientDiscovery() {
    const [searchMode, setSearchMode] = useState<"map" | "list">("list");
    const [verifiedOnly, setVerifiedOnly] = useState(true);
    const [activeCategory, setActiveCategory] = useState<"all" | "standard" | "land">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const currentQuery: Record<string, string> = {};
    if (searchQuery) currentQuery.search = searchQuery;
    if (activeCategory === "land") currentQuery.propertyType = "Land";
    if (verifiedOnly) currentQuery.verified = "true";

    useEffect(() => {
        propertiesApi.list()
            .then((data: unknown) => {
                setProperties(((data as { data?: unknown[] } | null)?.data ?? []).map(mapProperty));
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load properties"))
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

    const mapMarkers = useMemo(() => {
        return filteredProperties
            .map((p) => ({
                lat: Number(p.gpsLatitude ?? undefined),
                lng: Number(p.gpsLongitude ?? undefined),
                label: `${p.title} — GH₵ ${p.price.toLocaleString()}${p.pricePeriod ? ` / ${p.pricePeriod}` : ""}`,
                href: `/property/${p.id}`,
            }))
            .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    }, [filteredProperties]);

    const getImageUrl = (p: Property) => {
        const primary = p.images?.find((img: { isPrimary: boolean; url: string }) => img.isPrimary);
        return imageVariantUrl(primary, "thumb") ?? imageVariantUrl(p.images?.[0], "thumb") ?? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop";
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
                <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-charcoal-600">
                            {mapMarkers.length > 0
                                ? `${mapMarkers.length} of ${filteredProperties.length} properties shown on map`
                                : `${filteredProperties.length} properties found`}
                        </p>
                        {filteredProperties.length > mapMarkers.length && (
                            <p className="text-xs text-charcoal-400">
                                {filteredProperties.length - mapMarkers.length} listing{filteredProperties.length - mapMarkers.length === 1 ? "" : "s"} without GPS coordinates
                            </p>
                        )}
                    </div>
                    <InteractiveMap markers={mapMarkers} height="h-[650px]" />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-2">
                        <SavedSearches currentQuery={currentQuery} onApplyResults={(raw) => setProperties(raw.map(mapProperty))} />
                    </div>
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
