"use client";

import { useState, useEffect } from "react";
import {
    Phone, MessageCircle, MapPin,
    Clock, CheckCircle, Navigation,
    AlertCircle, Search, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { agentApi } from "@/lib/api";

interface Ticket {
    id: string;
    clientName: string;
    clientPhone: string;
    type: string;
    propertyTitle: string;
    propertyId: number | null;
    location: string;
    status: string;
    scheduledFor: string;
    notes: string;
}

export function AgentTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [simulatedAlert, setSimulatedAlert] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        agentApi.tickets()
            .then((data: any) => {
                const mapped = (data ?? []).map((b: any) => ({
                    id: `TKT-${b.id}`,
                    clientName: b.clientName ?? (b.clientId ? `Client #${b.clientId}` : "Unknown Client"),
                    clientPhone: b.clientPhone ?? null,
                    type: "Guided Viewing",
                    propertyTitle: b.propertyTitle ?? (b.propertyId ? `Property #${b.propertyId}` : "N/A"),
                    propertyId: b.propertyId ?? null,
                    location: b.propertyLocation ?? "Ghana",
                    status: b.status === "Pending" ? "Open" : b.status === "Confirmed" ? "En Route" : b.status === "Completed" ? "Completed" : "Open",
                    scheduledFor: b.scheduledDate ? new Date(b.scheduledDate).toLocaleString() : "N/A",
                    notes: b.notes || "No notes provided.",
                }));
                setTickets(mapped);
                if (mapped.length > 0) setSelectedTicket(mapped[0]);
            })
            .catch((err: any) => setError(err.message || "Failed to load tickets"))
            .finally(() => setLoading(false));
    }, []);

    const updateStatus = (id: string, newStatus: string) => {
        const updated = tickets.map(t => t.id === id ? { ...t, status: newStatus } : t);
        setTickets(updated);
        if (selectedTicket?.id === id) {
            setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Open": return "bg-blue-100 text-blue-700";
            case "En Route": return "bg-yellow-100 text-yellow-700";
            case "Meeting": return "bg-purple-100 text-purple-700";
            case "Completed": return "bg-green-100 text-green-700";
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
                    <p className="text-charcoal-500 font-medium">Manage your assigned service requested and guided viewings.</p>
                </div>
            </div>

            {simulatedAlert && tickets.length > 0 && (
                <div className="bg-brand-50 border border-brand-200 rounded-sm p-4 flex items-start gap-4">
                    <div className="bg-brand-100 p-2 rounded-full text-brand-600 mt-1">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-brand-900">New Ticket Assigned</h4>
                        <p className="text-sm text-brand-700 mt-1">You have a new "Property Search" ticket assigned. Client wants to view today.</p>
                        <div className="mt-3 flex gap-2">
                            <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white font-bold" onClick={() => setSimulatedAlert(false)}>Acknowledge</Button>
                        </div>
                    </div>
                </div>
            )}

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
                                className={`p-4 rounded-sm border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-300' : 'bg-white border-charcoal-200 hover:border-brand-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge className={`${getStatusColor(ticket.status)} border-none shadow-none font-bold text-xs`}>{ticket.status}</Badge>
                                    <span className="text-xs font-medium text-charcoal-400">{ticket.scheduledFor.split(',')[0]}</span>
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
                                    <Badge className={`${getStatusColor(selectedTicket.status)} border-none shadow-sm font-bold px-3 py-1 text-sm`}>
                                        {selectedTicket.status}
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
                                                <p className="text-sm text-charcoal-500">{selectedTicket.clientPhone}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 mt-6">
                                            <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-sm justify-start">
                                                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp Client
                                            </Button>
                                            <Button variant="outline" className="w-full border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 font-bold justify-start">
                                                <Phone className="h-4 w-4 mr-2" /> Call Phone
                                            </Button>
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
                                            onClick={() => updateStatus(selectedTicket.id, "En Route")}
                                            variant="outline"
                                            className={selectedTicket.status === "En Route" ? "bg-yellow-500 hover:bg-yellow-600 text-white font-bold" : "font-bold text-charcoal-600"}
                                        >
                                            <Navigation className="h-4 w-4 mr-2" /> En Route
                                        </Button>
                                        <Button
                                            onClick={() => updateStatus(selectedTicket.id, "Meeting")}
                                            variant="outline"
                                            className={selectedTicket.status === "Meeting" ? "bg-purple-600 hover:bg-purple-700 text-white font-bold" : "font-bold text-charcoal-600"}
                                        >
                                            <Clock className="h-4 w-4 mr-2" /> Meeting in Progress
                                        </Button>
                                        <Button
                                            onClick={() => updateStatus(selectedTicket.id, "Completed")}
                                            variant="outline"
                                            className={selectedTicket.status === "Completed" ? "bg-green-600 hover:bg-green-700 text-white font-bold" : "font-bold text-charcoal-600"}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" /> Completed
                                        </Button>
                                    </div>
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
