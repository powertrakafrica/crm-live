"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Briefcase, Heart, CheckCircle2, Clock, Save, MessageSquare,
    UserCircle2, Phone, ArrowRight, Trash2, Loader2, Calendar, Wallet, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import PropertyCard from "@/components/PropertyCard";
import { imageVariantUrl } from "@/lib/images";
import { clientApi } from "@/lib/api";

// Booking statuses (booking_status enum): Pending, Confirmed, Completed,
// Cancelled, NoShow. The old version only handled Pending/Confirmed/Completed
// and mapped everything else to "Payment Confirmed" — so a Cancelled/NoShow
// booking still rendered a cheerful green "Report Delivered"-bound timeline.
// Now terminal states get their own banner; the linear progress only models
// the happy path Requested → Confirmed → Completed.
type BookingStatus = "Cancelled" | "Completed" | "Confirmed" | "NoShow" | "Pending";

interface ServiceRequest {
    id: number;
    propertyId: number;
    propertyTitle: string | null;
    propertyLocation: string | null;
    serviceType: string;
    status: BookingStatus;
    scheduledDate: string;
    scheduledTime: string | null;
    date: string;
    agentId: number | null;
    agentName: string | null;
    agentPhone: string | null;
    paymentStatus: string;
    viewingFee: number;
    notes: string | null;
}

interface SavedProperty {
    id: number;
    title: string;
    price?: number;
    pricePeriod?: "month" | "year" | "one-off";
    location: string;
    bedrooms?: number;
    bathrooms?: number;
    isVerified?: boolean;
    category?: "Rent" | "Sale" | "Rent-to-Own";
    images?: { url: string; thumbUrl?: string | null; listingUrl?: string | null; galleryUrl?: string | null }[];
    note: string | null;
    savedAt: string;
}

const PROGRESS_STEPS = ["Requested", "Confirmed", "Completed"] as const;

function statusBadge(status: BookingStatus): { label: string; className: string } {
    switch (status) {
        case "Completed": return { label: "Completed", className: "bg-green-100 text-green-700" };
        case "Confirmed": return { label: "Confirmed", className: "bg-blue-100 text-blue-700" };
        case "Pending": return { label: "Awaiting confirmation", className: "bg-amber-100 text-amber-700" };
        case "Cancelled": return { label: "Cancelled", className: "bg-red-100 text-red-700" };
        case "NoShow": return { label: "No-show", className: "bg-charcoal-200 text-charcoal-700" };
        default: return { label: status, className: "bg-charcoal-100 text-charcoal-700" };
    }
}

// Progress step reached on the happy path. Cancelled/NoShow short-circuit before.
function progressIndex(status: BookingStatus): number {
    if (status === "Completed") return 2;
    if (status === "Confirmed") return 1;
    return 0; // Pending
}

function dialable(phone: string | null): string | null {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("0")) digits = "233" + digits.slice(1);
    return digits;
}

export function ClientDashboard() {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
    const [savedLoading, setSavedLoading] = useState(true);
    // note drafts in flight + which property's textarea is open.
    const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
    const [editingNote, setEditingNote] = useState<number | null>(null);
    const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
    const [removingId, setRemovingId] = useState<number | null>(null);
    // Confirmation-modal target for "Remove from Vault" (previously fired
    // immediately on click with no prompt). The actual delete reuses
    // removeSaved, which already drives the per-card spinner via removingId.
    const [removeTarget, setRemoveTarget] = useState<number | null>(null);

    const loadRequests = useCallback(async () => {
        try {
            const data: any = await clientApi.serviceRequests();
            const bookings: ServiceRequest[] = (data.bookings ?? []).map((b: any) => ({
                id: b.id,
                propertyId: b.propertyId,
                propertyTitle: b.propertyTitle ?? null,
                propertyLocation: b.propertyLocation ?? null,
                serviceType: "Guided Viewing",
                status: (b.status ?? "Pending") as BookingStatus,
                scheduledDate: b.scheduledDate ? new Date(b.scheduledDate).toLocaleString() : "N/A",
                scheduledTime: b.scheduledTime ?? null,
                date: b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "N/A",
                agentId: b.agentId ?? null,
                agentName: b.agentName ?? null,
                agentPhone: b.agentPhone ?? null,
                paymentStatus: b.paymentStatus ?? "Pending",
                viewingFee: b.viewingFee ?? 0,
                notes: b.notes ?? null,
            }));
            setRequests(bookings);
        } catch (err: any) {
            setError(err.message || "Failed to load service requests");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSaved = useCallback(async () => {
        try {
            const data: any = await clientApi.savedProperties();
            const mapped: SavedProperty[] = (data ?? []).map((item: any) => ({
                id: item.id,
                title: item.title,
                price: item.price,
                pricePeriod: item.pricePeriod,
                location: item.location,
                bedrooms: item.bedrooms,
                bathrooms: item.bathrooms,
                isVerified: item.isVerified,
                category: item.category,
                images: item.images,
                note: item.note ?? null,
                savedAt: item.savedAt,
            }));
            setSavedProperties(mapped);
        } catch {
            setSavedProperties([]);
        } finally {
            setSavedLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
        loadSaved();
    }, [loadRequests, loadSaved]);

    async function saveNote(propertyId: number) {
        const draft = noteDraft[propertyId] ?? "";
        setSavingNoteId(propertyId);
        try {
            await clientApi.updateNote(propertyId, draft || null);
            setSavedProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, note: draft || null } : p)));
            setEditingNote(null);
        } catch {
            // leave the draft in place so the user can retry; surface inline.
        } finally {
            setSavingNoteId(null);
        }
    }

    async function removeSaved(propertyId: number) {
        setRemovingId(propertyId);
        try {
            await clientApi.removeSavedProperty(propertyId);
            setSavedProperties((prev) => prev.filter((p) => p.id !== propertyId));
        } catch {
            // best-effort; keep the card so the user can retry.
        } finally {
            setRemovingId(null);
        }
    }

    // Runs the Vault removal after the user confirms in the ConfirmDialog.
    // Reuses removeSaved (which manages the spinner + list update); closes the
    // modal once the request settles. `busy` is wired to removingId so the
    // confirm button shows a spinner while the DELETE is in flight.
    async function confirmRemove() {
        if (removeTarget == null) return;
        await removeSaved(removeTarget);
        setRemoveTarget(null);
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Your Dashboard</h2>
                <p className="text-charcoal-500 font-medium mt-1">Track your active service requests and manage your saved properties.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Active Cases */}
                <div className="xl:col-span-8 space-y-6">
                    <h3 className="text-xl font-heading font-bold flex items-center gap-2 text-charcoal-950 px-1">
                        <Briefcase className="h-5 w-5 text-brand-600" />
                        Active Service Requests
                        {requests.length > 0 && (
                            <span className="text-sm font-bold text-charcoal-400">{requests.length}</span>
                        )}
                    </h3>

                    {loading ? (
                        <div className="space-y-4">
                            {[0, 1].map((i) => (
                                <div key={i} className="bg-white border border-charcoal-200 rounded-sm p-6 animate-pulse">
                                    <div className="h-4 w-32 bg-charcoal-100 rounded mb-3" />
                                    <div className="h-6 w-48 bg-charcoal-100 rounded mb-2" />
                                    <div className="h-3 w-24 bg-charcoal-100 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white border border-dashed border-charcoal-300 rounded-sm p-10 text-center">
                            <Briefcase className="h-10 w-10 text-charcoal-300 mx-auto mb-3" />
                            <p className="text-charcoal-600 font-bold">No active service requests</p>
                            <p className="text-sm text-charcoal-500 mt-1 mb-4">Book a guided viewing from the Marketplace to track it here.</p>
                            <Link href="/client" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800">
                                Browse Marketplace <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {requests.map((request) => {
                                const st = statusBadge(request.status);
                                const isTerminal = request.status === "Cancelled" || request.status === "NoShow";
                                const currentStep = progressIndex(request.status);
                                const dial = dialable(request.agentPhone);
                                return (
                                    <div key={request.id} className="bg-white border border-charcoal-200 rounded-sm shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-charcoal-100 bg-charcoal-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <Badge className="bg-brand-100 text-brand-700 shadow-none border-none font-bold uppercase tracking-wider text-[10px]">
                                                        SR-{request.id}
                                                    </Badge>
                                                    <Badge className={`${st.className} border-none shadow-none font-bold text-[10px] uppercase tracking-wider`}>
                                                        {st.label}
                                                    </Badge>
                                                    <span className="text-xs text-charcoal-500 font-medium flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" /> {request.date}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-charcoal-900 text-lg truncate">{request.serviceType}</h4>
                                                {request.propertyTitle
                                                    ? <p className="text-sm font-medium text-charcoal-600 mt-0.5 truncate">{request.propertyTitle}</p>
                                                    : <p className="text-sm font-medium text-charcoal-400 mt-0.5">Property details unavailable</p>}
                                                {request.propertyLocation && (
                                                    <p className="text-xs text-charcoal-500 mt-0.5">{request.propertyLocation}</p>
                                                )}
                                            </div>
                                            <Link href={`/property/${request.propertyId}`} className="shrink-0">
                                                <Button variant="outline" className="h-9 font-bold text-xs bg-white text-charcoal-700 hover:bg-charcoal-50">
                                                    Open Case Details <ArrowRight className="h-3 w-3 ml-1" />
                                                </Button>
                                            </Link>
                                        </div>

                                        <div className="p-6 sm:p-8">
                                            {/* Terminal state banner instead of a misleading happy-path timeline. */}
                                            {isTerminal ? (
                                                <div className={`flex items-center gap-3 p-4 rounded-sm border ${request.status === "Cancelled" ? "bg-red-50 border-red-200 text-red-800" : "bg-charcoal-50 border-charcoal-200 text-charcoal-700"}`}>
                                                    <XCircle className="h-5 w-5 shrink-0" />
                                                    <div className="text-sm font-medium">
                                                        This viewing was {request.status === "Cancelled" ? "cancelled" : "marked as a no-show"}.
                                                        {request.notes && <span className="block text-charcoal-500 mt-0.5">{request.notes}</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-2 sm:gap-4">
                                                    {PROGRESS_STEPS.map((step, index) => {
                                                        const reached = index <= currentStep;
                                                        const isCurrent = index === currentStep;
                                                        return (
                                                            <div key={step} className="flex-1 flex items-center">
                                                                <div className="flex flex-col items-center gap-2 min-w-0">
                                                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors ${reached ? "border-brand-600 bg-brand-600 text-white" : "border-charcoal-200 bg-white text-charcoal-300"} ${isCurrent ? "ring-4 ring-brand-100" : ""}`}>
                                                                        {reached ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                                                                    </div>
                                                                    <span className={`text-[11px] sm:text-xs font-bold text-center ${isCurrent ? "text-brand-700" : reached ? "text-charcoal-700" : "text-charcoal-400"}`}>{step}</span>
                                                                </div>
                                                                {index < PROGRESS_STEPS.length - 1 && (
                                                                    <div className={`h-0.5 flex-1 mx-1 sm:mx-2 -mt-5 ${index < currentStep ? "bg-brand-600" : "bg-charcoal-200"}`} />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Details + agent row */}
                                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="bg-charcoal-50 rounded-sm p-3 border border-charcoal-100">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-charcoal-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Scheduled</p>
                                                    <p className="text-sm font-bold text-charcoal-800 mt-1">{request.scheduledDate}</p>
                                                </div>
                                                <div className="bg-charcoal-50 rounded-sm p-3 border border-charcoal-100">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-charcoal-500 flex items-center gap-1"><Wallet className="h-3 w-3" /> Viewing Fee</p>
                                                    <p className="text-sm font-bold text-charcoal-800 mt-1">GH₵ {request.viewingFee.toLocaleString()} <span className="text-charcoal-500 font-medium">· {request.paymentStatus}</span></p>
                                                </div>
                                                <div className="bg-charcoal-50 rounded-sm p-3 border border-charcoal-100">
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-charcoal-500 flex items-center gap-1"><UserCircle2 className="h-3 w-3" /> Agent</p>
                                                    <p className="text-sm font-bold text-charcoal-800 mt-1">{request.agentName ?? "Not yet assigned"}</p>
                                                </div>
                                            </div>

                                            {request.agentName && (
                                                <div className="mt-4 flex items-center gap-3 p-3 bg-brand-50 rounded-sm border border-brand-100">
                                                    <UserCircle2 className="h-8 w-8 text-brand-600 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-charcoal-500 uppercase font-bold tracking-wider">Assigned Agent</p>
                                                        <p className="font-bold text-brand-900 text-sm truncate">{request.agentName}</p>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-2 shrink-0">
                                                        {dial ? (
                                                            <>
                                                                <a href={`https://wa.me/${dial}?text=${encodeURIComponent(`Hello ${request.agentName}, I have a question about my viewing of "${request.propertyTitle ?? "my property"}" (SR-${request.id}).`)}`} target="_blank" rel="noreferrer">
                                                                    <Button size="sm" className="h-8 px-3 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white border-none">
                                                                        <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                                                                    </Button>
                                                                </a>
                                                                <a href={`tel:${request.agentPhone!.replace(/\s/g, "")}`}>
                                                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-brand-200 text-brand-700 bg-white">
                                                                        <Phone className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </a>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-charcoal-400 italic">No phone on file</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: The "Vault" */}
                <div className="xl:col-span-4 space-y-6">
                    <h3 className="text-xl font-heading font-bold flex items-center gap-2 text-charcoal-950 px-1">
                        <Heart className="h-5 w-5 text-rose-500" fill="currentColor" />
                        The Vault
                        {savedProperties.length > 0 && (
                            <span className="text-sm font-bold text-charcoal-400">{savedProperties.length}</span>
                        )}
                    </h3>

                    <div className="space-y-6">
                        {savedLoading ? (
                            <div className="space-y-4">
                                {[0, 1].map((i) => (
                                    <div key={i} className="bg-white border border-charcoal-200 rounded-sm p-4 animate-pulse">
                                        <div className="h-24 w-full bg-charcoal-100 rounded mb-3" />
                                        <div className="h-4 w-32 bg-charcoal-100 rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : savedProperties.length === 0 ? (
                            <div className="bg-white border border-dashed border-charcoal-300 rounded-sm p-8 text-center">
                                <Heart className="h-8 w-8 text-charcoal-300 mx-auto mb-3" />
                                <p className="text-charcoal-600 font-bold">No saved properties yet</p>
                                <p className="text-sm text-charcoal-500 mt-1">Save properties from Discovery to keep them here with your private notes.</p>
                            </div>
                        ) : savedProperties.map((property) => (
                            <div key={property.id} className="bg-white border border-charcoal-200 rounded-sm shadow-sm p-4 relative overflow-hidden group">
                                <PropertyCard
                                    id={String(property.id)}
                                    title={property.title}
                                    price={`GH₵ ${property.price?.toLocaleString() ?? "0"}`}
                                    pricePeriod={property.pricePeriod ?? "one-off"}
                                    location={property.location}
                                    bedrooms={property.bedrooms ?? 0}
                                    bathrooms={property.bathrooms ?? 0}
                                    imageUrl={imageVariantUrl(property.images?.[0], "thumb") ?? "/placeholder.jpg"}
                                    isVerified={property.isVerified ?? false}
                                    category={property.category ?? "Sale"}
                                />

                                <div className="mt-4 pt-4 border-t border-charcoal-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-charcoal-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <MessageSquare className="h-3 w-3" /> Private Note
                                        </h5>
                                        <div className="flex items-center gap-2">
                                            {editingNote !== property.id && (
                                                <button onClick={() => { setEditingNote(property.id); setNoteDraft((d) => ({ ...d, [property.id]: property.note ?? "" })); }} className="text-brand-600 text-xs font-bold hover:underline">
                                                    {property.note ? "Edit" : "Add"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setRemoveTarget(property.id)}
                                                disabled={removingId === property.id}
                                                title="Remove from Vault"
                                                className="text-charcoal-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {removingId === property.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                            </button>
                                        </div>
                                    </div>

                                    {editingNote === property.id ? (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <textarea
                                                autoFocus
                                                value={noteDraft[property.id] ?? ""}
                                                onChange={(e) => setNoteDraft((d) => ({ ...d, [property.id]: e.target.value }))}
                                                className="w-full text-sm p-2 bg-charcoal-50 border border-brand-300 rounded-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                                rows={3}
                                                placeholder="Add your private thoughts here..."
                                            />
                                            <div className="flex justify-end mt-2 gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setEditingNote(null)} className="h-7 text-xs font-bold text-charcoal-600">
                                                    Cancel
                                                </Button>
                                                <Button size="sm" onClick={() => saveNote(property.id)} disabled={savingNoteId === property.id} className="h-7 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white px-4">
                                                    {savingNoteId === property.id ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Save className="h-3 w-3 mr-1.5" />} Save
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => { setEditingNote(property.id); setNoteDraft((d) => ({ ...d, [property.id]: property.note ?? "" })); }}
                                            className={`text-sm p-3 rounded-sm cursor-pointer border transition-colors ${property.note ? "bg-amber-50/50 text-charcoal-800 border-transparent" : "bg-charcoal-50 border-dashed border-charcoal-200 text-charcoal-400 italic hover:border-brand-300 hover:bg-brand-50"}`}
                                        >
                                            {property.note || "Click to add a private note about this property..."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Remove-from-Vault confirmation */}
            <ConfirmDialog
                isOpen={removeTarget != null}
                onClose={() => setRemoveTarget(null)}
                onConfirm={confirmRemove}
                busy={removingId != null}
                title="Remove from Vault"
                confirmLabel="Remove"
                message="Remove this saved property from your Vault?"
            />
        </div>
    );
}