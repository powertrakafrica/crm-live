"use client";

import { useState, useEffect } from "react";
import { Plus, X, MapPin, CheckSquare, UploadCloud, CheckCircle2, Globe, ShieldCheck, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ownerApi } from "@/lib/api";

interface OwnerProperty {
    id: number;
    title: string;
    location: string;
    category: string;
    isVerified: boolean;
    status: string;
    verificationStatus: string;
    images: { url: string; isPrimary: boolean }[];
}

export function OwnerListings() {
    const [wizardStep, setWizardStep] = useState(0);
    const [privacyMode, setPrivacyMode] = useState(false);
    const [listings, setListings] = useState<OwnerProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        ownerApi.properties()
            .then((data: any) => {
                const mapped = (data ?? []).map((p: any) => ({
                    ...p,
                    status: mapDbStatus(p.status),
                }));
                setListings(mapped);
            })
            .catch((err: any) => setError(err.message || "Failed to load properties"))
            .finally(() => setLoading(false));
    }, []);

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

    const toggleStatus = (id: number, current: string) => {
        const next = current === "Available" ? "Under Offer" : current === "Under Offer" ? "Off-Market" : "Available";
        setListings(listings.map(l => l.id === id ? { ...l, status: next } : l));
    };

    const getStatusVariant = (status: string) => {
        if (status === "Available") return "verified";
        if (status === "Pending Review") return "secondary";
        return "default";
    };

    return (
        <div className="space-y-6">

            {/* Standard Dashboard View */}
            {wizardStep === 0 && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-charcoal-950">Property Portfolio</h2>
                            <p className="text-charcoal-500 font-medium">Manage availability and create new high-conversion listings.</p>
                        </div>
                        <Button onClick={() => setWizardStep(1)} className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-sm h-11 px-6">
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
                                            <th className="px-6 py-4 font-bold tracking-wider">Availability Toggle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listings.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-12 text-center text-charcoal-500 font-medium">No properties found.</td></tr>
                                        ) : listings.map((item) => (
                                            <tr key={item.id} className="bg-white border-b border-charcoal-100 hover:bg-charcoal-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-charcoal-900">{item.title}</div>
                                                    <div className="text-xs text-charcoal-500 flex items-center mt-1">
                                                        <MapPin className="h-3 w-3 mr-1" /> {item.location}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-charcoal-700">{item.category}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.isVerified ? (
                                                        <Badge variant="verified" className="shadow-none"><ShieldCheck className="h-3 w-3 mr-1"/> TEPS Verified</Badge>
                                                    ) : (
                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-sm border border-amber-200">Unverified</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleStatus(item.id, item.status)}
                                                        className={`h-8 font-bold border-none shadow-none text-xs w-28 justify-center ${
                                                            item.status === 'Available' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                                            item.status === 'Under Offer' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                                                            item.status === 'Pending Review' ? 'bg-charcoal-100 text-charcoal-500 cursor-not-allowed opacity-50' :
                                                            'bg-red-100 text-red-700 hover:bg-red-200'
                                                        }`}
                                                        disabled={item.status === "Pending Review"}
                                                    >
                                                        {item.status}
                                                    </Button>
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

            {/* Smart Listing Wizard Modal Overlay */}
            {wizardStep > 0 && (
                <div className="fixed inset-0 bg-charcoal-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm pt-10 pb-10">
                    <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-charcoal-100 flex justify-between items-center bg-charcoal-50 shrink-0">
                            <div>
                                <h3 className="font-heading font-bold text-xl text-charcoal-950 flex items-center gap-2">
                                    <Home className="h-5 w-5 text-brand-600" />
                                    Smart Listing Wizard
                                </h3>
                                <p className="text-sm text-charcoal-500 font-medium mt-1">Step {wizardStep} of 4</p>
                            </div>
                            <button
                                onClick={() => setWizardStep(0)}
                                className="h-8 w-8 flex items-center justify-center rounded-sm bg-white border border-charcoal-200 text-charcoal-400 hover:text-charcoal-900 transition-colors shadow-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-charcoal-100 shrink-0">
                            <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${(wizardStep / 4) * 100}%` }}></div>
                        </div>

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
                                        {['Rent', 'Sale', 'Rent-to-Own'].map(t => (
                                            <div key={t} className="border-2 border-charcoal-200 rounded-sm p-3 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors">
                                                <span className="font-bold text-sm text-charcoal-800">{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Property Title</label>
                                        <input type="text" placeholder="e.g. 2 Bedroom Semi-Detached House" className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Price (GH₵)</label>
                                            <input type="number" placeholder="5,000" className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Category</label>
                                            <select className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-3 outline-none font-medium text-charcoal-900 shadow-sm">
                                                <option>Plot of Land</option>
                                                <option>Self-Contained</option>
                                                <option>Gated Community</option>
                                            </select>
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
                                        <select className="col-span-1 border border-charcoal-200 text-sm rounded-sm px-3 py-3 shadow-sm font-medium outline-none focus:border-brand-500">
                                            <option>Greater Accra</option>
                                            <option>Ashanti</option>
                                        </select>
                                        <select className="col-span-1 border border-charcoal-200 text-sm rounded-sm px-3 py-3 shadow-sm font-medium outline-none focus:border-brand-500">
                                            <option>Ayawaso West</option>
                                            <option>Osu Klottey</option>
                                        </select>
                                    </div>

                                    <div className="relative h-48 w-full bg-blue-50 border border-blue-200 rounded-sm overflow-hidden flex items-center justify-center group cursor-pointer">
                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
                                        {privacyMode ? (
                                            <div className="relative h-24 w-24 rounded-full bg-brand-600/20 border-2 border-brand-500 flex items-center justify-center animate-pulse">
                                                <span className="text-[10px] font-bold text-brand-800 uppercase tracking-widest text-center leading-tight bg-white/80 px-2 py-1 rounded-sm">500m<br/>Radius</span>
                                            </div>
                                        ) : (
                                            <div className="relative group-hover:-translate-y-2 transition-transform">
                                                <MapPin className="h-10 w-10 text-brand-600 drop-shadow-md" fill="#10b981" />
                                            </div>
                                        )}
                                        <span className="absolute bottom-2 right-2 text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-sm">Click map to pin</span>
                                    </div>

                                    <div className="bg-charcoal-50 border border-charcoal-200 rounded-sm p-4 flex items-start gap-3">
                                        <div className="shrink-0 pt-0.5">
                                            <div
                                                className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${privacyMode ? "bg-brand-600" : "bg-charcoal-300"}`}
                                                onClick={() => setPrivacyMode(!privacyMode)}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${privacyMode ? "translate-x-5" : "translate-x-0"}`}></div>
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
                                        <p className="text-sm text-charcoal-500">Select local value-add features that drive conversions in Ghana.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Walled & Gated', 'Borehole Access', 'Prepaid Meter', 'Constant Water Flow', 'Proximity to Trotro', 'Tarred Road Access', 'Registered Land Title', 'Security Guard Post'].map((feature, i) => (
                                            <label key={feature} className="flex items-center gap-3 p-3 border border-charcoal-200 rounded-sm cursor-pointer hover:bg-charcoal-50 transition-colors">
                                                <input type="checkbox" className="h-4 w-4 text-brand-600 rounded-sm border-charcoal-300 focus:ring-brand-500" defaultChecked={i < 3} />
                                                <span className="text-sm font-semibold text-charcoal-800">{feature}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Media Upload */}
                            {wizardStep === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg text-charcoal-900">Media Upload</h4>
                                        <p className="text-sm text-charcoal-500">Hook buyers with stunning visuals. Photos, videos, and 360° tours.</p>
                                    </div>

                                    <div
                                        className="border-2 border-dashed border-brand-300 bg-brand-50/50 rounded-sm p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-brand-50 transition-colors text-center"
                                        onClick={() => alert("Simulating file vault interaction...")}
                                    >
                                        <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-brand-600 border border-brand-100">
                                            <UploadCloud className="h-8 w-8" />
                                        </div>
                                        <p className="text-base font-bold text-charcoal-900 mb-1">Drag and drop assets here</p>
                                        <p className="text-sm text-charcoal-500 mb-4 max-w-sm mx-auto">Upload standard photos, MP4 walkthroughs, or .zip files containing 360-degree panorama metadata.</p>
                                        <Button variant="outline" className="border-brand-200 font-bold bg-white shadow-sm text-brand-700">Browse Files</Button>
                                    </div>

                                    <div className="bg-charcoal-50 rounded-sm border border-charcoal-200 p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-sm font-bold text-charcoal-900">3 Photos ready for upload</span>
                                        </div>
                                    </div>
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
                                    onClick={() => {
                                        alert("Listing saved as Draft! Proceeding to Verification.");
                                        setWizardStep(0);
                                    }}
                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold h-11 px-8 shadow-sm"
                                >
                                    <ShieldCheck className="h-4 w-4 mr-2" /> Save & Request Verification
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
