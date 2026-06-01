"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Calendar, Star, Flag, CheckCircle2, ChevronDown, Phone, ExternalLink, AlertTriangle, X, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { messageApi, propertiesApi, bookingApi, ratingApi, reportApi } from "@/lib/api";

interface Thread {
    id: number;
    contactName: string;
    propertyTitle: string | null;
    lastMessage: { body: string | null; createdAt: string } | null;
    lastMessageAt: string | null;
    unread: number;
    propertyId: number | null;
}

interface Property {
    id: number;
    title: string;
    referenceCode?: string;
}

interface Booking {
    id: number;
    propertyId: number;
    agentId: number | null;
    scheduledDate: string;
    scheduledTime: string | null;
    status: string;
    notes?: string | null;
}

interface Slot {
    id: string;
    day: string;
    date: string;
    times: string[];
}

const RATING_CATEGORIES = ["Punctuality", "Knowledge", "Professionalism"];
const REPORT_REASONS = ["Duplicate Listing", "Incorrect Location", "Property No Longer Available", "Suspected Fraud", "Misleading Photos", "Other"];

function formatThreadTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ClientCommunications() {
    const [activeSection, setActiveSection] = useState<"calendar" | "messages" | "feedback">("messages");

    // Global state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Messages state
    const [threads, setThreads] = useState<Thread[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);

    // Calendar state
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [slotBooked, setSlotBooked] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);

    // Rating state
    const [myBookings, setMyBookings] = useState<Booking[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratings, setRatings] = useState<{ [key: string]: number }>({});
    const [ratingComment, setRatingComment] = useState("");
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const [ratingLoading, setRatingLoading] = useState(false);

    // Report state
    const [reportProperties, setReportProperties] = useState<Property[]>([]);
    const [reportPropertyId, setReportPropertyId] = useState<number | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [reportDescription, setReportDescription] = useState("");
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        if (activeSection === "messages") {
            setThreadsLoading(true);
            (messageApi.threads() as Promise<Thread[]>)
                .then((data) => setThreads(data))
                .catch((err: any) => setError(err.message || "Failed to load messages"))
                .finally(() => setThreadsLoading(false));
        }
    }, [activeSection]);

    useEffect(() => {
        if (activeSection === "calendar") {
            setLoading(true);
            (propertiesApi.list() as Promise<Property[]>)
                .then((data) => {
                    setProperties(data);
                    setReportProperties(data);
                })
                .catch((err: any) => setError(err.message || "Failed to load properties"))
                .finally(() => setLoading(false));
        }
    }, [activeSection]);

    useEffect(() => {
        if (activeSection === "feedback") {
            setBookingsLoading(true);
            (bookingApi.myBookings() as Promise<Booking[]>)
                .then((data) => setMyBookings(data.filter((b) => b.status === "Completed" || b.status === "Confirmed")))
                .catch((err: any) => setError(err.message || "Failed to load bookings"))
                .finally(() => setBookingsLoading(false));
            // Also load properties for report selector
            setLoading(true);
            (propertiesApi.list() as Promise<Property[]>)
                .then((data) => setReportProperties(data))
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [activeSection]);

    useEffect(() => {
        if (selectedPropertyId && activeSection === "calendar") {
            setSlotsLoading(true);
            (bookingApi.slots(selectedPropertyId) as Promise<Slot[]>)
                .then((data) => setSlots(data))
                .catch((err: any) => setError(err.message || "Failed to load slots"))
                .finally(() => setSlotsLoading(false));
        } else {
            setSlots([]);
            setSelectedSlot(null);
            setSelectedTime(null);
        }
    }, [selectedPropertyId, activeSection]);

    const handleBookSlot = async () => {
        if (!selectedPropertyId || !selectedSlot || !selectedTime) return;
        const slot = slots.find((s) => s.id === selectedSlot);
        if (!slot) return;
        setBookingLoading(true);
        setError("");
        try {
            // Convert slot day+date to an ISO date string (approximate: use next occurrence of that weekday)
            const dayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
            const targetDay = dayMap[slot.day] ?? 1;
            const today = new Date();
            const diff = (targetDay - today.getDay() + 7) % 7;
            const scheduledDate = new Date(today);
            scheduledDate.setDate(today.getDate() + (diff === 0 ? 7 : diff));
            await bookingApi.create({
                propertyId: selectedPropertyId,
                scheduledDate: scheduledDate.toISOString().split("T")[0],
                scheduledTime: selectedTime,
                notes: "Booked via client portal",
            });
            setSlotBooked(true);
        } catch (err: any) {
            setError(err.message || "Booking failed");
        } finally {
            setBookingLoading(false);
        }
    };

    const handleSubmitRating = async () => {
        const booking = myBookings.find((b) => b.id === selectedBookingId);
        if (!booking || !booking.agentId) return;
        const scores = RATING_CATEGORIES.map((c) => ratings[c]).filter((s) => typeof s === "number");
        if (scores.length === 0) return;
        const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setRatingLoading(true);
        setError("");
        try {
            await ratingApi.create({
                agentId: booking.agentId,
                score: averageScore,
                category: "Overall",
                comment: ratingComment || undefined,
            });
            setRatingSubmitted(true);
            setTimeout(() => {
                setShowRatingModal(false);
                setRatingSubmitted(false);
                setRatings({});
                setRatingComment("");
                setSelectedBookingId(null);
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Rating failed");
        } finally {
            setRatingLoading(false);
        }
    };

    const handleSubmitReport = async () => {
        if (!reportPropertyId || !selectedReason) return;
        setReportLoading(true);
        setError("");
        try {
            await reportApi.create({
                propertyId: reportPropertyId,
                reason: selectedReason,
                description: reportDescription || undefined,
            });
            setReportSubmitted(true);
            setTimeout(() => {
                setShowReportModal(false);
                setReportSubmitted(false);
                setSelectedReason(null);
                setReportDescription("");
                setReportPropertyId(null);
            }, 3000);
        } catch (err: any) {
            setError(err.message || "Report failed");
        } finally {
            setReportLoading(false);
        }
    };

    const sectionTabs = [
        { id: "messages", label: "Message History", icon: <MessageSquare className="h-4 w-4" /> },
        { id: "calendar", label: "Book a Viewing", icon: <Calendar className="h-4 w-4" /> },
        { id: "feedback", label: "Trust & Feedback", icon: <Star className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Comms & Tools</h2>
                <p className="text-charcoal-500 font-medium mt-1">Manage viewings, review your message history, and leave feedback.</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {/* Section Tabs */}
            <div className="flex gap-2 border-b border-charcoal-200 pb-1">
                {sectionTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveSection(tab.id as any); setError(""); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-sm font-bold text-sm transition-all border-b-2 -mb-[1px] ${
                            activeSection === tab.id
                                ? "border-brand-600 text-brand-700 bg-brand-50"
                                : "border-transparent text-charcoal-500 hover:text-charcoal-800 hover:bg-charcoal-50"
                        }`}
                    >
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Messages */}
            {activeSection === "messages" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {threadsLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                            <span className="ml-2 text-charcoal-600 font-medium">Loading conversations...</span>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="text-center py-12 text-charcoal-500 font-medium">
                            No conversations yet.
                        </div>
                    ) : (
                        threads.map(thread => (
                            <Card key={thread.id} className="border-charcoal-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center shrink-0 border-2 border-green-200">
                                            <MessageSquare className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-bold text-charcoal-900 text-sm">{thread.contactName}</h4>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {thread.unread > 0 && (
                                                        <Badge className="bg-green-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full p-0 shadow-none border-none">{thread.unread}</Badge>
                                                    )}
                                                    <span className="text-xs text-charcoal-400">{formatThreadTime(thread.lastMessageAt)}</span>
                                                </div>
                                            </div>
                                            {thread.propertyTitle && (
                                                <p className="text-xs font-medium text-brand-600 mb-1 truncate">{thread.propertyTitle}</p>
                                            )}
                                            <p className="text-sm text-charcoal-600 truncate">{thread.lastMessage?.body ?? "No messages yet"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-3 pt-3 border-t border-charcoal-100">
                                        <a
                                            href={`https://wa.me/?text=Hello, I am interested in a property. Can we talk?`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 h-9 px-4 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-sm transition-colors shadow-sm"
                                        >
                                            <Phone className="h-3.5 w-3.5" />
                                            Open in WhatsApp
                                        </a>
                                        {thread.propertyId && (
                                            <Button variant="outline" size="sm" className="h-9 text-xs text-charcoal-600 bg-white border-charcoal-200 hover:bg-charcoal-50">
                                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Property
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Calendar */}
            {activeSection === "calendar" && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {slotBooked ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-300">
                            <div className="h-20 w-20 bg-brand-100 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="h-10 w-10 text-brand-600" />
                            </div>
                            <h3 className="text-xl font-heading font-bold text-charcoal-900 mb-2">Viewing Booked!</h3>
                            <p className="text-charcoal-500">Your slot has been confirmed. The owner has been notified.</p>
                            <div className="mt-6 p-4 bg-charcoal-50 border border-charcoal-200 rounded-sm text-left w-full max-w-xs space-y-2">
                                <p className="text-sm font-bold text-charcoal-700"><span className="text-charcoal-400 font-medium">Property:</span> {properties.find(p => p.id === selectedPropertyId)?.title}</p>
                                <p className="text-sm font-bold text-charcoal-700"><span className="text-charcoal-400 font-medium">Slot:</span> {slots.find(s => s.id === selectedSlot)?.day}, {selectedTime}</p>
                            </div>
                            <Button onClick={() => { setSlotBooked(false); setSelectedSlot(null); setSelectedTime(null); setSelectedPropertyId(null); }} variant="outline" className="mt-6 border-charcoal-200 font-bold text-charcoal-700 bg-white">Book Another Slot</Button>
                        </div>
                    ) : (
                        <div className="max-w-2xl space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Select Property</label>
                                <select
                                    className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                                    value={selectedPropertyId ?? ""}
                                    onChange={(e) => setSelectedPropertyId(Number(e.target.value) || null)}
                                >
                                    <option value="">Choose a property...</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedPropertyId && (
                                <p className="text-sm font-medium text-charcoal-600 p-4 bg-amber-50 border border-amber-200 rounded-sm">
                                    <strong>Property:</strong> {properties.find(p => p.id === selectedPropertyId)?.title} — Select from the available viewing windows below.
                                </p>
                            )}

                            {slotsLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                                    <span className="ml-2 text-charcoal-600 font-medium">Loading slots...</span>
                                </div>
                            ) : selectedPropertyId && slots.length === 0 ? (
                                <div className="text-center py-8 text-charcoal-500 font-medium">No available slots for this property.</div>
                            ) : (
                                <div className="space-y-4">
                                    {slots.map(slot => (
                                        <Card key={slot.id} className={`border-2 transition-colors ${selectedSlot === slot.id ? "border-brand-600 shadow-sm" : "border-charcoal-200"}`}>
                                            <CardContent className="p-5">
                                                <button className="w-full flex items-center justify-between" onClick={() => { setSelectedSlot(selectedSlot === slot.id ? null : slot.id); setSelectedTime(null); }}>
                                                    <div>
                                                        <h4 className="font-bold text-charcoal-900">{slot.day}</h4>
                                                        <p className="text-sm text-charcoal-500">{slot.date}</p>
                                                    </div>
                                                    <ChevronDown className={`h-5 w-5 text-charcoal-400 transition-transform ${selectedSlot === slot.id ? "rotate-180" : ""}`} />
                                                </button>
                                                {selectedSlot === slot.id && (
                                                    <div className="mt-4 pt-4 border-t border-charcoal-100 flex flex-wrap gap-3 animate-in fade-in duration-200">
                                                        {slot.times.map(time => (
                                                            <button
                                                                key={time}
                                                                onClick={() => setSelectedTime(time)}
                                                                className={`px-5 py-2 rounded-sm text-sm font-bold border-2 transition-colors ${selectedTime === time ? "bg-brand-600 text-white border-brand-600 shadow-sm" : "border-charcoal-200 text-charcoal-700 hover:border-brand-400"}`}
                                                            >
                                                                {time}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            <Button
                                disabled={!selectedPropertyId || !selectedSlot || !selectedTime || bookingLoading}
                                onClick={handleBookSlot}
                                className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm disabled:opacity-50"
                            >
                                {bookingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming...</> : "Confirm Viewing Slot"}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Feedback */}
            {activeSection === "feedback" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                    {/* Rate Agent Card */}
                    <Card className="border-charcoal-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-charcoal-100 bg-brand-50 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-brand-200 rounded-full flex items-center justify-center"><User className="h-5 w-5 text-brand-700"/></div>
                                <div>
                                    <h4 className="font-bold text-charcoal-900">Rate Your Agent</h4>
                                    <p className="text-xs text-charcoal-500 font-medium">Select a completed booking to leave feedback</p>
                                </div>
                            </div>
                        </div>
                        <CardContent className="p-5 space-y-4">
                            {bookingsLoading ? (
                                <div className="flex items-center gap-2 text-charcoal-600">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading bookings...
                                </div>
                            ) : myBookings.length === 0 ? (
                                <p className="text-sm text-charcoal-600 font-medium">No completed bookings yet. Book a viewing to rate your agent afterwards.</p>
                            ) : (
                                <>
                                    <select
                                        className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                                        value={selectedBookingId ?? ""}
                                        onChange={(e) => setSelectedBookingId(Number(e.target.value) || null)}
                                    >
                                        <option value="">Select a booking...</option>
                                        {myBookings.map(b => (
                                            <option key={b.id} value={b.id}>
                                                Booking #{b.id} — {new Date(b.scheduledDate).toLocaleDateString()} {b.scheduledTime ?? ""}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={() => setShowRatingModal(true)}
                                        disabled={!selectedBookingId}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs h-9 px-4 shadow-sm shrink-0"
                                    >
                                        <Star className="h-3.5 w-3.5 mr-1.5" /> Leave Rating
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Report a Listing Card */}
                    <Card className="border-charcoal-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-charcoal-100 bg-rose-50 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-rose-200/60 rounded-full flex items-center justify-center"><Flag className="h-5 w-5 text-rose-700"/></div>
                                <div>
                                    <h4 className="font-bold text-charcoal-900">Report a Listing</h4>
                                    <p className="text-xs text-charcoal-500 font-medium">Alert the admin team about suspicious activity</p>
                                </div>
                            </div>
                            <Button onClick={() => setShowReportModal(true)} variant="outline" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs h-9 px-4 shrink-0">
                                <Flag className="h-3.5 w-3.5 mr-1.5" /> Report Fraud
                            </Button>
                        </div>
                        <CardContent className="p-5 text-sm text-charcoal-600 font-medium">
                            Spotted a fraudulent listing or suspicious activity? Reports are reviewed within 2 hours by our admin team. Your identity is kept confidential.
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Agent Rating Modal */}
            {showRatingModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-sm shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 overflow-hidden">
                        {ratingSubmitted ? (
                            <div className="p-10 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <h3 className="font-bold text-xl text-charcoal-900 mb-2">Thank You!</h3>
                                <p className="text-charcoal-500">Your rating helps build a trusted agent network on TEPS.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-charcoal-100">
                                    <h3 className="font-heading font-bold text-charcoal-900 text-lg">Rate Your Agent</h3>
                                    <button onClick={() => setShowRatingModal(false)} className="text-charcoal-400 hover:text-charcoal-900"><X className="h-5 w-5" /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    {RATING_CATEGORIES.map(cat => (
                                        <div key={cat}>
                                            <label className="block text-sm font-bold text-charcoal-700 mb-2">{cat}</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setRatings({...ratings, [cat]: star})}
                                                        className="transition-transform hover:scale-110"
                                                    >
                                                        <Star className={`h-7 w-7 ${(ratings[cat] || 0) >= star ? "text-amber-400 fill-amber-400" : "text-charcoal-300"}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-sm font-bold text-charcoal-700 mb-2">Comment (optional)</label>
                                        <textarea
                                            className="w-full border border-charcoal-200 rounded-sm p-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            rows={3}
                                            value={ratingComment}
                                            onChange={(e) => setRatingComment(e.target.value)}
                                            placeholder="Share your experience..."
                                        />
                                    </div>
                                    <Button
                                        disabled={Object.keys(ratings).length < RATING_CATEGORIES.length || ratingLoading}
                                        onClick={handleSubmitRating}
                                        className="w-full h-12 bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm disabled:opacity-50 mt-4"
                                    >
                                        {ratingLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Rating"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Report Fraud Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-sm shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 overflow-hidden">
                        {reportSubmitted ? (
                            <div className="p-10 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                <h3 className="font-bold text-xl text-charcoal-900 mb-2">Report Received!</h3>
                                <p className="text-charcoal-500">Our admin team has been alerted immediately and will review the listing within 2 hours.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-rose-100 bg-rose-50">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="h-5 w-5 text-rose-600"/>
                                        <h3 className="font-heading font-bold text-charcoal-900 text-lg">Report Fraudulent Activity</h3>
                                    </div>
                                    <button onClick={() => setShowReportModal(false)} className="text-charcoal-400 hover:text-charcoal-900"><X className="h-5 w-5" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property</label>
                                        <select
                                            className="w-full bg-white border border-charcoal-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
                                            value={reportPropertyId ?? ""}
                                            onChange={(e) => setReportPropertyId(Number(e.target.value) || null)}
                                        >
                                            <option value="">Select a property...</option>
                                            {reportProperties.map(p => (
                                                <option key={p.id} value={p.id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-sm text-charcoal-600 font-medium">Select the reason that best describes the issue:</p>
                                    <div className="space-y-2">
                                        {REPORT_REASONS.map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => setSelectedReason(reason)}
                                                className={`w-full text-left px-4 py-3 rounded-sm border-2 transition-all text-sm font-bold ${selectedReason === reason ? "border-rose-500 bg-rose-50 text-rose-800" : "border-charcoal-100 hover:border-rose-200 hover:bg-rose-50 text-charcoal-700"}`}
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-2">Description (optional)</label>
                                        <textarea
                                            className="w-full border border-charcoal-200 rounded-sm p-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                            rows={3}
                                            value={reportDescription}
                                            onChange={(e) => setReportDescription(e.target.value)}
                                            placeholder="Provide additional details..."
                                        />
                                    </div>
                                    <Button
                                        disabled={!reportPropertyId || !selectedReason || reportLoading}
                                        onClick={handleSubmitReport}
                                        className="w-full h-12 mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm disabled:opacity-50"
                                    >
                                        {reportLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : <><Flag className="mr-2 h-4 w-4" /> Submit Report</>}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
