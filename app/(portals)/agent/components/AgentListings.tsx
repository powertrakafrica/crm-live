"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, MapPin, UploadCloud, CheckCircle2, Globe, ShieldCheck, Home, Pencil, Trash2, Loader2, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhotonSearch } from "@/components/PhotonSearch";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { agentApi, geoApi, propertiesApi, uploadApi, fileProxyUrl } from "@/lib/api";
import type { GeoConstituency, GeoRegion } from "@/lib/coverage";

interface AgentImage {
    id: number;
    url: string;
    thumbUrl?: string | null;
    isPrimary: boolean;
    sortOrder: number;
}

// A locally-staged file awaiting upload on save. `preview` is an object URL
// (URL.createObjectURL) so the wizard can show a thumbnail before the file is
// sent to Spaces; it's revoked when the image is removed/cleared/saved.
interface StagedImage {
    file: File;
    preview: string;
}

interface AgentProperty {
    id: number;
    title: string;
    description?: string;
    location: string;
    category: string;
    propertyType: string;
    transactionType: string;
    price: number | string;
    status: string;
    verificationStatus: string;
    isVerified: boolean;
    regionId?: number;
    constituencyId?: number;
    district?: string;
    gpsLatitude?: string;
    gpsLongitude?: string;
    amenities?: string[];
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    viewsCount?: number;
    enquiriesCount?: number;
    images: AgentImage[];
}

// Backend `category` and `transactionType` share the same Rent/Sale/Rent-to-Own
// enum, so the wizard's single "listing type" choice feeds both. `propertyType`
// is the separate Apartment/Commercial/House/Land/Mixed-Use enum. The agent is
// the legal owner of listings they create (POST /properties forces ownerId :=
// the caller), so there is no owner-picker — the agent manages their own.
const LISTING_TYPES = ["Rent", "Sale", "Rent-to-Own"] as const;
const PROPERTY_TYPES = ["Land", "House", "Apartment", "Commercial", "Mixed-Use"] as const;

const EMPTY_FORM = {
    listingType: "Rent" as (typeof LISTING_TYPES)[number],
    title: "",
    description: "",
    price: "",
    propertyType: "Land" as (typeof PROPERTY_TYPES)[number],
    regionId: 0,
    constituencyId: 0,
    location: "",
    privacyMode: false,
    features: [] as string[],
    gpsLatitude: "",
    gpsLongitude: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    yearBuilt: "",
};

export function AgentListings() {
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardForm, setWizardForm] = useState(EMPTY_FORM);
    const [listings, setListings] = useState<AgentProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [regions, setRegions] = useState<GeoRegion[]>([]);
    const [constituencies, setConstituencies] = useState<GeoConstituency[]>([]);
    const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
    // Which staged photo is the primary listing photo (add flow only — when
    // editing, the existing primary is preserved). Defaults to the first photo.
    const [stagedPrimaryIndex, setStagedPrimaryIndex] = useState(0);
    const [editId, setEditId] = useState<number | null>(null);
    const [editImages, setEditImages] = useState<AgentImage[]>([]);
    const [saving, setSaving] = useState(false);
    // Confirmation-modal targets for the two destructive actions (archive a
    // property, remove an attached image). Both previously fired immediately
    // (archive used the native confirm(); image removal had no prompt at all).
    // The local staged-image removal (removeStaged) is intentionally NOT gated
    // — it's reversible and never hits the server.
    const [archiveTarget, setArchiveTarget] = useState<number | null>(null);
    const [removeImageTarget, setRemoveImageTarget] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadListings = useCallback(() => {
        setLoading(true);
        agentApi.myListings()
            .then((data: any) => setListings((data ?? []) as AgentProperty[]))
            .catch((err: any) => setError(err.message || "Failed to load listings"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadListings();
        // Region select is required (regionId is validated server-side), so load
        // the canonical list once for the wizard. Constituencies load per region.
        geoApi.regions().then((r) => setRegions(r)).catch(() => {});
    }, [loadListings]);

    function loadConstituencies(regionId: number) {
        if (!regionId) {
            setConstituencies([]);
            return;
        }
        geoApi.constituencies(regionId).then((c) => setConstituencies(c)).catch(() => setConstituencies([]));
    }

    // Map a listing row onto the wizard form for editing. Numeric regionId /
    // constituencyId come straight off the row; we also prime the constituency
    // select so the agent sees their current constituency without re-picking.
    function openEdit(p: AgentProperty) {
        setEditId(p.id);
        setEditImages(p.images ?? []);
        setConstituencies([]);
        resetStaged();
        setWizardForm({
            listingType: (LISTING_TYPES as readonly string[]).includes(p.transactionType) ? (p.transactionType as (typeof LISTING_TYPES)[number]) : "Rent",
            title: p.title ?? "",
            description: p.description ?? "",
            price: String(p.price ?? ""),
            propertyType: (PROPERTY_TYPES as readonly string[]).includes(p.propertyType) ? (p.propertyType as (typeof PROPERTY_TYPES)[number]) : "Land",
            regionId: p.regionId ?? 0,
            constituencyId: p.constituencyId ?? 0,
            location: p.location ?? "",
            privacyMode: false,
            features: p.amenities ?? [],
            gpsLatitude: p.gpsLatitude ?? "",
            gpsLongitude: p.gpsLongitude ?? "",
            bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
            bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
            sqft: p.sqft != null ? String(p.sqft) : "",
            yearBuilt: p.yearBuilt != null ? String(p.yearBuilt) : "",
        });
        if (p.regionId) loadConstituencies(p.regionId);
        setWizardStep(1);
    }

    function openCreate() {
        setEditId(null);
        setEditImages([]);
        resetStaged();
        setWizardForm(EMPTY_FORM);
        setConstituencies([]);
        setWizardStep(1);
    }

    function closeWizard() {
        resetStaged();
        setWizardStep(0);
        setEditId(null);
        setEditImages([]);
    }

    // Revoke all staged object URLs and clear the staged state. Called on
    // cancel/close and after a successful save to avoid leaking blob URLs.
    function resetStaged() {
        stagedImages.forEach((s) => URL.revokeObjectURL(s.preview));
        setStagedImages([]);
        setStagedPrimaryIndex(0);
    }

    // Remove one staged image, revoking its preview URL and keeping the
    // primary index pointing at a valid slot (fall back to the first photo).
    function removeStaged(idx: number) {
        const removed = stagedImages[idx];
        if (removed) URL.revokeObjectURL(removed.preview);
        setStagedImages((prev) => prev.filter((_, i) => i !== idx));
        setStagedPrimaryIndex((pi) => (pi === idx ? 0 : pi > idx ? pi - 1 : pi));
    }

    // Archives the property after the user confirms in the ConfirmDialog.
    // Replaces the old native confirm() — the modal is the only gate now.
    async function confirmArchive() {
        if (archiveTarget == null) return;
        setDeleting(true);
        try {
            await propertiesApi.delete(archiveTarget);
            setListings((prev) => prev.filter((l) => l.id !== archiveTarget));
            setArchiveTarget(null);
        } catch (err: any) {
            setError(err.message || "Delete failed");
        } finally {
            setDeleting(false);
        }
    }

    // Removes an attached image after the user confirms in the ConfirmDialog.
    // Previously this fired immediately on click with no prompt.
    async function confirmRemoveImage() {
        if (!editId || removeImageTarget == null) return;
        setDeleting(true);
        try {
            await propertiesApi.deleteImage(editId, removeImageTarget);
            setEditImages((prev) => prev.filter((i) => i.id !== removeImageTarget));
            setRemoveImageTarget(null);
        } catch (err: any) {
            setError(err.message || "Failed to remove image");
        } finally {
            setDeleting(false);
        }
    }

    const regionName = regions.find((r) => r.id === wizardForm.regionId)?.name ?? "";
    const constituencyName = constituencies.find((c) => c.id === wizardForm.constituencyId)?.name ?? "";

    const formValid =
        wizardForm.title.trim() !== "" &&
        wizardForm.description.trim() !== "" &&
        wizardForm.price !== "" && Number(wizardForm.price) > 0 &&
        wizardForm.regionId > 0 &&
        wizardForm.constituencyId > 0;

    function buildPayload(): Record<string, unknown> {
        const lt = wizardForm.listingType;
        const location = wizardForm.location.trim() || [regionName, constituencyName].filter(Boolean).join(", ");
        const payload: Record<string, unknown> = {
            title: wizardForm.title.trim(),
            description: wizardForm.description.trim(),
            price: Number(wizardForm.price),
            location,
            category: lt,
            transactionType: lt,
            propertyType: wizardForm.propertyType,
            regionId: wizardForm.regionId,
            constituencyId: wizardForm.constituencyId,
            amenities: wizardForm.features,
        };
        if (wizardForm.gpsLatitude) payload.gpsLatitude = wizardForm.gpsLatitude;
        if (wizardForm.gpsLongitude) payload.gpsLongitude = wizardForm.gpsLongitude;
        if (wizardForm.bedrooms !== "") payload.bedrooms = Number(wizardForm.bedrooms);
        if (wizardForm.bathrooms !== "") payload.bathrooms = Number(wizardForm.bathrooms);
        if (wizardForm.sqft !== "") payload.sqft = Number(wizardForm.sqft);
        if (wizardForm.yearBuilt !== "") payload.yearBuilt = Number(wizardForm.yearBuilt);
        return payload;
    }

    async function handleSave() {
        if (!formValid) return;
        setSaving(true);
        setError("");
        try {
            const payload = buildPayload();
            let propertyId: number;
            if (editId) {
                await propertiesApi.update(editId, payload);
                propertyId = editId;
            } else {
                const created: any = await propertiesApi.create(payload);
                propertyId = created.id;
            }
            // Attach newly staged images (direct-to-Spaces upload to the public
            // `images` folder, then register the URL on the property). The
            // agent-selected primary photo (stagedPrimaryIndex) becomes the
            // listing photo when there are no existing images yet.
            for (let i = 0; i < stagedImages.length; i++) {
                const { publicUrl } = await uploadApi.uploadFile(stagedImages[i].file, "images");
                await propertiesApi.addImage(propertyId, {
                    url: publicUrl,
                    isPrimary: i === stagedPrimaryIndex && editImages.length === 0,
                    sortOrder: editImages.length + i,
                });
            }
            loadListings();
            closeWizard();
        } catch (err: any) {
            setError(err.message || "Save failed");
        } finally {
            setSaving(false);
        }
    }

    const getStatusVariant = (status: string) => {
        if (status === "Live") return "verified";
        if (status === "Pending") return "secondary";
        return "default";
    };

    const totalMedia = editImages.length + stagedImages.length;

    return (
        <div className="space-y-6">

            {/* Standard Dashboard View */}
            {wizardStep === 0 && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-charcoal-950">My Listings</h2>
                            <p className="text-charcoal-500 font-medium">Create and manage the properties you list as an agent.</p>
                        </div>
                        <Button onClick={openCreate} className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm h-11 px-6">
                            <Plus className="h-5 w-5 mr-2" /> List New Property
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700 mb-4">{error}</div>
                    )}

                    {loading ? (
                        <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                            <p className="text-charcoal-500 font-medium">Loading listings...</p>
                        </div>
                    ) : (
                        <Card className="border-charcoal-200 shadow-sm rounded-sm">
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-charcoal-500 uppercase bg-charcoal-50 border-b border-charcoal-200">
                                        <tr>
                                            <th className="px-6 py-4 font-bold tracking-wider">Property</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Type</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                                            <th className="px-6 py-4 font-bold tracking-wider">Verification</th>
                                            <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listings.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-charcoal-500 font-medium">No listings yet. Click &quot;List New Property&quot; to create one.</td></tr>
                                        ) : listings.map((item) => (
                                            <tr key={item.id} className="bg-white border-b border-charcoal-100 hover:bg-charcoal-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-charcoal-900">{item.title}</div>
                                                    <div className="text-xs text-charcoal-500 flex items-center mt-1">
                                                        <MapPin className="h-3 w-3 mr-1" /> {item.location}
                                                    </div>
                                                    <div className="text-xs text-charcoal-500 mt-1 flex items-center gap-3">
                                                        <span className="flex items-center"><Eye className="h-3 w-3 mr-1" />{item.viewsCount ?? 0}</span>
                                                        <span className="text-brand-600 font-bold">{item.enquiriesCount ?? 0} leads</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-charcoal-700">{item.propertyType}</span>
                                                    <div className="text-xs text-charcoal-500">{item.category}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={getStatusVariant(item.status)} className="shadow-none">{item.status}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.isVerified ? (
                                                        <Badge variant="verified" className="shadow-none"><ShieldCheck className="h-3 w-3 mr-1"/> Verified</Badge>
                                                    ) : (
                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-sm border border-amber-200">{item.verificationStatus || "Unverified"}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            title="Edit"
                                                            onClick={() => openEdit(item)}
                                                            className="h-8 w-8 flex items-center justify-center rounded-sm border border-charcoal-200 bg-white text-charcoal-600 hover:bg-charcoal-50 hover:text-brand-600 transition-colors"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Archive"
                                                            onClick={() => setArchiveTarget(item.id)}
                                                            className="h-8 w-8 flex items-center justify-center rounded-sm border border-charcoal-200 bg-white text-charcoal-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Listing Wizard Modal Overlay */}
            {wizardStep > 0 && (
                <div className="fixed inset-0 bg-charcoal-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm pt-10 pb-10">
                    <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50 shrink-0">
                            <div>
                                <h3 className="font-heading font-bold text-xl text-charcoal-950 flex items-center gap-2">
                                    <Home className="h-5 w-5 text-brand-600" />
                                    {editId ? "Edit Listing" : "List New Property"}
                                </h3>
                                <p className="text-sm text-charcoal-500 font-medium mt-1">Step {wizardStep} of 4</p>
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
                            <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }}></div>
                        </div>

                        {error && (
                            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-sm p-3 text-sm font-medium text-red-700">{error}</div>
                        )}

                        {/* Form Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white grow">

                            {/* STEP 1: Core Details */}
                            {wizardStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg text-charcoal-900">Core Details</h4>
                                        <p className="text-sm text-charcoal-500">What kind of property are you listing?</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {LISTING_TYPES.map((t) => (
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
                                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Description *</label>
                                        <textarea
                                            value={wizardForm.description}
                                            onChange={(e) => setWizardForm({ ...wizardForm, description: e.target.value })}
                                            placeholder="Describe the property, surroundings, and key selling points..."
                                            rows={3}
                                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Price (GH₵) *</label>
                                            <input
                                                type="number"
                                                value={wizardForm.price}
                                                onChange={(e) => setWizardForm({ ...wizardForm, price: e.target.value })}
                                                placeholder="5000"
                                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property Type *</label>
                                            <select
                                                value={wizardForm.propertyType}
                                                onChange={(e) => setWizardForm({ ...wizardForm, propertyType: e.target.value as (typeof PROPERTY_TYPES)[number] })}
                                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                            >
                                                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {/* Optional specs — agents capture richer detail than owners. */}
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Beds</label>
                                            <input type="number" min="0" value={wizardForm.bedrooms} onChange={(e) => setWizardForm({ ...wizardForm, bedrooms: e.target.value })} placeholder="0" className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Baths</label>
                                            <input type="number" min="0" value={wizardForm.bathrooms} onChange={(e) => setWizardForm({ ...wizardForm, bathrooms: e.target.value })} placeholder="0" className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Sqft</label>
                                            <input type="number" min="0" value={wizardForm.sqft} onChange={(e) => setWizardForm({ ...wizardForm, sqft: e.target.value })} placeholder="0" className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Year</label>
                                            <input type="number" min="1900" value={wizardForm.yearBuilt} onChange={(e) => setWizardForm({ ...wizardForm, yearBuilt: e.target.value })} placeholder="2020" className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Geographic Pinning */}
                            {wizardStep === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg text-charcoal-900">Geographic Pinning</h4>
                                        <p className="text-sm text-charcoal-500">Where exactly is this located?</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Region *</label>
                                            <select
                                                value={wizardForm.regionId}
                                                onChange={(e) => {
                                                    const regionId = Number(e.target.value);
                                                    setWizardForm({ ...wizardForm, regionId, constituencyId: 0 });
                                                    loadConstituencies(regionId);
                                                }}
                                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm"
                                            >
                                                <option value={0}>Select region...</option>
                                                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Constituency *</label>
                                            <select
                                                value={wizardForm.constituencyId}
                                                onChange={(e) => setWizardForm({ ...wizardForm, constituencyId: Number(e.target.value) })}
                                                disabled={wizardForm.regionId === 0}
                                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm disabled:opacity-50"
                                            >
                                                <option value={0}>Select constituency...</option>
                                                {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Search Location (optional)</label>
                                        <PhotonSearch
                                            value={wizardForm.location}
                                            onChange={(val, feat) => {
                                                setWizardForm((prev) => ({
                                                    ...prev,
                                                    location: val || prev.location,
                                                    ...(feat?.geometry?.coordinates ? {
                                                        gpsLongitude: String(feat.geometry.coordinates[0]),
                                                        gpsLatitude: String(feat.geometry.coordinates[1]),
                                                    } : {}),
                                                }));
                                            }}
                                            placeholder="Type an area, landmark, or address to pin GPS..."
                                        />
                                        {(wizardForm.gpsLatitude || wizardForm.gpsLongitude) && (
                                            <p className="text-[11px] text-charcoal-500 font-medium">
                                                Pinned GPS: {wizardForm.gpsLatitude}, {wizardForm.gpsLongitude}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-charcoal-50 border border-charcoal-200 rounded-sm p-4 flex items-start gap-3">
                                        <div className="shrink-0 pt-0.5">
                                            <div
                                                className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${wizardForm.privacyMode ? "bg-brand-600" : "bg-charcoal-300"}`}
                                                onClick={() => setWizardForm({ ...wizardForm, privacyMode: !wizardForm.privacyMode })}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${wizardForm.privacyMode ? "translate-x-5" : "translate-x-0"}`}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">Enable Privacy Mode <Globe className="h-3 w-3 text-charcoal-400" /></h5>
                                            <p className="text-xs text-charcoal-500 mt-1">Hide exact location from the public. Displays a 500m &quot;fuzzy&quot; radius instead. TEPS verified agents still get the exact pin.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Afro-Feature Tags */}
                            {wizardStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg text-charcoal-900">Afro-Feature Tags</h4>
                                        <p className="text-sm text-charcoal-500">Select local value-add features that drive conversions in Ghana. Saved as the listing amenities.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Walled & Gated', 'Borehole Access', 'Prepaid Meter', 'Constant Water Flow', 'Proximity to Trotro', 'Tarred Road Access', 'Registered Land Title', 'Security Guard Post'].map((feature) => {
                                            const checked = wizardForm.features.includes(feature);
                                            return (
                                                <label key={feature} className="flex items-center gap-3 p-3 border border-charcoal-200 rounded-sm cursor-pointer hover:bg-charcoal-50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 text-brand-600 rounded-sm border-charcoal-300 focus:ring-brand-500"
                                                        checked={checked}
                                                        onChange={() => {
                                                            const next = checked
                                                                ? wizardForm.features.filter((f) => f !== feature)
                                                                : [...wizardForm.features, feature];
                                                            setWizardForm({ ...wizardForm, features: next });
                                                        }}
                                                    />
                                                    <span className="text-sm font-semibold text-charcoal-800">{feature}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Media Upload */}
                            {wizardStep === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg text-charcoal-900">Media Upload</h4>
                                        <p className="text-sm text-charcoal-500">Upload photos, then tap a preview to mark the primary listing photo.</p>
                                    </div>

                                    {editImages.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {editImages.map((img) => (
                                                <div key={img.id} className="relative group">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={fileProxyUrl(img.thumbUrl || img.url)}
                                                        alt=""
                                                        className="w-full h-24 object-cover rounded-sm border border-charcoal-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setRemoveImageTarget(img.id)}
                                                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Remove"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                    {img.isPrimary && (
                                                        <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-sm">Primary</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <label
                                        className="border-2 border-dashed border-brand-300 bg-brand-50/50 rounded-sm p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-50 transition-colors text-center"
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files ?? []);
                                                const staged = files.map((file) => ({
                                                    file,
                                                    preview: URL.createObjectURL(file),
                                                }));
                                                setStagedImages((prev) => [...prev, ...staged]);
                                                e.target.value = "";
                                            }}
                                        />
                                        <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-brand-600 border border-brand-100">
                                            <UploadCloud className="h-8 w-8" />
                                        </div>
                                        <p className="text-base font-bold text-charcoal-900 mb-1">Drag and drop or click to browse</p>
                                        <p className="text-sm text-charcoal-500 max-w-sm mx-auto">Upload standard photos of the property. They are stored securely and attached on save.</p>
                                    </label>

                                    {stagedImages.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    <span className="text-sm font-bold text-charcoal-900">
                                                        {stagedImages.length} new photo{stagedImages.length > 1 ? "s" : ""} ready for upload
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={resetStaged}
                                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                                >
                                                    Clear all
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {stagedImages.map((img, i) => (
                                                    <div key={img.preview} className="relative group">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={img.preview}
                                                            alt=""
                                                            className="w-full h-24 object-cover rounded-sm border border-charcoal-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeStaged(i)}
                                                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Remove"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                        {/* Primary selection — only meaningful when there are no
                                                            existing photos (add flow). When editing, the existing
                                                            primary is preserved and new photos are supplementary. */}
                                                        {editImages.length === 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setStagedPrimaryIndex(i)}
                                                                title="Set as primary listing photo"
                                                                className={`absolute bottom-1 left-1 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm transition-colors ${
                                                                    i === stagedPrimaryIndex
                                                                        ? "bg-brand-600 text-white"
                                                                        : "bg-white/90 text-charcoal-600 hover:bg-brand-50"
                                                                }`}
                                                            >
                                                                <Star className={`h-2.5 w-2.5 ${i === stagedPrimaryIndex ? "fill-white" : ""}`} />
                                                                {i === stagedPrimaryIndex ? "Primary" : "Set primary"}
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {totalMedia === 0 && (
                                        <p className="text-xs text-charcoal-500 font-medium text-center">No photos added yet — you can save and add them later from Edit.</p>
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

                            {wizardStep < 4 ? (
                                <Button
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm"
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !formValid}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                    {editId ? "Save Changes" : "Save & Publish Draft"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Archive-property confirmation */}
            <ConfirmDialog
                isOpen={archiveTarget != null}
                onClose={() => setArchiveTarget(null)}
                onConfirm={confirmArchive}
                busy={deleting}
                title="Archive Property"
                confirmLabel="Archive"
                message="Archive this property? It will be removed from public listings but retained for your records."
            />

            {/* Remove-image confirmation (attached images only — staged/draft
                image removal is local + reversible, so it stays ungated). */}
            <ConfirmDialog
                isOpen={removeImageTarget != null}
                onClose={() => setRemoveImageTarget(null)}
                onConfirm={confirmRemoveImage}
                busy={deleting}
                title="Remove Image"
                confirmLabel="Remove"
                message="Remove this image from the property?"
            />
        </div>
    );
}