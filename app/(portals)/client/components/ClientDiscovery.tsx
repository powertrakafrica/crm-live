"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Search,
    Map as MapIcon,
    ShieldCheck,
    Home,
    SlidersHorizontal,
    ArrowRight,
    Save,
    Trash2,
    Bookmark,
    Loader2,
    Bell,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import PropertyCard from "@/components/PropertyCard";
import InteractiveMap from "@/components/InteractiveMap";
import { imageVariantUrl } from "@/lib/images";
import { propertiesApi, savedSearchApi } from "@/lib/api";
import { fetchRegions, type GeoRegion } from "@/lib/geo";

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
    propertyType: string;
    regionId: number | null;
    // Stored as decimal (string over the wire). Used for the map pins.
    gpsLatitude: string | null;
    gpsLongitude: string | null;
}

interface SavedSearch {
    id: number;
    name: string;
    queryJson: Record<string, string>;
    alertEnabled: boolean;
}

const CATEGORIES = ["Rent", "Sale", "Rent-to-Own"];
const PROPERTY_TYPES = ["House", "Apartment", "Land", "Commercial", "Mixed-Use"];
const PRICE_RANGES = [
    { label: "Any price", min: "", max: "" },
    { label: "Under GH₵100k", min: "0", max: "100000" },
    { label: "GH₵100k – 300k", min: "100000", max: "300000" },
    { label: "GH₵300k – 500k", min: "300000", max: "500000" },
    { label: "GH₵500k – 1M", min: "500000", max: "1000000" },
    { label: "Over GH₵1M", min: "1000000", max: "" },
];
const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

export function ClientDiscovery() {
    const [searchMode, setSearchMode] = useState<"map" | "list">("list");

    // Server-side filter state (mirrors GET /properties query params).
    const [search, setSearch] = useState("");
    const [regionId, setRegionId] = useState("");
    const [category, setCategory] = useState("");
    const [propertyType, setPropertyType] = useState("");
    const [verified, setVerified] = useState(true);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [bedrooms, setBedrooms] = useState("");

    const [regions, setRegions] = useState<GeoRegion[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [pagination, setPagination] = useState<{ total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
    const [savedSearchError, setSavedSearchError] = useState("");
    // Confirmation-modal target for deleting a saved search (previously fired
    // immediately on click with no prompt). Holds the full search so the modal
    // can name it.
    const [deleteSearchTarget, setDeleteSearchTarget] = useState<SavedSearch | null>(null);
    const [deletingSearch, setDeletingSearch] = useState(false);
    // Whether the next saved search should fire alerts (spec gap #12). The
    // backend already persists alertEnabled; this toggle feeds it through on
    // create. Defaults to on — most users saving a search want to hear about
    // new matches.
    const [alertEnabled, setAlertEnabled] = useState(true);

    // The filter map we both send to the API and persist as a saved search.
    const buildFilters = useCallback(() => {
        const filters: Record<string, string> = { status: "Live", limit: "100" };
        if (search.trim()) filters.search = search.trim();
        if (regionId) filters.regionId = regionId;
        if (category) filters.category = category;
        if (propertyType) filters.propertyType = propertyType;
        if (verified) filters.verified = "true";
        if (minPrice) filters.minPrice = minPrice;
        if (maxPrice) filters.maxPrice = maxPrice;
        if (bedrooms) filters.bedrooms = bedrooms;
        return filters;
    }, [search, regionId, category, propertyType, verified, minPrice, maxPrice, bedrooms]);

    // Load regions once for the dropdown (cached in lib/geo).
    useEffect(() => {
        fetchRegions()
            .then(setRegions)
            .catch(() => setRegions([]));
    }, []);

    // Fetch listings whenever the filters change. The backend does the filtering
    // (case-insensitive search across title/location/description/district), so
    // there's no client-side filter pass left here — the old in-memory filter
    // was both narrow (title only) and capped to the first 20 rows. The fetch
    // lives in a useCallback (not directly in the effect body) so the
    // setLoading(true) doesn't trip the set-state-in-effect rule — mirrors the
    // public /properties page's pattern.
    const fetchProperties = useCallback(() => {
        setLoading(true);
        setError("");
        propertiesApi
            .list(buildFilters())
            .then((res: any) => {
                setProperties((res.data ?? []) as Property[]);
                setPagination(res.pagination ?? null);
            })
            .catch((err: any) => setError(err.message || "Failed to load properties"))
            .finally(() => setLoading(false));
    }, [buildFilters]);

    useEffect(() => {
        // Canonical fetch-on-filter-change pattern (mirrors the public
        // /properties page). The set-state-in-effect rule flags the
        // unconditional fetchProperties() call because it synchronously sets
        // `loading`; that's an accepted false positive for this data-fetching
        // shape (we genuinely want the spinner while the request is in flight).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProperties();
    }, [fetchProperties]);

    // Saved searches — load once. A 401/403 (shouldn't happen inside the client
    // portal, but defensive) hides the panel.
    const loadSavedSearches = useCallback(() => {
        savedSearchApi
            .list()
            .then((rows: any) => setSavedSearches(rows as SavedSearch[]))
            .catch(() => setSavedSearches([]));
    }, []);

    useEffect(() => {
        loadSavedSearches();
    }, [loadSavedSearches]);

    const activeFilterCount = [
        regionId,
        category,
        propertyType,
        verified ? "1" : "",
        minPrice || maxPrice,
        bedrooms,
        search.trim(),
    ].filter(Boolean).length;

    const clearFilters = () => {
        setSearch("");
        setRegionId("");
        setCategory("");
        setPropertyType("");
        setVerified(true);
        setMinPrice("");
        setMaxPrice("");
        setBedrooms("");
    };

    const getImageUrl = (p: Property) => {
        const primary = p.images?.find((img) => img.isPrimary);
        const pick = primary ?? p.images?.[0];
        return imageVariantUrl(pick, "thumb") ?? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop";
    };

    const validPeriod = (p: string): "month" | "year" | "one-off" => {
        if (p === "month" || p === "year" || p === "one-off") return p;
        return "month";
    };

    const validCategory = (c: string): "Rent" | "Sale" | "Rent-to-Own" => {
        if (c === "Rent" || c === "Sale" || c === "Rent-to-Own") return c;
        return "Rent";
    };

    // Map pins only for properties with valid GPS coords. Stored decimals come
    // back as strings; parse and drop any that aren't finite numbers (and the
    // 0,0 sentinel some listings carry before geocoding).
    const mapMarkers = properties
        .map((p) => ({
            lat: Number(p.gpsLatitude),
            lng: Number(p.gpsLongitude),
            label: `${p.title} — GH₵${p.price.toLocaleString()}`,
        }))
        .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng) && m.lat !== 0 && m.lng !== 0);

    const handleSaveSearch = async () => {
        const name = window.prompt("Name this search (e.g. 'East Legon 2-bed'):", search.trim() || "My search");
        if (!name?.trim()) return;
        setSavedSearchError("");
        try {
            await savedSearchApi.create({ name: name.trim(), queryJson: buildFilters(), alertEnabled });
            loadSavedSearches();
        } catch (err: any) {
            setSavedSearchError(err.message || "Could not save search");
        }
    };

    const applySavedSearch = (s: SavedSearch) => {
        const q = s.queryJson ?? {};
        setSearch(q.search ?? "");
        setRegionId(q.regionId ?? "");
        setCategory(q.category ?? "");
        setPropertyType(q.propertyType ?? "");
        setVerified(q.verified === "true");
        setMinPrice(q.minPrice ?? "");
        setMaxPrice(q.maxPrice ?? "");
        setBedrooms(q.bedrooms ?? "");
        setSearchMode("list");
    };

    // Deletes the saved search after the user confirms in the ConfirmDialog.
    // Replaces the old immediate-delete-on-click.
    const confirmDeleteSavedSearch = async () => {
        if (!deleteSearchTarget) return;
        setDeletingSearch(true);
        try {
            await savedSearchApi.remove(deleteSearchTarget.id);
            setSavedSearches((prev) => prev.filter((s) => s.id !== deleteSearchTarget.id));
            setDeleteSearchTarget(null);
        } catch {
            // keep
        } finally {
            setDeletingSearch(false);
        }
    };

    if (loading && properties.length === 0) {
        return (
            <div className="space-y-6">
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600 mx-auto mb-3" />
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
            <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Discover Properties</h2>
                    <p className="text-charcoal-500 font-medium mt-1">
                        {pagination?.total ?? properties.length} verified listings across Ghana.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Alert toggle (spec gap #12) — controls whether the saved
                        search fires notifications for new matches. Styled like
                        the "Verified Only" toggle below. */}
                    <label
                        className="flex items-center gap-2 cursor-pointer bg-brand-50 border border-brand-200 px-3 py-2 rounded-sm transition-all hover:bg-brand-100"
                        title="Get notified when new listings match this search"
                    >
                        <Bell className={`h-4 w-4 transition-colors ${alertEnabled ? "text-brand-600" : "text-brand-300"}`} />
                        <span className={`text-xs font-bold transition-colors ${alertEnabled ? "text-brand-900" : "text-brand-700"} hidden sm:inline`}>Alerts</span>
                        <div className={`relative w-9 h-4 rounded-full transition-colors duration-300 ${alertEnabled ? "bg-brand-600" : "bg-brand-200"}`}>
                            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${alertEnabled ? "transform translate-x-5" : ""}`} />
                        </div>
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={alertEnabled}
                            onChange={() => setAlertEnabled(!alertEnabled)}
                        />
                    </label>
                    <Button
                        variant="outline"
                        onClick={handleSaveSearch}
                        className="flex items-center gap-2"
                        title="Save the current filters as a search you can re-apply later"
                    >
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline">Save search</span>
                    </Button>
                </div>
            </div>

            {savedSearchError && (
                <div className="bg-red-50 border border-red-200 rounded-sm px-3 py-2 text-xs font-medium text-red-700">{savedSearchError}</div>
            )}

            {/* Saved searches */}
            {savedSearches.length > 0 && (
                <div className="bg-white border border-charcoal-200 rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Bookmark className="h-4 w-4 text-brand-600" />
                        <h3 className="text-sm font-bold text-charcoal-900">Saved searches</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {savedSearches.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center gap-2 bg-charcoal-50 border border-charcoal-200 rounded-sm pl-3 pr-1.5 py-1.5"
                            >
                                <button
                                    onClick={() => applySavedSearch(s)}
                                    className="text-xs font-semibold text-charcoal-800 hover:text-brand-700 transition-colors"
                                    title="Apply these filters"
                                >
                                    {s.name}
                                </button>
                                {s.alertEnabled && (
                                    <Bell
                                        className="h-3.5 w-3.5 text-brand-600"
                                        aria-label="Alerts on — notifies you of new matches"
                                    />
                                )}
                                <button
                                    onClick={() => setDeleteSearchTarget(s)}
                                    className="text-charcoal-400 hover:text-red-600 transition-colors p-0.5"
                                    aria-label={`Delete saved search ${s.name}`}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-sm shadow-sm border border-charcoal-200 flex flex-col lg:flex-row gap-4 justify-between items-center sticky top-20 z-20">
                {/* Search Bar */}
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-charcoal-400" />
                    <input
                        type="text"
                        placeholder="Search 'East Legon' or 'Kumasi'..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-charcoal-50 border-none rounded-sm focus:ring-2 focus:ring-brand-600 outline-none font-medium"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto overflow-x-auto hide-scrollbar">
                    {/* View Toggle */}
                    <div className="flex bg-charcoal-50 p-1 rounded-sm border border-charcoal-200 shrink-0">
                        <button onClick={() => setSearchMode("list")} className={`p-1.5 rounded-sm transition-colors flex items-center gap-1 ${searchMode === "list" ? "bg-white text-brand-600 shadow-sm" : "text-charcoal-400 hover:text-charcoal-600"}`}>
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="text-xs font-bold sr-only sm:not-sr-only px-1">List</span>
                        </button>
                        <button onClick={() => setSearchMode("map")} className={`p-1.5 rounded-sm transition-colors flex items-center gap-1 ${searchMode === "map" ? "bg-white text-brand-600 shadow-sm" : "text-charcoal-400 hover:text-charcoal-600"}`}>
                            <MapIcon className="h-4 w-4" />
                            <span className="text-xs font-bold sr-only sm:not-sr-only px-1">Map</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-charcoal-200 rounded-sm p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-charcoal-400" />
                        <h3 className="text-sm font-bold text-charcoal-900">Filters</h3>
                        {activeFilterCount > 0 && (
                            <span className="text-[10px] font-bold text-white bg-brand-600 rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>
                        )}
                    </div>
                    {activeFilterCount > 0 && (
                        <button onClick={clearFilters} className="text-xs font-medium text-brand-600 hover:text-brand-700">Clear all</button>
                    )}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Transaction / Category */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 mb-2 block">Transaction</label>
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setCategory(category === c ? "" : c)}
                                    className={`px-2.5 py-1.5 rounded-sm text-xs font-semibold border transition-all ${category === c ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-charcoal-200 text-charcoal-600 hover:border-charcoal-300"}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Property Type */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 mb-2 block">Property type</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PROPERTY_TYPES.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setPropertyType(propertyType === t ? "" : t)}
                                    className={`px-2.5 py-1.5 rounded-sm text-xs font-semibold border transition-all flex items-center gap-1 ${propertyType === t ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-charcoal-200 text-charcoal-600 hover:border-charcoal-300"}`}
                                >
                                    <Home className="h-3 w-3" />
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Region */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 mb-2 block">Region</label>
                        <select
                            value={regionId}
                            onChange={(e) => setRegionId(e.target.value)}
                            className="w-full bg-white border border-charcoal-200 rounded-sm px-3 py-2 text-sm font-medium text-charcoal-800 outline-none focus:ring-2 focus:ring-brand-600"
                        >
                            <option value="">All regions</option>
                            {regions.map((r) => (
                                <option key={r.id} value={String(r.id)}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Price Range */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 mb-2 block">Price range</label>
                        <select
                            value={`${minPrice}|${maxPrice}`}
                            onChange={(e) => {
                                const [mn, mx] = e.target.value.split("|");
                                setMinPrice(mn);
                                setMaxPrice(mx);
                            }}
                            className="w-full bg-white border border-charcoal-200 rounded-sm px-3 py-2 text-sm font-medium text-charcoal-800 outline-none focus:ring-2 focus:ring-brand-600"
                        >
                            {PRICE_RANGES.map((r) => (
                                <option key={r.label} value={`${r.min}|${r.max}`}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Bedrooms */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 mb-2 block">Min bedrooms</label>
                        <div className="flex flex-wrap gap-1.5">
                            {BEDROOM_OPTIONS.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setBedrooms(bedrooms === String(n) ? "" : String(n))}
                                    className={`h-8 w-8 rounded-sm text-xs font-semibold border transition-all flex items-center justify-center ${bedrooms === String(n) ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-white border-charcoal-200 text-charcoal-600 hover:border-charcoal-300"}`}
                                >
                                    {n}+
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Verified toggle */}
                    <div className="flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer bg-brand-50 border border-brand-200 px-3 py-2 rounded-sm w-full group transition-all hover:bg-brand-100">
                            <ShieldCheck className={`h-5 w-5 transition-colors ${verified ? "text-brand-600" : "text-brand-300"}`} />
                            <span className={`text-sm font-bold transition-colors ${verified ? "text-brand-900" : "text-brand-700"}`}>Verified Only</span>
                            <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ml-auto ${verified ? "bg-brand-600" : "bg-brand-200"}`}>
                                <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform duration-300 ${verified ? "transform translate-x-5" : ""}`} />
                            </div>
                            <input type="checkbox" className="sr-only" checked={verified} onChange={() => setVerified(!verified)} />
                        </label>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {searchMode === "map" ? (
                <div className="space-y-4">
                    <div className="h-[650px] w-full rounded-sm border border-charcoal-200 overflow-hidden">
                        {mapMarkers.length > 0 ? (
                            <InteractiveMap
                                markers={mapMarkers}
                                height="h-[650px]"
                            />
                        ) : (
                            <div className="h-full w-full bg-[#f8f9fa] flex flex-col items-center justify-center text-center px-6">
                                <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapIcon className="h-8 w-8 text-brand-600" />
                                </div>
                                <h3 className="text-xl font-heading font-bold text-charcoal-900 mb-1">No mappable properties</h3>
                                <p className="text-charcoal-500 text-sm max-w-md">
                                    None of the {properties.length} matching listings have GPS coordinates yet. Switch to list view to browse them.
                                </p>
                                <Button onClick={() => setSearchMode("list")} className="mt-5 bg-brand-600 hover:bg-brand-700 text-white font-bold">
                                    Switch to List View <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    {mapMarkers.length > 0 && mapMarkers.length < properties.length && (
                        <p className="text-xs text-charcoal-500 font-medium">
                            Showing {mapMarkers.length} of {properties.length} listings on the map — the rest lack GPS coordinates.
                        </p>
                    )}
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {loading ? (
                        <div className="text-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-brand-600 mx-auto mb-3" />
                            <p className="text-charcoal-500 font-medium">Updating results...</p>
                        </div>
                    ) : properties.length === 0 ? (
                        <div className="text-center py-24 bg-white border border-charcoal-200 rounded-sm shadow-sm">
                            <div className="h-16 w-16 bg-charcoal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-charcoal-400" />
                            </div>
                            <h3 className="text-xl font-heading font-bold text-charcoal-900">No properties align with these filters.</h3>
                            <p className="text-charcoal-500 mt-2 max-w-sm mx-auto">Try broadening your search term or turning off &quot;Verified Only&quot; to view unverified listings.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {properties.map((property) => (
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

            {/* Saved-search delete confirmation */}
            <ConfirmDialog
                isOpen={deleteSearchTarget != null}
                onClose={() => setDeleteSearchTarget(null)}
                onConfirm={confirmDeleteSavedSearch}
                busy={deletingSearch}
                title="Delete Saved Search"
                message={<>Delete the saved search <strong>{deleteSearchTarget?.name}</strong>? This cannot be undone.</>}
            />
        </div>
    );
}