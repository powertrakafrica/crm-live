"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ShieldCheck, MapPin, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/components/PropertyCard";
import InteractiveMap from "@/components/InteractiveMap";
import { propertiesApi } from "@/lib/api";
import { REGIONS } from "@/lib/data";

interface FeaturedProperty {
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

export default function Home() {
    const [featured, setFeatured] = useState<FeaturedProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [regionCounts, setRegionCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        propertiesApi
            .list({ limit: "6", status: "Live" })
            .then((res: any) => {
                setFeatured(res.data ?? []);
            })
            .catch(() => setFeatured([]))
            .finally(() => setLoading(false));

        Promise.all(
            REGIONS.map((r) =>
                propertiesApi
                    .list({ regionId: r.id, status: "Live", limit: "1" })
                    .then((res: any) => [r.id, res.pagination?.total ?? 0] as [string, number])
                    .catch(() => [r.id, 0] as [string, number])
            )
        ).then((results) => {
            const map: Record<string, number> = {};
            for (const [id, count] of results) map[id] = count;
            setRegionCounts(map);
        });
    }, []);

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 pt-20 pb-16 sm:pt-28 sm:pb-24">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center animate-fade-in">
                        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-4 py-1.5 mb-8">
                            <ShieldCheck className="h-4 w-4 text-brand-600" />
                            <span className="text-sm font-medium text-brand-700">100% Verified Properties</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold tracking-tight text-slate-900 leading-[1.1]">
                            Find your perfect{" "}
                            <span className="text-brand-600">verified</span>{" "}
                            property in Ghana
                        </h1>
                        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            Browse verified homes, land, and commercial spaces. No scams, no surprises — just trusted properties across all 16 regions.
                        </p>

                        {/* Search Bar */}
                        <div className="mt-10 max-w-2xl mx-auto">
                            <div className="relative flex items-center bg-white rounded-full shadow-lg border border-slate-200 p-2 focus-within:ring-2 focus-within:ring-brand-200 focus-within:border-brand-400 transition-all">
                                <Search className="ml-4 h-5 w-5 text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search by region, city, or property type..."
                                    className="flex-1 bg-transparent border-none outline-none text-base px-4 py-2.5 placeholder:text-slate-400 text-slate-900"
                                />
                                <Button size="lg" className="rounded-full px-8 shadow-sm">
                                    Search
                                </Button>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
                            {[
                                { label: "Verified Listings", value: "4,000+", icon: ShieldCheck },
                                { label: "Regions Covered", value: "16", icon: MapPin },
                                { label: "Happy Clients", value: "2,500+", icon: TrendingUp },
                            ].map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-50 text-brand-600 mb-2">
                                        <stat.icon className="h-5 w-5" />
                                    </div>
                                    <p className="text-2xl font-heading font-bold text-slate-900">{stat.value}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Listings */}
            <section className="py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-end justify-between mb-10">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                                Featured Listings
                            </h2>
                            <p className="mt-2 text-slate-500">
                                Hand-picked verified properties across Ghana&apos;s top neighbourhoods.
                            </p>
                        </div>
                        <Link href="/properties" className="hidden sm:inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                            View all listings
                            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {loading ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-3" />
                                <p className="text-slate-500 font-medium">Loading featured listings...</p>
                            </div>
                        ) : featured.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-slate-500 font-medium bg-white rounded-xl border border-slate-100">
                                No featured listings available.
                            </div>
                        ) : (
                            featured.map((property) => (
                                <Link key={property.id} href={`/property/${property.id}`}>
                                    <PropertyCard
                                        id={String(property.id)}
                                        title={property.title}
                                        price={`GH₵ ${property.price.toLocaleString()}`}
                                        pricePeriod={(property.pricePeriod ?? "one-off") as "month" | "year" | "one-off"}
                                        location={property.location}
                                        bedrooms={property.bedrooms}
                                        bathrooms={property.bathrooms}
                                        imageUrl={property.images?.[0]?.url ?? "/placeholder.jpg"}
                                        isVerified={property.isVerified}
                                        category={property.category as "Rent" | "Sale" | "Rent-to-Own"}
                                    />
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Browse by Region */}
            <section className="py-16 sm:py-20 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-10">
                        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                            Browse by Region
                        </h2>
                        <p className="mt-2 text-slate-500">
                            Select a region to explore verified listings.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {REGIONS.map((region) => (
                            <Link
                                key={region.id}
                                href={`/region/${region.id}`}
                                className="group p-5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-all text-center"
                            >
                                <MapPin className="h-5 w-5 text-slate-400 group-hover:text-brand-600 mx-auto mb-2 transition-colors" />
                                <p className="font-heading font-bold text-slate-900 group-hover:text-brand-700 text-sm mb-1 transition-colors">{region.name}</p>
                                <p className="text-brand-600 font-semibold text-xs">{(regionCounts[region.id] ?? region.activeListings).toLocaleString()} listings</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Indicators */}
            <section className="py-16 sm:py-20 bg-slate-900 text-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {[
                            {
                                icon: ShieldCheck,
                                title: "Verified Properties",
                                description: "Every listing is physically inspected and verified by our team before going live.",
                            },
                            {
                                icon: Award,
                                title: "Trusted Agents",
                                description: "All agents are vetted, licensed, and rated by real clients.",
                            },
                            {
                                icon: TrendingUp,
                                title: "Market Insights",
                                description: "Get real-time pricing data and neighbourhood trends to make informed decisions.",
                            },
                        ].map((item) => (
                            <div key={item.title} className="text-center md:text-left">
                                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-600 mb-4">
                                    <item.icon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                            Explore by Region
                        </h2>
                        <p className="mt-2 text-slate-500">
                            Click any region on the map to view verified property listings.
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
                        <InteractiveMap height="h-[500px] sm:h-[600px]" />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 sm:py-20 bg-brand-600">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white">
                        Ready to list your property?
                    </h2>
                    <p className="mt-4 text-brand-100 max-w-xl mx-auto text-lg">
                        Join thousands of property owners who trust TEPS to find qualified buyers and renters.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/signup">
                            <Button
                                size="lg"
                                className="bg-white text-brand-700 hover:bg-brand-50 rounded-full px-8 shadow-lg"
                            >
                                List Property for Free
                            </Button>
                        </Link>
                        <Link href="/properties">
                            <Button
                                variant="outline"
                                size="lg"
                                className="bg-transparent text-white border-white/30 hover:bg-white/10 rounded-full px-8"
                            >
                                Browse Listings
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
