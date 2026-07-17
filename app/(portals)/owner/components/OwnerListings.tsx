"use client";

import { useState, useEffect, useRef } from "react";
import {
    Plus,
    X,
    MapPin,
    Edit,
    Trash2,
    Loader2,
    BedDouble,
    Bath,
    Maximize2,
    Calendar,
    Home,
    FileText,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhotonSearch } from "@/components/PhotonSearch";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ownerApi, propertiesApi, uploadApi } from "@/lib/api";
import { useGeoRegions, useConstituencies } from "@/lib/hooks/geo";
import { OwnerDocumentsModal } from "./OwnerDocumentsModal";

interface OwnerProperty {
    id: number;
    title: string;
    location?: string;
    category?: string;
    propertyType?: string;
    price?: number;
    pricePeriod?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    gpsCode?: string;
    description?: string;
    regionId?: number;
    constituencyId?: number;
    amenities?: string[];
    isVerified: boolean;
    status: string;
    verificationStatus?: string;
    images?: { url: string; isPrimary: boolean }[];
}

const DEFAULT_FEATURES: string[] = [];

const EMPTY_FORM = {
    listingType: "Rent",
    title: "",
    description: "",
    price: 0,
    period: "month",
    regionId: 0,
    constituencyId: 0,
    location: "",
    gpsCode: "",
    propertyType: "House",
    bedrooms: 0,
    bathrooms: 0,
    sqft: 0,
    yearBuilt: 0,
    features: DEFAULT_FEATURES,
};

const AFRO_FEATURES = [
    "Walled & Gated",
    "Borehole Access",
    "Prepaid Meter",
    "Constant Water Flow",
    "Proximity to Trotro",
    "Tarred Road Access",
    "Registered Land Title",
    "Security Guard Post",
];

// Module-scope pure helpers so `loadListings` (called from a mount effect) has
// no non-stale closure deps — matches the AgentListings convention and avoids
// react-hooks/exhaustive-deps.
const mapDbStatus = (status: string) => {
    switch (status) {
        case "Active": return "Available";
        case "Pending": return "Pending Review";
        case "Sold":
        case "Rented":
        case "Archived": return "Off-Market";
        case "Draft": return "Pending Review";
        default: return status;
    }
};

const getStatusVariant = (status: string): "verified" | "secondary" | "default" => {
    if (status === "Available") return "verified";
    if (status === "Pending Review") return "secondary";
    return "default";
};

export function OwnerListings() {
    const [listings, setListings] = useState<OwnerProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [docsFor, setDocsFor] = useState<OwnerProperty | null>(null);

    // Wizard state
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardForm, setWizardForm] = useState(EMPTY_FORM);
    const [editingListing, setEditingListing] = useState<OwnerProperty | null>(null);

    // Media state
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const imageInputRef = useRef<HTMLInputElement>(null);

    const regions = useGeoRegions();
    const constituencies = useConstituencies(wizardForm.regionId || null);

    useEffect(() => {
        const urls = imageFiles.map((f) => URL.createObjectURL(f));
        setImagePreviews(urls);
        return () => {
            urls.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [imageFiles]);

    const loadListings = () => {
        // No synchronous setState here: on mount `loading` starts true via the
        // useState initializer; on refresh (called from an event handler) we
        // just re-fetch without a spinner. All setState is in async callbacks
        // below, so this avoids react-hooks/set-state-in-effect (the geo.ts
        // convention).
        ownerApi
            .properties()
            .then((data: any) => {
                const mapped = (data ?? []).map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    location: p.location,
                    category: p.category,
                    propertyType: p.propertyType,
                    price: p.price,
                    pricePeriod: p.pricePeriod,
                    bedrooms: p.bedrooms,
                    bathrooms: p.bathrooms,
                    sqft: p.sqft,
                    yearBuilt: p.yearBuilt,
                    gpsCode: p.gpsCode,
                    description: p.description,
                    regionId: p.regionId,
                    constituencyId: p.constituencyId,
                    amenities: p.amenities,
                    isVerified: p.verificationStatus === "Verified" || p.isVerified === true,
                    status: mapDbStatus(p.status),
                    verificationStatus: p.verificationStatus,
                    images: p.images,
                }));
                setListings(mapped);
                setError("");
            })
            .catch((err: any) => setError(err.message || "Failed to load properties"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadListings();
    }, []);

    const openWizard = () => {
        setWizardStep(1);
        setWizardForm(EMPTY_FORM);
        setImageFiles([]);
        setPublishError("");
        setPublishing(false);
        setEditingListing(null);
        setWizardOpen(true);
    };

    const onRegionChange = (regionId: number) => {
        setWizardForm((prev) => ({ ...prev, regionId, constituencyId: 0 }));
    };

    const openEditWizard = (listing: OwnerProperty) => {
        setWizardStep(1);
        setWizardForm({
            listingType: listing.category ?? "Rent",
            title: listing.title,
            description: listing.description ?? "",
            price: listing.price ?? 0,
            period: listing.pricePeriod ?? "month",
            regionId: listing.regionId ?? 0,
            constituencyId: listing.constituencyId ?? 0,
            location: listing.location ?? "",
            gpsCode: listing.gpsCode ?? "",
            propertyType: listing.propertyType ?? "House",
            bedrooms: listing.bedrooms ?? 0,
            bathrooms: listing.bathrooms ?? 0,
            sqft: listing.sqft ?? 0,
            yearBuilt: listing.yearBuilt ?? 0,
            features: listing.amenities ?? [],
        });
        setImageFiles([]);
        setPublishError("");
        setEditingListing(listing);
        setWizardOpen(true);
    };

    const closeWizard = () => {
        // Clear any picked-but-unpublished images so the preview effect's
        // cleanup revokes their object URLs (no leak on X-cancel). Mirrors
        // openWizard's reset.
        setImageFiles([]);
        setPublishError("");
        setEditingListing(null);
        setWizardOpen(false);
    };

    const handlePublish = async () => {
        setPublishError("");
        const {
            listingType,
            title,
            description,
            price,
            period,
            regionId,
            constituencyId,
            location,
            gpsCode,
            propertyType,
            bedrooms,
            bathrooms,
            sqft,
            yearBuilt,
            features,
        } = wizardForm;

        let partialFail = false;
        setPublishing(true);
        try {
            // Owner is inferred from the session by POST /properties (no
            // ownerId in the body). listingType drives both category and
            // transactionType, which share the Rent/Sale/Rent-to-Own enum.
            const created = (await propertiesApi.create({
                title,
                description: description || "",
                price,
                pricePeriod: period,
                location,
                gpsCode: gpsCode || undefined,
                category: listingType,
                transactionType: listingType,
                propertyType,
                regionId,
                constituencyId,
                bedrooms,
                bathrooms,
                sqft: sqft || undefined,
                yearBuilt: yearBuilt || undefined,
                amenities: features,
            })) as { id: number };

            let uploaded = 0;
            for (let i = 0; i < imageFiles.length; i++) {
                try {
                    const { url } = (await uploadApi.image(imageFiles[i])) as { url: string };
                    await propertiesApi.addImage(created.id, {
                        url,
                        isPrimary: i === 0,
                        sortOrder: i,
                    });
                    uploaded++;
                } catch {
                    // Property is already created; keep going so partial uploads still attach.
                }
            }
            if (imageFiles.length > 0 && uploaded < imageFiles.length) {
                partialFail = true;
                setPublishError(
                    `Listing created, but only ${uploaded} of ${imageFiles.length} images uploaded.`,
                );
                setImageFiles([]);
                loadListings();
                return; // keep wizard open so the message is visible; user closes via X
            }
            setImageFiles([]);
            setEditingListing(null);
            setWizardOpen(false);
            loadListings();
        } catch (err: unknown) {
            setPublishError(err instanceof Error ? err.message : "Failed to publish listing.");
        } finally {
            if (!partialFail) setPublishing(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingListing) return;
        const {
            listingType,
            title,
            description,
            price,
            period,
            regionId,
            constituencyId,
            location,
            gpsCode,
            propertyType,
            bedrooms,
            bathrooms,
            sqft,
            yearBuilt,
            features,
        } = wizardForm;

        setPublishError("");
        setPublishing(true);
        try {
            // PUT /properties/:id strips status + verificationStatus server-side
            // (lifecycle transitions are admin-only), so we only send editable
            // details. The owner is inferred from the session, not sent.
            await propertiesApi.update(editingListing.id, {
                title,
                description: description || "",
                price,
                pricePeriod: period,
                location,
                gpsCode: gpsCode || undefined,
                category: listingType,
                transactionType: listingType,
                propertyType,
                regionId,
                constituencyId,
                bedrooms,
                bathrooms,
                sqft: sqft || undefined,
                yearBuilt: yearBuilt || undefined,
                amenities: features,
            });
            const updated = listings.map((l) =>
                l.id === editingListing.id
                    ? {
                        ...l,
                        title,
                        category: listingType,
                        propertyType,
                        price,
                        pricePeriod: period,
                        bedrooms,
                        bathrooms,
                        location,
                        description,
                        sqft,
                        yearBuilt,
                        gpsCode,
                        regionId,
                        constituencyId,
                        amenities: features,
                    }
                    : l,
            );
            setListings(updated);
            setEditingListing(null);
            setWizardOpen(false);
        } catch (err: unknown) {
            setPublishError(err instanceof Error ? err.message : "Failed to save changes.");
        } finally {
            setPublishing(false);
        }
    };

    const handleUnpublish = async (listing: OwnerProperty) => {
        if (!window.confirm(`Unpublish and delete "${listing.title}"? This cannot be undone.`)) return;
        // DELETE /properties/:id authorizes ownerId === caller, so the owner
        // can remove their own listing.
        setDeleteError("");
        try {
            await propertiesApi.delete(listing.id);
            setListings((prev) => prev.filter((l) => l.id !== listing.id));
        } catch (err: unknown) {
            setDeleteError(err instanceof Error ? err.message : "Failed to unpublish listing.");
        }
    };

    const WIZARD_STEPS = 4;

    const canContinue = () => {
        switch (wizardStep) {
            case 1:
                return (
                    wizardForm.title.trim() !== "" &&
                    wizardForm.location.trim() !== "" &&
                    wizardForm.regionId !== 0 &&
                    wizardForm.constituencyId !== 0
                );
            case 2:
                return wizardForm.propertyType !== "";
            case 3:
                return wizardForm.price > 0;
            case 4:
                return true;
            default:
                return true;
        }
    };

    const toggleFeature = (feature: string) => {
        setWizardForm((prev) => {
            const has = prev.features.includes(feature);
            return {
                ...prev,
                features: has
                    ? prev.features.filter((f) => f !== feature)
                    : [...prev.features, feature],
            };
        });
    };

    return (
        <div className="space-y-6">

            {/* Standard Dashboard View */}
            {!wizardOpen && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-charcoal-950">Property Portfolio</h2>
                            <p className="text-charcoal-500 font-medium">Create new listings and manage your existing properties.</p>
                        </div>
                        <Button onClick={openWizard} className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm h-11 px-6">
                            <Plus className="h-5 w-5 mr-2" /> Smart Listing Wizard
                        </Button>
                    </div>

                    {loading ? (
                        <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                            <p className="text-charcoal-500 font-medium">Loading properties...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
                    ) : (
                        <Card className="border-charcoal-200 shadow-sm rounded-sm">
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-charcoal-500 uppercase bg-charcoal-50 border-b border-charcoal-200">
                                        <tr>
                                            <th className="px-6 py-4 font-bold tracking-wider">Property</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Type</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Verification</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listings.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-charcoal-500 font-medium">No properties found.</td></tr>
                                        ) : listings.map((item) => (
                                            <tr key={item.id} className="bg-white border-b border-charcoal-100 hover:bg-charcoal-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-charcoal-900">{item.title}</div>
                                                    <div className="text-xs text-charcoal-500 flex items-center mt-1">
                                                        <MapPin className="h-3 w-3 mr-1" /> {item.location || "Location unassigned"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-charcoal-700">{item.propertyType || "—"}</span>
                                                    {item.category && (
                                                        <span className="block text-[10px] uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-sm font-bold tracking-wide mt-1 w-fit">
                                                            {item.category}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.isVerified ? (
                                                        <Badge variant="verified" className="shadow-none"><ShieldCheck className="h-3 w-3 mr-1"/> TEPS Verified</Badge>
                                                    ) : (
                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-sm border border-amber-200">Unverified</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={getStatusVariant(item.status)} className="shadow-none">{item.status}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            onClick={() => openEditWizard(item)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleUnpublish(item)}
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Unpublish / delete listing"
                                                            className="h-8 w-8 text-charcoal-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => setDocsFor(item)} className="h-8 font-bold border-charcoal-200 shadow-none text-xs">
                                                            <FileText className="h-3.5 w-3.5 mr-1" /> Documents
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                    {deleteError && (
                        <div className="mt-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                            {deleteError}
                        </div>
                    )}
                </div>
            )}

            {/* Smart Listing Wizard Modal Overlay */}
            {wizardOpen && (
                <div className="fixed inset-0 bg-charcoal-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm pt-10 pb-10">
                    <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50 shrink-0">
                            <div>
                                <h3 className="font-heading font-bold text-xl text-charcoal-950 flex items-center gap-2">
                                    <Home className="h-5 w-5 text-brand-600" />
                                    {editingListing ? "Edit Listing" : "Smart Listing Wizard"}
                                </h3>
                                <p className="text-sm text-charcoal-500 font-medium mt-1">Step {wizardStep} of {WIZARD_STEPS}</p>
                            </div>
                            <button
                                onClick={closeWizard}
                                className="h-8 w-8 flex items-center justify-center rounded-sm bg-white border border-charcoal-200 text-charcoal-400 hover:text-charcoal-900 transition-colors shadow-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-charcoal-100 shrink-0">
                            <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${(wizardStep / WIZARD_STEPS) * 100}%` }}></div>
                        </div>

                        {/* Form Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white grow space-y-6">

                            {/* STEP 1: Core Details */}
                            {wizardStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-2">
                                        <h4 className="font-bold text-lg text-charcoal-900">Core Details</h4>
                                        <p className="text-sm text-charcoal-500">What kind of property are you listing?</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {["Rent", "Sale", "Rent-to-Own"].map((t) => (
                                            <div
                                                key={t}
                                                onClick={() => setWizardForm({ ...wizardForm, listingType: t })}
                                                className={`border-2 rounded-sm p-3 text-center cursor-pointer transition-colors ${wizardForm.listingType === t ? "border-brand-500 bg-brand-50" : "border-charcoal-200 hover:border-brand-500 hover:bg-brand-50"}`}
                                            >
                                                <span className={`font-bold text-sm ${wizardForm.listingType === t ? "text-brand-800" : "text-charcoal-800"}`}>{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property Title *</label>
                                        <input
                                            type="text"
                                            value={wizardForm.title}
                                            onChange={(e) => setWizardForm({ ...wizardForm, title: e.target.value })}
                                            placeholder="e.g. 2 Bedroom Semi-Detached House"
                                            className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm ${wizardForm.title.trim() === "" ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"}`}
                                        />
                                        {wizardForm.title.trim() === "" && (
                                            <p className="text-[11px] text-red-600 font-medium">Property title is required</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Description</label>
                                        <textarea
                                            rows={3}
                                            value={wizardForm.description}
                                            onChange={(e) => setWizardForm({ ...wizardForm, description: e.target.value })}
                                            placeholder="Detailed description of the property..."
                                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 resize-none shadow-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Region *</label>
                                            <select
                                                value={wizardForm.regionId}
                                                onChange={(e) => onRegionChange(Number(e.target.value))}
                                                className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm ${wizardForm.regionId === 0 ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"}`}
                                            >
                                                <option value={0} disabled>
                                                    {regions.loading ? "Loading regions…" : "Select region"}
                                                </option>
                                                {regions.data.map((r) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            {wizardForm.regionId === 0 && (
                                                <p className="text-[11px] text-red-600 font-medium">Region is required</p>
                                            )}
                                            {regions.error && (
                                                <p className="text-[11px] text-red-600 font-medium">{regions.error}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Constituency *</label>
                                            <select
                                                value={wizardForm.constituencyId}
                                                onChange={(e) => setWizardForm({ ...wizardForm, constituencyId: Number(e.target.value) })}
                                                disabled={wizardForm.regionId === 0}
                                                className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm disabled:bg-charcoal-50 disabled:text-charcoal-400 ${wizardForm.constituencyId === 0 ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"}`}
                                            >
                                                <option value={0} disabled>
                                                    {wizardForm.regionId === 0
                                                        ? "Select region first"
                                                        : constituencies.loading
                                                            ? "Loading…"
                                                            : "Select constituency"}
                                                </option>
                                                {constituencies.data.map((c) => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                            {wizardForm.constituencyId === 0 && wizardForm.regionId !== 0 && (
                                                <p className="text-[11px] text-red-600 font-medium">Constituency is required</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Location (City/Area) *</label>
                                        <div className={`rounded-sm ${wizardForm.location.trim() === "" ? "ring-1 ring-red-500" : ""}`}>
                                            <PhotonSearch
                                                value={wizardForm.location}
                                                onChange={(val, feat) => {
                                                    setWizardForm({ ...wizardForm, location: val });
                                                    if (feat?.properties.postcode) {
                                                        setWizardForm((prev) => ({
                                                            ...prev,
                                                            gpsCode: feat.properties.postcode ?? prev.gpsCode,
                                                        }));
                                                    }
                                                }}
                                                placeholder="Search location..."
                                            />
                                        </div>
                                        {wizardForm.location.trim() === "" && (
                                            <p className="text-[11px] text-red-600 font-medium">Location is required</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Ghana Post GPS Code</label>
                                        <input
                                            type="text"
                                            value={wizardForm.gpsCode}
                                            onChange={(e) => setWizardForm({ ...wizardForm, gpsCode: e.target.value })}
                                            placeholder="e.g. GA-182-9901"
                                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none text-charcoal-900 font-mono tracking-wide placeholder:font-sans shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Specifications & Afro-Features */}
                            {wizardStep === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-2">
                                        <h4 className="font-bold text-lg text-charcoal-900">Specifications</h4>
                                        <p className="text-sm text-charcoal-500">Key details about the property.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property Type *</label>
                                        <select
                                            value={wizardForm.propertyType}
                                            onChange={(e) => setWizardForm({ ...wizardForm, propertyType: e.target.value })}
                                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                        >
                                            <option value="House">House</option>
                                            <option value="Apartment">Apartment</option>
                                            <option value="Land">Land</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Mixed-Use">Mixed-Use</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Bedrooms</label>
                                            <div className="relative">
                                                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={wizardForm.bedrooms}
                                                    onChange={(e) => setWizardForm({ ...wizardForm, bedrooms: Number(e.target.value) })}
                                                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Bathrooms</label>
                                            <div className="relative">
                                                <Bath className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={wizardForm.bathrooms}
                                                    onChange={(e) => setWizardForm({ ...wizardForm, bathrooms: Number(e.target.value) })}
                                                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Size (Sqft)</label>
                                            <div className="relative">
                                                <Maximize2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={wizardForm.sqft || ""}
                                                    onChange={(e) => setWizardForm({ ...wizardForm, sqft: Number(e.target.value) })}
                                                    placeholder="Total area"
                                                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Year Built</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                                            <input
                                                type="number"
                                                min="1900"
                                                max={new Date().getFullYear() + 5}
                                                value={wizardForm.yearBuilt || ""}
                                                onChange={(e) => setWizardForm({ ...wizardForm, yearBuilt: Number(e.target.value) })}
                                                placeholder="e.g. 2020"
                                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-charcoal-100">
                                        <h4 className="font-bold text-lg text-charcoal-900">Afro-Feature Tags</h4>
                                        <p className="text-sm text-charcoal-500 mb-4">Select local value-add features that drive conversions in Ghana.</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {AFRO_FEATURES.map((feature) => {
                                                const checked = wizardForm.features.includes(feature);
                                                return (
                                                    <label key={feature} className="flex items-center gap-3 p-3 border border-charcoal-200 rounded-sm cursor-pointer hover:bg-charcoal-50 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 text-brand-600 rounded-sm border-charcoal-300 focus:ring-brand-500"
                                                            checked={checked}
                                                            onChange={() => toggleFeature(feature)}
                                                        />
                                                        <span className="text-sm font-semibold text-charcoal-800">{feature}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Pricing */}
                            {wizardStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-2">
                                        <h4 className="font-bold text-lg text-charcoal-900">Pricing</h4>
                                        <p className="text-sm text-charcoal-500">Set the price and payment terms.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Price (GH₵) *</label>
                                            <input
                                                type="number"
                                                value={wizardForm.price || ""}
                                                onChange={(e) => setWizardForm({ ...wizardForm, price: Number(e.target.value) })}
                                                className={`w-full bg-white border text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm ${wizardForm.price <= 0 ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"}`}
                                            />
                                            {wizardForm.price <= 0 && (
                                                <p className="text-[11px] text-red-600 font-medium">Price must be greater than 0</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Period</label>
                                            <select
                                                value={wizardForm.period}
                                                onChange={(e) => setWizardForm({ ...wizardForm, period: e.target.value })}
                                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                            >
                                                <option value="month">Per Month</option>
                                                <option value="year">Per Year</option>
                                                <option value="one-off">One-Off Sale</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Media Upload */}
                            {wizardStep === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-2">
                                        <h4 className="font-bold text-lg text-charcoal-900">Media Upload</h4>
                                        <p className="text-sm text-charcoal-500">Upload photos and visuals for the listing.</p>
                                    </div>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const picked = Array.from(e.target.files ?? []);
                                            setImageFiles((prev) => {
                                                const next = [...prev, ...picked];
                                                return next.length > 8 ? next.slice(0, 8) : next;
                                            });
                                            e.target.value = "";
                                        }}
                                    />
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => imageInputRef.current?.click()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                imageInputRef.current?.click();
                                            }
                                        }}
                                        className="border-2 border-dashed border-brand-300 bg-brand-50/50 rounded-sm p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-50 transition-colors text-center"
                                    >
                                        <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-brand-600 border border-brand-100">
                                            <Plus className="h-8 w-8" />
                                        </div>
                                        <p className="text-base font-bold text-charcoal-900 mb-1">Click to upload or drag and drop</p>
                                        <p className="text-sm text-charcoal-500 mb-4 max-w-sm mx-auto">PNG, JPG or GIF (max 10MB each). First image will be used as the cover. Up to 8 images.</p>
                                        <Button type="button" variant="outline" className="border-brand-200 font-bold bg-white shadow-sm text-brand-700">Browse Files</Button>
                                    </div>
                                    {imagePreviews.length > 0 && (
                                        <div className="mt-3 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                            {imagePreviews.map((src, i) => (
                                                <div key={src} className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
                                                    <img src={src} className="w-full h-full object-cover" alt={`upload-${i}`} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer hover:bg-charcoal-900/80 transition-colors"
                                                    >
                                                        <X className="h-3 w-3 text-white" />
                                                    </button>
                                                    {i === 0 && (
                                                        <div className="absolute bottom-0 left-0 w-full bg-brand-600 text-white text-[9px] font-bold text-center py-0.5 tracking-wide">COVER</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {publishError && (
                                        <p className="text-sm font-medium text-red-700">{publishError}</p>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Footer / Controls */}
                        <div className="p-5 border-t border-charcoal-100 bg-charcoal-50 shrink-0 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                            <Button
                                variant="ghost"
                                onClick={() => setWizardStep(wizardStep - 1)}
                                className={`font-bold text-charcoal-600 ${wizardStep === 1 ? "invisible" : ""}`}
                            >
                                Back
                            </Button>

                            {wizardStep < WIZARD_STEPS ? (
                                <Button
                                    onClick={() => {
                                        if (canContinue()) setWizardStep(wizardStep + 1);
                                    }}
                                    disabled={!canContinue()}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    onClick={editingListing ? handleSaveEdit : handlePublish}
                                    disabled={publishing}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {publishing ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4 mr-2" />
                                    )}
                                    {editingListing ? "Save Changes" : "Save & Request Verification"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {docsFor && (
                <OwnerDocumentsModal
                    propertyId={docsFor.id}
                    propertyTitle={docsFor.title}
                    onClose={() => setDocsFor(null)}
                />
            )}
        </div>
    );
}