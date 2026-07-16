"use client";

import { useState, useEffect } from "react";
import {
    Phone, MessageCircle, MapPin,
    Clock, CheckCircle, Navigation,
    Search, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { agentApi, bookingApi } from "@/lib/api";

interface Ticket {
    // Raw booking id (numeric) — used for the real PATCH /bookings/:id/status
    // call. The display id (TKT-<n>) is derived from it.
    bookingId: number;
    id: string;
    clientName: string;
    clientPhone: string | null;
    type: string;
    propertyTitle: string;
    propertyId: number | null;
    location: string;
    // Backend booking status (Pending|Confirmed|Completed|Cancelled|NoShow).
    status: string;
    // Agent-facing display status (Open|En Route|Meeting|Completed).
    displayStatus: string;
    scheduledFor: string;
    notes: string;
}

// Map the backend booking_status enum to the agent-facing display state. The
// backend has no "En Route"/"Meeting" distinction (only Confirmed), so both of
// those UI states correspond to Confirmed server-side.
function toDisplay(status: string): string {
    switch (status) {
        case "Pending": return "Open";
        case "Confirmed": return "En Route";
        case "Completed": return "Completed";
        case "Cancelled": return "Cancelled";
        case "NoShow": return "No-Show";
        default: return "Open";
    }
}

// Map an agent-facing display action to the backend status to persist.
function toBackend(display: string): string | null {
    switch (display) {
        case "En Route": return "Confirmed";
        case "Meeting": return "Confirmed";
        case "Completed": return "Completed";
        default: return null;
    }
}

// Normalize a stored phone to a wa.me/tel dialable form: strip non-digits, turn a
// leading 0 into the Ghana country code 233. Returns null when empty.
function dialable(phone: string | null): string | null {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("0")) digits = "233" + digits.slice(1);
    return digits;
}

export function AgentTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        agentApi.tickets()
            .then((data: any) => {
                const mapped: Ticket[] = (data ?? []).map((b: any) => ({
                    bookingId: b.id,
                    id: `TKT-${b.id}`,
                    clientName: b.clientName ?? (b.clientId ? `Client #${b.clientId}` : "Unknown Client"),
                    clientPhone: b.clientPhone ?? null,
                    type: "Guided Viewing",
                    propertyTitle: b.propertyTitle ?? (b.propertyId ? `Property #${b.propertyId}` : "N/A"),
                    propertyId: b.propertyId ?? null,
                    location: b.propertyLocation ?? "Ghana",
                    status: b.status ?? "Pending",
                    displayStatus: toDisplay(b.status ?? "Pending"),
                    scheduledFor: b.scheduledDate ? new Date(b.scheduledDate).toLocaleString() : "N/A",
                    notes: b.notes || "No notes provided.",
                }));
                setTickets(mapped);
                if (mapped.length > 0) setSelectedTicket(mapped[0]);
            })
            .catch((err: any) => setError(err.message || "Failed to load tickets"))
            .finally(() => setLoading(false));
    }, []);

    // Persist a status change through the real booking status endpoint (the
    // backend now authorizes: the booking's agent/client/admin only). Optimistic
    // local update, revert + surface an error on failure.
    const updateStatus = async (ticket: Ticket, display: string) => {
        const backend = toBackend(display);
        if (!backend) return;
        setActionError("");
        setUpdatingId(ticket.bookingId);
        const prev = ticket;
        const optimistic: Ticket = { ...ticket, status: backend, displayStatus: display };
        setTickets((ts) => ts.map((t) => (t.bookingId === ticket.bookingId ? optimistic : t)));
        setSelectedTicket((cur) => (cur && cur.bookingId === ticket.bookingId ? optimistic : cur));
        try {
            await bookingApi.updateStatus(ticket.bookingId, backend);
        } catch (err: any) {
            setTickets((ts) => ts.map((t) => (t.bookingId === ticket.bookingId ? prev : t)));
            setSelectedTicket((cur) => (cur && cur.bookingId === ticket.bookingId ? prev : cur));
            setActionError(err.message || "Failed to update status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Open": return "bg-blue-100 text-blue-700";
            case "En Route": return "bg-yellow-100 text-yellow-700";
            case "Meeting": return "bg-purple-100 text-purple-700";
            case "Completed": return "bg-green-100 text-green-700";
            case "Cancelled": return "bg-red-100 text-red-700";
            case "No-Show": return "bg-charcoal-200 text-charcoal-700";
            default: return "bg-charcoal-100 text-charcoal-700";
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white border border-charcoal-200 rounded-sm p-12 text-center">
                    <p className="text-charcoal-500 font-medium">Loading tickets...</p>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-heading font-bold text-charcoal-950">Tickets & Leads</h2>
                    <p className="text-charcoal-500 font-medium">Manage your assigned service requests and guided viewings.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Available Tickets List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
                        <input type="text" placeholder="Search tickets..." className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-4 py-2" />
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {tickets.length === 0 ? (
                            <div className="p-4 text-center text-charcoal-500 font-medium">No tickets found.</div>
                        ) : tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={`p-4 rounded-sm border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? "bg-brand-50 border-brand-300 ring-1 ring-brand-300" : "bg-white border-charcoal-200 hover:border-brand-200"}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className={`${getStatusColor(ticket.displayStatus)} border-none shadow-none font-bold text-xs`}>{ticket.displayStatus}</Badge>
                                    <span className="text-xs font-medium text-charcoal-400">{ticket.scheduledFor.split(",")[0]}</span>
                                </div>
                                <h4 className="font-bold text-charcoal-900 text-sm">{ticket.clientName}</h4>
                                <p className="text-xs text-charcoal-500 mt-1 font-medium">{ticket.type}</p>
                                <div className="flex items-center gap-1 mt-3 text-xs text-charcoal-500 font-medium">
                                    <MapPin className="h-3 w-3" /> {ticket.location}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Case Action Center */}
                <div className="lg:col-span-2">
                    {selectedTicket ? (
                        <Card className="border-charcoal-200 shadow-sm rounded-sm overflow-hidden border-t-4 border-t-brand-500">
                            <CardHeader className="bg-charcoal-50 border-b border-charcoal-100 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge className="bg-white text-charcoal-600 border-charcoal-200 shadow-sm font-bold mb-3">{selectedTicket.id}</Badge>
                                        <CardTitle className="text-2xl font-black text-charcoal-950 mb-1">{selectedTicket.type}</CardTitle>
                                        <CardDescription className="text-sm font-medium text-charcoal-600 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-charcoal-400" /> {selectedTicket.location}
                                            <span className="text-charcoal-300">|</span>
                                            <Clock className="h-4 w-4 text-charcoal-400" /> {selectedTicket.scheduledFor}
                                        </CardDescription>
                                    </div>
                                    <Badge className={`${getStatusColor(selectedTicket.displayStatus)} border-none shadow-sm font-bold px-3 py-1 text-sm`}>
                                        {selectedTicket.displayStatus}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

                                    {/* Client Details & Communication */}
                                    <div>
                                        <h4 className="text-sm font-bold tracking-wide uppercase text-charcoal-400 mb-4">Client Details</h4>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-12 w-12 bg-accent-100 text-accent-700 rounded-sm flex items-center justify-center font-bold text-lg">
                                                {selectedTicket.clientName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-charcoal-900 text-lg">{selectedTicket.clientName}</p>
                                                <p className="text-sm text-charcoal-500">{selectedTicket.clientPhone ?? "No phone on file"}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-6">
                                            {(() => {
                                                const dial = dialable(selectedTicket.clientPhone);
                                                if (!dial) {
                                                    return (
                                                        <Button disabled className="w-full bg-[#25D366]/40 text-white/70 font-bold shadow-sm justify-start cursor-not-allowed">
                                                            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Client (no phone)
                                                        </Button>
                                                    );
                                                }
                                                const waUrl = `https://wa.me/${dial}?text=${encodeURIComponent(
                                                    `Hello ${selectedTicket.clientName}, this is your TEPS agent regarding the viewing of "${selectedTicket.propertyTitle}".`,
                                                )}`;
                                                return (
                                                    <a href={waUrl} target="_blank" rel="noreferrer" className="w-full">
                                                        <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-sm justify-start">
                                                            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Client
                                                        </Button>
                                                    </a>
                                                );
                                            })()}
                                            <a href={selectedTicket.clientPhone ? `tel:${selectedTicket.clientPhone.replace(/\s/g, "")}` : undefined} className={selectedTicket.clientPhone ? "" : "pointer-events-none opacity-50"}>
                                                <Button variant="outline" className="w-full border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 font-bold justify-start" disabled={!selectedTicket.clientPhone}>
                                                    <Phone className="h-4 w-4 mr-2" /> Call Phone
                                                </Button>
                                            </a>
                                        </div>
                                    </div>

                                    {/* Mission Details */}
                                    <div>
                                        <h4 className="text-sm font-bold tracking-wide uppercase text-charcoal-400 mb-4">Mission Context</h4>
                                        <div className="bg-charcoal-50 rounded-sm p-4 border border-charcoal-100">
                                            <p className="text-sm text-charcoal-800 font-medium mb-3">
                                                <span className="text-charcoal-500 block text-xs uppercase mb-1">Target Property</span>
                                                {selectedTicket.propertyTitle}
                                            </p>
                                            <p className="text-sm text-charcoal-800 font-medium pt-3 border-t border-charcoal-200">
                                                <span className="text-charcoal-500 block text-xs uppercase mb-1">Notes from Client</span>
                                                {selectedTicket.notes}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Reporting & Action */}
                                <div className="border-t border-charcoal-100 pt-6">
                                    <h4 className="text-sm font-bold tracking-wide uppercase text-charcoal-400 mb-4">Status Reporting</h4>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            onClick={() => updateStatus(selectedTicket, "En Route")}
                                            disabled={updatingId === selectedTicket.bookingId}
                                            variant="outline"
                                            className={selectedTicket.displayStatus === "En Route" ? "bg-yellow-500 hover:bg-yellow-600 text-white font-bold" : "font-bold text-charcoal-600"}
                                        >
                                            {updatingId === selectedTicket.bookingId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Navigation className="h-4 w-4 mr-2" />} En Route
                                        </Button>
                                        <Button
                                            onClick={() => updateStatus(selectedTicket, "Meeting")}
                                            disabled={updatingId === selectedTicket.bookingId}
                                            variant="outline"
                                            className={selectedTicket.displayStatus === "Meeting" ? "bg-purple-600 hover:bg-purple-700 text-white font-bold" : "font-bold text-charcoal-600"}
                                        >
                                            <Clock className="h-4 w-4 mr-2" /> Meeting in Progress
                                        </Button>
                                        <Button
                                            onClick={() => updateStatus(selectedTicket, "Completed")}
                                            disabled={updatingId === selectedTicket.bookingId}
                                            variant="outline"
                                            className={selectedTicket.displayStatus === "Completed" ? "bg-green-600 hover:bg-green-700 text-white font-bold" : "font-bold text-charcoal-600"}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" /> Completed
                                        </Button>
                                    </div>
                                    {actionError && (
                                        <p className="text-xs text-red-600 font-medium mt-3">{actionError}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-charcoal-200 rounded-sm flex items-center justify-center bg-charcoal-50">
                            <p className="text-charcoal-500 font-medium">Select a ticket to view details</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}