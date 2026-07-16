"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Search,
    SlidersHorizontal,
    X,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Bed,
    Bath,
    Loader2,
    Home,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import PropertyCard from "@/components/PropertyCard";
import { imageVariantUrl } from "@/lib/images";
import { propertiesApi } from "@/lib/api";
import { fetchRegions, getRegionBySlug, type GeoRegion } from "@/lib/geo";

interface PropertyItem {
    id: number;
    title: string;
    price: number;
    pricePeriod?: string | null;
    location: string;
    bedrooms: number;
    bathrooms: number;
    images: { url: string }[];
    isVerified: boolean;
    category: string;
    transactionType: string;
    propertyType: string;
    regionId: string;
}

interface Pagination {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
}

const CATEGORIES = ["Rent", "Sale", "Rent-to-Own"];
const PROPERTY_TYPES = ["House", "Apartment", "Land", "Commercial", "Mixed-Use"];
const PRICE_RANGES = [
    { label: "Any", min: "", max: "" },
    { label: "Under GH₵100k", min: "0", max: "100000" },
    { label: "GH₵100k – 300k", min: "100000", max: "300000" },
    { label: "GH₵300k – 500k", min: "300000", max: "500000" },
    { label: "GH₵500k – 1M", min: "500000", max: "1000000" },
    { label: "Over GH₵1M", min: "1000000", max: "" },
];
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];
const BATHROOM_OPTIONS = [1, 2, 3, 4, 5];
const SORT_OPTIONS = [
    { label: "Newest", value: "newest" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
];

function PropertiesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filter state synced with URL. regionId is always a NUMERIC geo id (or "");
    // an incoming slug like ?regionId=greater-accra is resolved to numeric on
    // mount below — the backend filters by Number(regionId), so a slug here
    // would silently yield zero results.
    const [search, setSearch] = useState(searchParams.get("search") ?? "");
    const initialRegion = searchParams.get("regionId") ?? "";
    const [regionId, setRegionId] = useState(/^\d+$/.test(initialRegion) ? initialRegion : "");
    const [regionReady, setRegionReady] = useState(!initialRegion || /^\d+$/.test(initialRegion));
    const [regions, setRegions] = useState<GeoRegion[]>([]);
    const [category, setCategory] = useState(searchParams.get("category") ?? "");
    const [transactionType, setTransactionType] = useState(searchParams.get("transactionType") ?? "");
    const [propertyType, setPropertyType] = useState(searchParams.get("propertyType") ?? "");
    const [verified, setVerified] = useState(searchParams.get("verified") === "true");
    const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
    const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
    const [bedrooms, setBedrooms] = useState(searchParams.get("bedrooms") ?? "");
    const [bathrooms, setBathrooms] = useState(searchParams.get("bathrooms") ?? "");
    const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
    const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));

    const [properties, setProperties] = useState<PropertyItem[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Populate the region filter from the real /api/geo/regions list (cached).
    useEffect(() => {
        fetchRegions()
            .then(setRegions)
            .catch(() => setRegions([]));
    }, []);

    // Resolve an incoming slug regionId (?regionId=greater-accra, as the region
    // page's "View all" link emits) to its numeric geo id so the filter matches
    // a button and the backend query works. Numeric (or empty) ids are ready as-is.
    useEffect(() => {
        const raw = searchParams.get("regionId") ?? "";
        if (!raw || /^\d+$/.test(raw)) {
            setRegionReady(true);
            return;
        }
        let cancelled = false;
        getRegionBySlug(raw)
            .then((r) => {
                if (!cancelled) {
                    setRegionId(r ? String(r.id) : "");
                    setRegionReady(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRegionId("");
                    setRegionReady(true);
                }
            });
        return () => {
            cancelled = true;
        };
        // Resolve once on mount; subsequent regionId changes come from the buttons
        // and are already numeric.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeFilterCount = [
        regionId,
        category,
        transactionType,
        propertyType,
        verified || "",
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
    ].filter(Boolean).length;

    const buildQuery = useCallback(
        (overrides?: Record<string, string>) => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (regionId) params.set("regionId", regionId);
            if (category) params.set("category", category);
            if (transactionType) params.set("transactionType", transactionType);
            if (propertyType) params.set("propertyType", propertyType);
            if (verified) params.set("verified", "true");
            if (minPrice) params.set("minPrice", minPrice);
            if (maxPrice) params.set("maxPrice", maxPrice);
            if (bedrooms) params.set("bedrooms", bedrooms);
            if (bathrooms) params.set("bathrooms", bathrooms);
            if (sort) params.set("sort", sort);
            const p = overrides?.page ?? String(page);
            if (p !== "1") params.set("page", p);
            return params;
        },
        [search, regionId, category, transactionType, propertyType, verified, minPrice, maxPrice, bedrooms, bathrooms, sort, page]
    );

    const fetchProperties = useCallback(() => {
        setLoading(true);
        setError("");

        const filters: Record<string, string> = {
            limit: "12",
            page: String(page),
            status: "Live",
        };
        if (search) filters.search = search;
        if (regionId) filters.regionId = regionId;
        if (category) filters.category = category;
        if (transactionType) filters.transactionType = transactionType;
        if (propertyType) filters.propertyType = propertyType;
        if (verified) filters.verified = "true";
        if (minPrice) filters.minPrice = minPrice;
        if (maxPrice) filters.maxPrice = maxPrice;
        if (bedrooms) filters.bedrooms = bedrooms;
        if (bathrooms) filters.bathrooms = bathrooms;

        propertiesApi
            .list(filters)
            .then((res: any) => {
                let data: PropertyItem[] = res.data ?? [];
                // Client-side sort (backend only supports newest)
                if (sort === "price_asc") {
                    data = data.sort((a: PropertyItem, b: PropertyItem) => a.price - b.price);
                } else if (sort === "price_desc") {
                    data = data.sort((a: PropertyItem, b: PropertyItem) => b.price - a.price);
                }
                setProperties(data);
                setPagination(res.pagination ?? null);
            })
            .catch((err: any) => {
                setError(err.message || "Failed to load properties");
            })
            .finally(() => setLoading(false));
    }, [search, regionId, category, transactionType, propertyType, verified, minPrice, maxPrice, bedrooms, bathrooms, sort, page]);

    // Sync URL when filters change
    useEffect(() => {
        const params = buildQuery();
        const newUrl = `/properties?${params.toString()}`;
        if (newUrl !== window.location.pathname + window.location.search) {
            router.replace(newUrl, { scroll: false });
        }
        // Don't fetch until an incoming slug regionId has been resolved to numeric,
        // otherwise the first request would filter by the slug (→ NaN → no results).
        if (regionReady) fetchProperties();
    }, [buildQuery, fetchProperties, router, regionReady]);

    const clearFilters = () => {
        setSearch("");
        setRegionId("");
        setCategory("");
        setTransactionType("");
        setPropertyType("");
        setVerified(false);
        setMinPrice("");
        setMaxPrice("");
        setBedrooms("");
        setBathrooms("");
        setSort("newest");
        setPage(1);
    };

    const handlePriceRange = (min: string, max: string) => {
        setMinPrice(min);
        setMaxPrice(max);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                                Browse Properties
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {pagination?.total ?? 0} verified listings across Ghana
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Sort dropdown */}
                            <select
                                value={sort}
                                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-3 py-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                            >
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                                className="relative"
                            >
                                <SlidersHorizontal className="h-4 w-4 mr-2" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="mt-6 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by title, location, or keyword..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(""); setPage(1); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    {(showFilters || activeFilterCount > 0) && (
                        <aside className="lg:w-72 flex-shrink-0">
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-slate-900">Filters</h3>
                                    {activeFilterCount > 0 && (
                                        <button
                                            onClick={clearFilters}
                                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>

                                {/* Transaction Type */}
                                <div className="mb-6">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Transaction Type
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => { setCategory(category === c ? "" : c); setPage(1); }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                    category === c
                                                        ? "bg-brand-50 border-brand-300 text-brand-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                }`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Region */}
                                <div className="mb-6">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Region
                                    </label>
                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                        {regions.length > 0 ? (
                                            regions.map((r) => {
                                                const id = String(r.id);
                                                const selected = regionId === id;
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => { setRegionId(selected ? "" : id); setPage(1); }}
                                                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                            selected
                                                                ? "bg-brand-50 text-brand-700"
                                                                : "text-slate-700 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                            {r.name}
                                                        </span>
                                                        {selected && <span className="text-brand-600 text-xs font-bold">&#x2713;</span>}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="px-3 py-2 text-xs text-slate-400">Loading regions…</p>
                                        )}
                                    </div>
                                </div>

                                {/* Price Range */}
                                <div className="mb-6">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Price Range
                                    </label>
                                    <div className="space-y-1.5">
                                        {PRICE_RANGES.map((range) => (
                                            <button
                                                key={range.label}
                                                type="button"
                                                onClick={() => handlePriceRange(range.min, range.max)}
                                                className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    minPrice === range.min && maxPrice === range.max
                                                        ? "bg-brand-50 text-brand-700"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bedrooms */}
                                <div className="mb-6">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Bedrooms
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {BEDROOM_OPTIONS.map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => { setBedrooms(bedrooms === String(n) ? "" : String(n)); setPage(1); }}
                                                className={`h-9 w-9 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center ${
                                                    bedrooms === String(n)
                                                        ? "bg-brand-50 border-brand-300 text-brand-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                }`}
                                            >
                                                {n}+
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bathrooms */}
                                <div className="mb-6">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Bathrooms
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {BATHROOM_OPTIONS.map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => { setBathrooms(bathrooms === String(n) ? "" : String(n)); setPage(1); }}
                                                className={`h-9 w-9 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center ${
                                                    bathrooms === String(n)
                                                        ? "bg-brand-50 border-brand-300 text-brand-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                }`}
                                            >
                                                {n}+
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Property Type */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Property Type
                                    </label>
                                    <div className="space-y-1">
                                        {PROPERTY_TYPES.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => { setPropertyType(propertyType === t ? "" : t); setPage(1); }}
                                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                                    propertyType === t
                                                        ? "bg-brand-50 text-brand-700"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <Home className="h-3.5 w-3.5 text-slate-400" />
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Verified only */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                                        Verification
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setVerified(!verified); setPage(1); }}
                                        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            verified
                                                ? "bg-brand-50 text-brand-700"
                                                : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                                        Verified only
                                        {verified && <span className="ml-auto text-brand-600 text-xs font-bold">&#x2713;</span>}
                                    </button>
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Results */}
                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
                                <p className="text-slate-500 font-medium">Loading properties...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                                <p className="text-red-700 font-semibold mb-4">{error}</p>
                                <Button onClick={fetchProperties} variant="outline">Try again</Button>
                            </div>
                        ) : properties.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                                <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 mb-1">No properties found</h3>
                                <p className="text-slate-500 mb-6">Try adjusting your filters or search terms.</p>
                                <Button onClick={clearFilters} variant="outline">Clear all filters</Button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {properties.map((property) => (
                                        <Link key={property.id} href={`/property/${property.id}`}>
                                            <PropertyCard
                                                id={String(property.id)}
                                                title={property.title}
                                                price={`GH₵ ${property.price.toLocaleString()}`}
                                                pricePeriod={(property.pricePeriod ?? "one-off") as "month" | "year" | "one-off"}
                                                location={property.location}
                                                bedrooms={property.bedrooms}
                                                bathrooms={property.bathrooms}
                                                imageUrl={imageVariantUrl(property.images?.[0], "thumb") ?? "/placeholder.jpg"}
                                                isVerified={property.isVerified}
                                                category={property.category as "Rent" | "Sale" | "Rent-to-Own"}
                                            />
                                        </Link>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination && pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page <= 1}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Prev
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                                .filter((p) =>
                                                    p === 1 ||
                                                    p === pagination.totalPages ||
                                                    Math.abs(p - page) <= 1
                                                )
                                                .reduce<(number | string)[]>((acc, p, i, arr) => {
                                                    if (i > 0 && typeof arr[i - 1] === "number" && p - (arr[i - 1] as number) > 1) {
                                                        acc.push("...");
                                                    }
                                                    acc.push(p);
                                                    return acc;
                                                }, [])
                                                .map((p, i) =>
                                                    p === "..." ? (
                                                        <span key={`dots-${i}`} className="px-3 text-slate-400 text-sm">...</span>
                                                    ) : (
                                                        <button
                                                            key={p}
                                                            onClick={() => setPage(p as number)}
                                                            className={`h-9 min-w-[36px] px-3 rounded-lg text-sm font-semibold transition-all ${
                                                                page === p
                                                                    ? "bg-brand-600 text-white"
                                                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    )
                                                )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                            disabled={page >= pagination.totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PropertiesPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
                    <p className="text-slate-500 font-medium">Loading...</p>
                </div>
            }
        >
            <PropertiesContent />
        </Suspense>
    );
}
