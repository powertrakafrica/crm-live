"use client";

import { useState, useEffect } from "react";
import {
    Home, Plus, Edit, Eye,
    MoreHorizontal, Search, User,
    X, Save, MapPin, BedDouble, Bath, Maximize2, Calendar, FileText, CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { agentApi } from "@/lib/api";

interface AgentListing {
    id: number;
    title: string;
    ownerName: string;
    price: number;
    period: string;
    status: string;
    views: number;
    enquiries: number;
    dateAdded: string;
    category?: string;
    bedrooms?: number;
    bathrooms?: number;
    location?: string;
    description?: string;
    sqft?: number;
    yearBuilt?: number;
    gpsCode?: string;
    amenities?: string[];
    images?: { url: string; isPrimary: boolean }[];
}

export function AgentListings() {
    const [listings, setListings] = useState<AgentListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // States for Modals
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingListing, setEditingListing] = useState<AgentListing | null>(null);

    useEffect(() => {
        agentApi.listings()
            .then((data: any) => {
                const mapped = (data ?? []).map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    ownerName: p.ownerId ? `Owner #${p.ownerId}` : "Unknown",
                    price: p.price,
                    period: p.pricePeriod || "month",
                    status: p.status === "Active" ? "Available" : p.status === "Pending" ? "Under Offer" : p.status === "Sold" || p.status === "Rented" ? "Sold/Rented" : p.status,
                    views: p.viewsCount || 0,
                    enquiries: p.enquiriesCount || 0,
                    dateAdded: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A",
                    category: p.category,
                    bedrooms: p.bedrooms,
                    bathrooms: p.bathrooms,
                    location: p.location,
                    description: p.description,
                    sqft: p.sqft,
                    yearBuilt: p.yearBuilt,
                    gpsCode: p.gpsCode,
                    amenities: p.amenities,
                    images: p.images,
                }));
                setListings(mapped);
            })
            .catch((err: any) => setError(err.message || "Failed to load listings"))
            .finally(() => setLoading(false));
    }, []);

    const handleStatusToggle = (id: number, currentStatus: string) => {
        const nextStatus = currentStatus === "Available" ? "Under Offer" : currentStatus === "Under Offer" ? "Sold/Rented" : "Available";
        const updated = listings.map(l => l.id === id ? { ...l, status: nextStatus } : l);
        setListings(updated);
    };

    const handleSaveListing = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const title = formData.get("title") as string;
        const category = formData.get("category") as string;
        const price = Number(formData.get("price"));
        const period = formData.get("period") as string;
        const bedrooms = Number(formData.get("bedrooms"));
        const bathrooms = Number(formData.get("bathrooms"));
        const location = formData.get("location") as string;
        const ownerName = formData.get("ownerName") as string;
        const description = formData.get("description") as string;
        const sqft = Number(formData.get("sqft"));
        const yearBuilt = Number(formData.get("yearBuilt"));
        const gpsCode = formData.get("gpsCode") as string;
        const amenitiesRaw = formData.get("amenities") as string;
        const amenities = amenitiesRaw ? amenitiesRaw.split(",").map(a => a.trim()).filter(Boolean) : [];

        if (editingListing) {
            const updated = listings.map(l =>
                l.id === editingListing.id
                    ? { ...l, title, category, price, period, bedrooms, bathrooms, location, ownerName, description, sqft, yearBuilt, gpsCode, amenities }
                    : l
            );
            setListings(updated);
            setEditingListing(null);
        } else {
            const newListing: AgentListing = {
                id: Date.now(),
                title,
                category,
                price,
                period,
                bedrooms,
                bathrooms,
                location,
                ownerName,
                description,
                sqft,
                yearBuilt,
                gpsCode,
                amenities,
                status: "Available",
                views: 0,
                enquiries: 0,
                dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            };
            setListings([newListing, ...listings]);
            setIsWizardOpen(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Available": return "bg-green-100 text-green-700";
            case "Under Offer": return "bg-orange-100 text-orange-700";
            case "Sold/Rented": return "bg-charcoal-200 text-charcoal-600";
            default: return "bg-charcoal-100 text-charcoal-600";
        }
    };

    const renderFormFields = (defaultValues?: Partial<AgentListing>) => (
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">

            {/* Basic Info */}
            <div className="space-y-4">
                <h4 className="font-bold text-sm text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">Basic Details</h4>
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property Title</label>
                    <input
                        name="title"
                        type="text"
                        defaultValue={defaultValues?.title || ""}
                        placeholder="e.g. 2-BR Modern Apartment"
                        className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Description</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 h-4 w-4 text-charcoal-400" />
                        <textarea
                            name="description"
                            rows={3}
                            defaultValue={defaultValues?.description || ""}
                            placeholder="Detailed description of the property..."
                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900 resize-none"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Owner Name</label>
                        <input
                            name="ownerName"
                            type="text"
                            defaultValue={defaultValues?.ownerName || ""}
                            placeholder="Owner or Client Name"
                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Location (City/Area)</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                            <input
                                name="location"
                                type="text"
                                defaultValue={defaultValues?.location || ""}
                                placeholder="e.g. East Legon, Accra"
                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Ghana Post GPS Code</label>
                    <input
                        name="gpsCode"
                        type="text"
                        defaultValue={defaultValues?.gpsCode || ""}
                        placeholder="e.g. GA-182-9901"
                        className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none text-charcoal-900 font-mono tracking-wide placeholder:font-sans"
                    />
                </div>
            </div>

            {/* Specifications */}
            <div className="space-y-4 pt-4">
                <h4 className="font-bold text-sm text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Category</label>
                        <select
                            name="category"
                            defaultValue={defaultValues?.category || "Rent"}
                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                        >
                            <option value="Rent">For Rent</option>
                            <option value="Sale">For Sale</option>
                            <option value="Rent-to-Own">Rent-to-Own</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Bedrooms</label>
                        <div className="relative">
                            <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                            <input
                                name="bedrooms"
                                type="number"
                                min="0"
                                defaultValue={defaultValues?.bedrooms || "0"}
                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Bathrooms</label>
                        <div className="relative">
                            <Bath className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                            <input
                                name="bathrooms"
                                type="number"
                                min="0"
                                defaultValue={defaultValues?.bathrooms || "0"}
                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Size (Sqft)</label>
                        <div className="relative">
                            <Maximize2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                            <input
                                name="sqft"
                                type="number"
                                min="0"
                                defaultValue={defaultValues?.sqft || ""}
                                placeholder="Total area"
                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Year Built</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                            <input
                                name="yearBuilt"
                                type="number"
                                min="1900"
                                max={new Date().getFullYear() + 5}
                                defaultValue={defaultValues?.yearBuilt || ""}
                                placeholder="e.g. 2020"
                                className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Amenities (Comma separated)</label>
                    <div className="relative">
                        <CheckSquare className="absolute left-3 top-3 h-4 w-4 text-charcoal-400" />
                        <textarea
                            name="amenities"
                            rows={2}
                            defaultValue={defaultValues?.amenities ? defaultValues.amenities.join(", ") : ""}
                            placeholder="e.g. Swimming Pool, 24/7 Security, Gym, Wi-Fi"
                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-3 py-2 outline-none font-medium text-charcoal-900 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-4 pt-4">
                <h4 className="font-bold text-sm text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">Images & Media</h4>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property Gallery</label>
                    <div className="border-2 border-dashed border-charcoal-200 rounded-sm p-6 flex flex-col items-center justify-center bg-charcoal-50 hover:bg-brand-50 hover:border-brand-300 transition-colors cursor-pointer" onClick={() => alert("Simulating file picker dialog...")}>
                        <div className="h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-3">
                            <Plus className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-bold text-charcoal-900 mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs text-charcoal-500 text-center max-w-xs">SVG, PNG, JPG or GIF (max. 10MB). First image will be used as the cover.</p>
                    </div>
                    {/* Simulated Uploaded Thumbs */}
                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        <div className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
                            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop" className="w-full h-full object-cover" alt="thumb1"/>
                            <div className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-white"/></div>
                            <div className="absolute bottom-0 left-0 w-full bg-brand-600 text-white text-[9px] font-bold text-center py-0.5 tracking-wide">COVER</div>
                        </div>
                        <div className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
                            <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="thumb2"/>
                            <div className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-white"/></div>
                        </div>
                         <div className="h-20 w-28 shrink-0 bg-charcoal-200 rounded-sm overflow-hidden relative group">
                            <img src="https://images.unsplash.com/photo-1536376072261-38c75010e6c9?q=80&w=2071&auto=format&fit=crop" className="w-full h-full object-cover" alt="thumb3"/>
                            <div className="absolute top-1 right-1 bg-charcoal-900/60 p-1 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3 text-white"/></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 pt-4">
                <h4 className="font-bold text-sm text-brand-700 uppercase tracking-widest border-b border-brand-100 pb-2">Pricing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Price (GH₵)</label>
                        <input
                            name="price"
                            type="number"
                            defaultValue={defaultValues?.price || ""}
                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Period</label>
                        <select
                            name="period"
                            defaultValue={defaultValues?.period || "month"}
                            className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-medium text-charcoal-900"
                        >
                            <option value="month">Per Month</option>
                            <option value="year">Per Year</option>
                            <option value="one-off">One-Off Sale</option>
                        </select>
                    </div>
                </div>
            </div>

        </div>
    );

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950">Managed Listings</h2>
                    <p className="text-charcoal-500 font-medium">Manage properties uploaded on behalf of owners.</p>
                </div>
                <Button onClick={() => setIsWizardOpen(true)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-6 shadow-sm">
                    <Plus className="h-5 w-5 mr-2" /> List New Property
                </Button>
            </div>

            {loading ? (
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <p className="text-charcoal-500 font-medium">Loading listings...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm font-medium text-red-700">{error}</div>
            ) : (
                <Card className="border-charcoal-200 shadow-sm rounded-sm z-0">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                                <input type="text" placeholder="Search by property or owner name..." className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-4 py-2" />
                            </div>
                            <div className="hidden md:flex gap-2">
                                <Badge className="bg-white text-charcoal-600 border border-charcoal-200 font-bold">All ({listings.length})</Badge>
                                <Badge className="bg-white text-charcoal-600 border border-charcoal-200 font-bold">Available ({listings.filter(l => l.status === "Available").length})</Badge>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-charcoal-500 uppercase bg-charcoal-50 border-b border-charcoal-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-wider">Property</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Owner / Loc</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Performance</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listings.map((listing) => (
                                        <tr key={listing.id} className="bg-white border-b border-charcoal-100 hover:bg-charcoal-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-charcoal-900">{listing.title}</div>
                                                <div className="font-medium text-xs text-brand-600 mt-1">GH₵ {listing.price.toLocaleString()}/{listing.period}</div>
                                                {(listing.bedrooms !== undefined || listing.category || listing.sqft) && (
                                                    <div className="text-xs text-charcoal-500 mt-1 flex gap-2 flex-wrap items-center">
                                                        {listing.category && <span className="uppercase text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-sm font-bold tracking-wide">{listing.category}</span>}
                                                        {listing.category && listing.bedrooms !== undefined && <span>•</span>}
                                                        {listing.bedrooms !== undefined && <span>{listing.bedrooms} Beds</span>}
                                                        {listing.bathrooms !== undefined && <span>• {listing.bathrooms} Baths</span>}
                                                        {listing.sqft && <span>• {listing.sqft.toLocaleString()} sqft</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="h-6 w-6 rounded-full bg-charcoal-200 flex items-center justify-center text-xs font-bold text-charcoal-600">
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <span className="font-bold text-charcoal-700">{listing.ownerName}</span>
                                                </div>
                                                {listing.location ? (
                                                    <div className="text-xs text-charcoal-500 flex items-center mt-1">
                                                        <MapPin className="h-3 w-3 mr-1" /> {listing.location}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-charcoal-400 italic">Location unassigned</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    className={`${getStatusColor(listing.status)} border-none shadow-none font-bold cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap`}
                                                    onClick={() => handleStatusToggle(listing.id, listing.status)}
                                                >
                                                    {listing.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4 text-xs font-bold text-charcoal-600">
                                                    <span title="Views"><Eye className="h-3 w-3 inline mr-1 text-charcoal-400" />{listing.views}</span>
                                                    <span title="Enquiries" className="text-brand-600 bg-brand-50 px-2 py-0.5 rounded-sm whitespace-nowrap">{listing.enquiries} leads</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        onClick={() => setEditingListing(listing)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-charcoal-500 hover:text-brand-600 hover:bg-brand-50"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button onClick={() => alert("Opening context menu...")} variant="ghost" size="icon" className="h-8 w-8 text-charcoal-500 hover:text-charcoal-900">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="bg-brand-50 border border-brand-200 rounded-sm p-4 text-sm font-medium text-brand-800 flex items-start gap-3">
                <Home className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold">On-Behalf Uploading:</span> Listings you create on behalf of an owner are automatically tagged with your <code className="bg-white px-1.5 py-0.5 rounded text-brand-900 border border-brand-200 text-xs">agent_code</code>. You will receive all incoming enquiries while the owner retains legal profile ownership.
                </div>
            </div>

            {/* Modal Overlay for Edit OR Create */}
            {(editingListing || isWizardOpen) && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm pt-10 pb-10">
                    <div className="bg-white rounded-sm shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-charcoal-200 flex flex-col max-h-full">
                        <div className="p-5 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50 shrink-0">
                            <div>
                                <h3 className="font-heading font-bold text-xl text-charcoal-950">
                                    {isWizardOpen ? "List New Property" : "Edit Listing Details"}
                                </h3>
                                <p className="text-sm text-charcoal-500 font-medium">Please provide accurate details to ensure verification passes.</p>
                            </div>
                            <button
                                onClick={() => { setEditingListing(null); setIsWizardOpen(false); }}
                                className="text-charcoal-400 hover:text-charcoal-900 transition-colors p-1.5 rounded-sm hover:bg-charcoal-200 bg-white shadow-sm border border-charcoal-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveListing} className="flex flex-col overflow-hidden min-h-0 relative">
                            {renderFormFields(editingListing || undefined)}

                            <div className="p-5 border-t border-charcoal-100 bg-charcoal-50 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] relative z-10 w-full">
                                <span className="text-xs text-charcoal-500 font-bold uppercase tracking-wider hidden sm:block">
                                    <span className="text-red-500">*</span> Required fields
                                </span>
                                <div className="flex gap-3 w-full sm:w-auto justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setEditingListing(null); setIsWizardOpen(false); }}
                                        className="h-11 px-6 font-bold text-charcoal-600 border-charcoal-200 shadow-sm"
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="h-11 px-8 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm text-base">
                                        {isWizardOpen ? <><Plus className="h-5 w-5 mr-2" /> Publish Listing</> : <><Save className="h-5 w-5 mr-2" /> Save Changes</>}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
