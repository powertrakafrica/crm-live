"use client";

import { useState, useEffect } from "react";
import { Briefcase, Heart, CheckCircle2, Clock, Edit3, Save, MessageSquare, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import PropertyCard from "@/components/PropertyCard";
import { clientApi } from "@/lib/api";

const STAGES = ["Payment Confirmed", "Agent Assigned", "Viewing Scheduled", "Report Delivered"];

interface ServiceRequest {
    id: number;
    serviceType: string;
    propertyTitle?: string;
    status: string;
    date: string;
    assignedAgent?: { name: string };
    viewingDate?: string;
}

export function ClientDashboard() {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [vaultNotes, setVaultNotes] = useState<{ [key: string]: string }>({});
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [savedProperties, setSavedProperties] = useState<any[]>([]);
    const [savedLoading, setSavedLoading] = useState(true);

    useEffect(() => {
        clientApi.serviceRequests()
            .then((data: any) => {
                const bookings = (data.bookings ?? []).map((b: any) => ({
                    id: b.id,
                    serviceType: "Guided Viewing",
                    propertyTitle: b.propertyId ? `Property #${b.propertyId}` : undefined,
                    status: b.status === "Confirmed" ? "Agent Assigned" : b.status === "Completed" ? "Report Delivered" : "Payment Confirmed",
                    date: b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : "N/A",
                    assignedAgent: b.agentId ? { name: `Agent #${b.agentId}` } : undefined,
                    viewingDate: b.scheduledDate ? new Date(b.scheduledDate).toLocaleString() : undefined,
                }));
                setRequests(bookings);
            })
            .catch(() => setRequests([]))
            .finally(() => setLoading(false));

        clientApi.savedProperties()
            .then((data: any[]) => {
                const mapped = (data ?? []).map((item: any) => ({
                    ...item,
                    note: vaultNotes[item.id] || "",
                }));
                setSavedProperties(mapped);
            })
            .catch(() => setSavedProperties([]))
            .finally(() => setSavedLoading(false));
    }, []);

    const handleSaveNote = (propertyId: string) => {
        setEditingNote(null);
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Your Dashboard</h2>
                <p className="text-charcoal-500 font-medium mt-1">Track your active services and manage your saved properties.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Active Cases */}
                <div className="xl:col-span-8 space-y-6">
                    <h3 className="text-xl font-heading font-bold flex items-center gap-2 text-charcoal-950 px-1">
                        <Briefcase className="h-5 w-5 text-brand-600" />
                        Active Service Tickets
                    </h3>

                    {loading ? (
                        <div className="bg-white border border-charcoal-200 rounded-sm p-8 text-center">
                            <p className="text-charcoal-500 font-medium">Loading service requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white border border-charcoal-200 rounded-sm p-8 text-center">
                            <p className="text-charcoal-500 font-medium">No active service requests.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {requests.map((request) => {
                                const currentStageIndex = STAGES.indexOf(request.status);
                                return (
                                    <div key={request.id} className="bg-white border border-charcoal-200 rounded-sm shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-charcoal-100 bg-charcoal-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className="bg-brand-100 text-brand-700 shadow-none hover:bg-brand-200 border-none font-bold uppercase tracking-wider text-[10px]">
                                                        SR-{request.id}
                                                    </Badge>
                                                    <span className="text-xs text-charcoal-500 font-medium">{request.date}</span>
                                                </div>
                                                <h4 className="font-bold text-charcoal-900 text-lg">{request.serviceType}</h4>
                                                {request.propertyTitle && <p className="text-sm font-medium text-charcoal-600 mt-0.5">{request.propertyTitle}</p>}
                                            </div>
                                            <Button variant="outline" className="shrink-0 h-9 font-bold text-xs bg-white text-charcoal-700">Open Case Details</Button>
                                        </div>

                                        <div className="p-6 sm:p-8">
                                            <div className="relative border-l-2 border-charcoal-200 ml-3 sm:ml-4 space-y-8">
                                                {STAGES.map((stage, index) => {
                                                    const isActive = index <= currentStageIndex;
                                                    const isCurrent = index === currentStageIndex;
                                                    return (
                                                        <div key={stage} className={`relative flex items-start gap-4 ${isActive ? "opacity-100" : "opacity-40"}`}>
                                                            <div className={`absolute -left-[14px] sm:-left-[18px] top-1 rounded-full border-2 bg-white flex items-center justify-center transition-colors
                                                                ${isActive ? "border-brand-600 h-6 w-6 sm:h-8 sm:w-8" : "border-charcoal-300 h-6 w-6 sm:h-8 sm:w-8"}
                                                                ${isCurrent ? "ring-4 ring-brand-100" : ""}
                                                            `}>
                                                                {isActive ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600" /> : <div className="h-2 w-2 rounded-full bg-charcoal-300" />}
                                                            </div>
                                                            <div className="ml-6 sm:ml-8 flex-1">
                                                                <h5 className={`font-bold text-sm sm:text-base ${isCurrent ? "text-brand-700" : "text-charcoal-900"}`}>{stage}</h5>
                                                                {stage === "Agent Assigned" && isCurrent && request.assignedAgent && (
                                                                    <div className="mt-3 flex items-center gap-3 p-3 bg-brand-50 rounded-sm border border-brand-100 w-full max-w-sm">
                                                                        <UserCircle2 className="h-8 w-8 text-brand-600" />
                                                                        <div>
                                                                            <p className="text-xs text-charcoal-500 uppercase font-bold tracking-wider">Assigned Agent</p>
                                                                            <p className="font-bold text-brand-900 text-sm">{request.assignedAgent.name}</p>
                                                                        </div>
                                                                        <Button size="sm" className="ml-auto h-7 px-3 text-xs bg-white text-brand-700 hover:bg-brand-100 border-none shadow-sm">Message</Button>
                                                                    </div>
                                                                )}
                                                                {stage === "Viewing Scheduled" && isCurrent && (
                                                                    <div className="mt-3 flex items-start gap-2 p-3 border border-amber-200 bg-amber-50 text-amber-900 rounded-sm w-full max-w-sm text-sm font-medium">
                                                                        <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                                                                        <div>
                                                                            <span className="block font-bold mb-0.5">Upcoming Meetup</span>
                                                                            {request.viewingDate}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
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
                    </h3>

                    <div className="space-y-6">
                        {savedLoading && (
                            <div className="bg-white border border-charcoal-200 rounded-sm p-8 text-center">
                                <p className="text-charcoal-500 font-medium">Loading saved properties...</p>
                            </div>
                        )}
                        {!savedLoading && savedProperties.length === 0 && (
                            <div className="bg-white border border-charcoal-200 rounded-sm p-8 text-center">
                                <p className="text-charcoal-500 font-medium">No saved properties yet.</p>
                            </div>
                        )}
                        {!savedLoading && savedProperties.map((property: any) => (
                            <div key={property.id} className="bg-white border border-charcoal-200 rounded-sm shadow-sm p-4 relative overflow-hidden group">
                                <PropertyCard
                                    id={String(property.id)}
                                    title={property.title}
                                    price={`GH₵ ${property.price?.toLocaleString() ?? "0"}`}
                                    pricePeriod={property.pricePeriod ?? "one-off"}
                                    location={property.location}
                                    bedrooms={property.bedrooms ?? 0}
                                    bathrooms={property.bathrooms ?? 0}
                                    imageUrl={property.images?.[0]?.url ?? "/placeholder.jpg"}
                                    isVerified={property.isVerified ?? false}
                                    category={property.category ?? "Sale"}
                                />

                                <div className="mt-4 pt-4 border-t border-charcoal-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-charcoal-500 uppercase tracking-wider flex items-center gap-1.5"><Edit3 className="h-3 w-3"/> Private Note</h5>
                                        {editingNote !== property.id && (
                                            <button onClick={() => setEditingNote(property.id)} className="text-brand-600 text-xs font-bold hover:underline">Edit</button>
                                        )}
                                    </div>

                                    {editingNote === property.id ? (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <textarea
                                                autoFocus
                                                value={vaultNotes[property.id] || ""}
                                                onChange={(e) => setVaultNotes({ ...vaultNotes, [property.id]: e.target.value })}
                                                className="w-full text-sm p-2 bg-charcoal-50 border border-brand-300 rounded-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                                rows={3}
                                                placeholder="Add your private thoughts here..."
                                            />
                                            <div className="flex justify-end mt-2">
                                                <Button size="sm" onClick={() => handleSaveNote(property.id)} className="h-7 text-xs font-bold bg-brand-600 text-white shadow-none px-4">
                                                    <Save className="h-3 w-3 mr-1.5" /> Save Note
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setEditingNote(property.id)}
                                            className={`text-sm p-3 rounded-sm cursor-pointer border border-transparent transition-colors ${property.note ? "bg-amber-50/50 text-charcoal-800" : "bg-charcoal-50 border-dashed border-charcoal-200 text-charcoal-400 italic hover:border-brand-300 hover:bg-brand-50"}`}
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
        </div>
    );
}
