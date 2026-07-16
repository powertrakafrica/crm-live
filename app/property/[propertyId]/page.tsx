"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bed, Bath, Share, Heart, MapPin, Maximize2, Calendar, Loader2, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import VerificationPanel from "@/components/VerificationPanel";
import CheckoutModal from "@/components/CheckoutModal";
import { feeApi, messageApi, propertiesApi, clientApi } from "@/lib/api";
import { imageVariantUrl } from "@/lib/images";

interface PropertyImage {
    url: string;
    altText?: string | null;
    galleryUrl?: string | null;
    listingUrl?: string | null;
    thumbUrl?: string | null;
}

interface PropertyOwner {
    id: number;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
}

interface PropertyAgent {
    id: number;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
}

interface PropertyDetail {
    id: number;
    title: string;
    referenceCode: string;
    description: string;
    price: number;
    pricePeriod?: string | null;
    category: string;
    location: string;
    gpsCode?: string | null;
    bedrooms: number;
    bathrooms: number;
    sqft?: number | null;
    yearBuilt?: number | null;
    isVerified: boolean;
    amenities?: string[] | null;
    images: PropertyImage[];
    owner: PropertyOwner | null;
    agent: PropertyAgent | null;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export default function PropertyPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const resolvedParams = use(params);
    const propertyId = decodeURIComponent(resolvedParams.propertyId);
    const numericId = Number(propertyId);
    const router = useRouter();

    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [viewingFee, setViewingFee] = useState<number>(150);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (Number.isNaN(numericId)) {
            setError("Invalid property ID");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");

        Promise.all([
            propertiesApi.get(numericId),
            feeApi.list().catch(() => []),
        ])
            .then(([data, rules]: [any, any[]]) => {
                setProperty(data as PropertyDetail);
                const vf = rules.find((r: any) => r.feeType === "ViewingFee" && r.isActive);
                if (vf && typeof vf.amount === "number") {
                    setViewingFee(vf.amount / 100);
                }
            })
            .catch((err: any) => {
                setError(err.message || "Failed to load property");
            })
            .finally(() => setLoading(false));

        // Best-effort: pre-fill the heart if the logged-in client already saved
        // this property. 401/403 (anon, or a non-client role viewing the page)
        // is swallowed — the save button still works as a logged-out CTA that
        // prompts sign-in via the failed-save path below.
        clientApi
            .savedProperties()
            .then((rows: any[]) => setSaved(rows.some((r) => r.id === numericId)))
            .catch(() => {});
    }, [numericId]);

    // Hero uses the largest variant (galleryUrl 1600x1200) for quality; the four
    // grid thumbnails use the thumb variant (400x300). Both fall back to the
    // original `url` when a variant is absent (legacy rows / failed generation).
    const allImages = property?.images ?? [];
    const heroImage = imageVariantUrl(allImages[0], "gallery") ?? allImages[0]?.url ?? "/placeholder.jpg";
    const galleryThumbs = allImages.slice(1, 5).map((img) => imageVariantUrl(img, "thumb") ?? img.url);
    const galleryCount = allImages.length;

    const priceLabel = property?.pricePeriod
        ? `GH₵ ${property.price.toLocaleString()} / ${property.pricePeriod}`
        : `GH₵ ${property?.price?.toLocaleString() ?? ""}`;

    const ownerName = property?.owner?.fullName ?? "Owner";
    const ownerInitials = property?.owner?.fullName ? getInitials(property.owner.fullName) : "??";
    const ownerPhone = property?.owner?.phone ?? null;
    // Fallback contact for the WhatsApp deep link: prefer the owner, fall back
    // to the assigned verification agent when the owner has no phone on file
    // (spec §2.5: real owner/agent phone from the API). The detail payload now
    // carries `agent` from the verification join.
    const agentPhone = property?.agent?.phone ?? null;
    const contactPhone = ownerPhone ?? agentPhone ?? null;
    const contactUserId = property?.owner?.id ?? property?.agent?.id ?? null;

    const rawWhatsappMsg =
        `Hi, I'm interested in "${property?.title ?? ""}" listed on TEPS (Ref: ${property?.referenceCode ?? ""}). Please let me know the next steps.`;
    const whatsappMsg = encodeURIComponent(rawWhatsappMsg);

    const handleWhatsAppClick = async () => {
        if (!contactPhone || !contactUserId || !property) return;
        // Best-effort: create a message thread if the visitor is logged in
        // (the access cookie is sent automatically), then log the prefilled
        // enquiry as an outbound message in that thread (spec §2.5: "Log
        // interaction in messages table when 'Chat on WhatsApp' is clicked").
        // A logged-out 401 is swallowed — the WhatsApp link still opens
        // regardless, and the wa.me deep link is what actually delivers the
        // message (no Meta send here).
        try {
            const thread: any = await messageApi.createThread({
                participant2Id: contactUserId,
                propertyId: property.id,
                threadType: "Property",
            });
            if (thread?.id) {
                await messageApi.send(thread.id, rawWhatsappMsg).catch(() => {});
            }
        } catch {
            // Non-blocking
        }
        window.open(`https://wa.me/${contactPhone.replace(/\+/g, "")}?text=${whatsappMsg}`, "_blank");
    };

    // Toggle save for the logged-in client. A 401/403 (anon or non-client role)
    // surfaces a gentle prompt to sign in rather than failing silently — the
    // heart reverts so it never lies about saved state.
    const handleToggleSave = async () => {
        if (saving) return;
        const wasSaved = saved;
        setSaved(!wasSaved); // optimistic
        setSaving(true);
        try {
            if (wasSaved) {
                await clientApi.removeSavedProperty(numericId);
            } else {
                await clientApi.saveProperty(numericId);
            }
        } catch (err: any) {
            setSaved(wasSaved); // revert
            const status = err?.status ?? err?.response?.status;
            if (status === 401 || status === 403) {
                router.push("/auth/login");
            }
        } finally {
            setSaving(false);
        }
    };

    const verificationChecks = property
        ? {
            ownership: { verified: property.isVerified },
            gpsLocation: { verified: property.isVerified },
            landCommission: { verified: property.isVerified },
        }
        : null;

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
                <p className="text-slate-600 font-medium">Loading property details...</p>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center px-4 bg-slate-50">
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md shadow-sm">
                    <p className="text-red-700 font-semibold mb-4">{error || "Property not found"}</p>
                    <Link href="/" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
                        Back to listings
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <CheckoutModal
                isOpen={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                amount={viewingFee}
                purpose={`Booking Viewing: ${property.title}`}
                reference={property.referenceCode}
                propertyId={property.id}
            />

            {/* Top Nav */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                <Link
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        window.history.back();
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
                        <Share className="h-4 w-4" />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                    <button
                        onClick={handleToggleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors border rounded-lg px-3 py-2 ${
                            saved
                                ? "border-red-200 text-red-600 bg-red-50"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                        <Heart className={`h-4 w-4 ${saved ? "fill-red-600" : ""}`} />
                        <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
                {/* Title & Badges */}
                <div className="mb-6">
                    <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant={property.isVerified ? "verified" : "default"}>
                            {property.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                        <Badge variant="secondary">{property.category}</Badge>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-slate-900 leading-tight">
                        {property.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-slate-600 text-sm">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span>{property.location}</span>
                        </div>
                        {property.gpsCode && (
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {property.gpsCode}
                            </span>
                        )}
                    </div>
                </div>

                {/* Image Gallery */}
                {galleryCount > 0 ? (
                    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] sm:h-[400px] lg:h-[450px] mb-10 rounded-2xl overflow-hidden">
                        <div className="col-span-2 row-span-2 relative">
                            <Image
                                src={heroImage}
                                alt={property.title}
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
                                priority
                            />
                        </div>
                        {galleryThumbs.map((img, i) => (
                            <div key={i} className="col-span-1 row-span-1 relative">
                                <Image
                                    src={img}
                                    alt={`Gallery ${i + 2}`}
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-700 cursor-pointer"
                                />
                                {i === 3 && galleryCount > 5 && (
                                    <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center cursor-pointer hover:bg-slate-950/60 transition-colors">
                                        <span className="text-white font-semibold text-sm flex items-center gap-2">
                                            <Maximize2 className="h-4 w-4" />
                                            View all {galleryCount}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-[300px] mb-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-medium">
                        No images available
                    </div>
                )}

                {/* Content Grid */}
                <div className="grid lg:grid-cols-3 gap-10 lg:gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Quick Stats */}
                        <div className="flex flex-wrap items-center gap-6 pb-8 border-b border-slate-100">
                            {property.bedrooms > 0 && (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Bed className="h-5 w-5 text-slate-400" />
                                    <span className="font-medium">{property.bedrooms} Bedrooms</span>
                                </div>
                            )}
                            {property.bathrooms > 0 && (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Bath className="h-5 w-5 text-slate-400" />
                                    <span className="font-medium">{property.bathrooms} Bathrooms</span>
                                </div>
                            )}
                            {property.sqft && (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Maximize2 className="h-5 w-5 text-slate-400" />
                                    <span className="font-medium">{property.sqft.toLocaleString()} sqft</span>
                                </div>
                            )}
                            {property.yearBuilt && property.yearBuilt > 0 && (
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Calendar className="h-5 w-5 text-slate-400" />
                                    <span className="font-medium">Built {property.yearBuilt}</span>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">About this property</h2>
                            <p className="text-slate-600 leading-relaxed">{property.description}</p>
                        </div>

                        {/* Amenities */}
                        {property.amenities && property.amenities.length > 0 && (
                            <div>
                                <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">What this place offers</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {property.amenities.map((amenity) => (
                                        <div
                                            key={amenity}
                                            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100"
                                        >
                                            <Check className="h-4 w-4 text-brand-600 shrink-0" />
                                            <span className="text-sm font-medium text-slate-700">{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Owner Card */}
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                                    <span className="text-brand-700 font-heading font-bold text-lg">{ownerInitials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900">Listed by {ownerName}</p>
                                    <p className="text-sm text-slate-500">Property Owner</p>
                                </div>
                                {contactPhone && (
                                    <button
                                        onClick={handleWhatsAppClick}
                                        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors text-sm font-medium"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Chat
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Verification */}
                        {verificationChecks && (
                            <VerificationPanel referenceCode={property.referenceCode} checks={verificationChecks} />
                        )}
                    </div>

                    {/* Sticky Booking Widget */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="mb-6">
                                <span className="text-2xl font-heading font-bold text-slate-900">{priceLabel}</span>
                                <p className="text-sm text-slate-500 mt-1">
                                    Ref: <span className="font-mono text-slate-700">{property.referenceCode}</span>
                                </p>
                            </div>

                            <Button
                                onClick={() => setCheckoutOpen(true)}
                                size="lg"
                                className="w-full mb-3"
                            >
                                Book a Viewing — GH₵ {viewingFee.toLocaleString()}
                            </Button>

                            <p className="text-center text-xs text-slate-500 mb-4">
                                Booking fee held in escrow until viewing is confirmed.
                            </p>

                            {contactPhone && (
                                <button
                                    onClick={handleWhatsAppClick}
                                    className="w-full flex items-center justify-center gap-2 h-12 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors font-medium"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    Chat on WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="fixed bottom-0 z-50 w-full bg-white border-t border-slate-200 p-4 lg:hidden flex items-center justify-between shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
                <div className="flex flex-col">
                    <span className="text-lg font-heading font-bold text-slate-900">{priceLabel}</span>
                    <span className="text-slate-500 text-xs">{property.location}</span>
                </div>
                <Button
                    onClick={() => setCheckoutOpen(true)}
                    size="lg"
                    className="h-11 px-6"
                >
                    Book Now
                </Button>
            </div>
        </div>
    );
}
