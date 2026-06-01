"use client";

import { useState } from "react";
import { Search, Map as MapIcon, ShieldCheck, CheckCircle2, ChevronRight, CreditCard, Smartphone, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { paymentApi } from "@/lib/api";

export function ClientServices() {
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select, 2: Form, 3: Checkout
    const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [paymentResult, setPaymentResult] = useState<{ paymentId: number; providerReference: string; checkoutUrl?: string } | null>(null);

    // Form states
    const [requirements, setRequirements] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("024 123 4567");
    const [network, setNetwork] = useState("MTN MoMo");

    const services = [
        {
            id: "property_search",
            title: "Property Search",
            icon: <Search className="h-6 w-6 text-brand-600" />,
            description: "A TEPS Agent will hunt down and vet properties matching your exact specifications.",
            price: "GH₵ 250",
            feeLabel: "Base Search Fee",
            fields: "Specific requirements (e.g. Must have a borehole, close to main road)"
        },
        {
            id: "verification_req",
            title: "Verification Request",
            icon: <ShieldCheck className="h-6 w-6 text-brand-600" />,
            description: "Found a property on another site? We'll send an Agent to verify its legitimacy and condition.",
            price: "GH₵ 150",
            feeLabel: "Audit Fee",
            fields: "Paste the URL of the property or the owner's WhatsApp number"
        },
        {
            id: "guided_viewing",
            title: "Guided Viewing",
            icon: <MapIcon className="h-6 w-6 text-brand-600" />,
            description: "A verified TEPS Agent will escort you safely to properties you've selected.",
            price: "GH₵ 200",
            feeLabel: "Escort Fee",
            fields: "Preferred viewing dates and the Property IDs you want to see"
        }
    ];

    const currentService = services.find(s => s.id === selectedService);

    const serviceToPurpose: Record<string, string> = {
        property_search: "SearchFee",
        verification_req: "VerificationFee",
        guided_viewing: "ViewingFee",
    };

    const serviceToAmount: Record<string, number> = {
        property_search: 250_00,
        verification_req: 150_00,
        guided_viewing: 200_00,
    };

    const networkToMethod: Record<string, string> = {
        "MTN MoMo": "MTN_MoMo",
        "Telecel Cash": "Telecel_Cash",
        "AT Money": "AT_Money",
    };

    const handleCheckout = async () => {
        if (!currentService) return;
        setIsProcessing(true);
        setPaymentError("");
        try {
            const payload = {
                amount: serviceToAmount[currentService.id],
                purpose: serviceToPurpose[currentService.id],
                provider: paymentMethod === "momo" ? "Hubtel" : "Paystack",
                paymentMethod: paymentMethod === "momo" ? networkToMethod[network] : "Card",
                phoneNumber: paymentMethod === "momo" ? phoneNumber.replace(/\s/g, "") : undefined,
                metadata: { serviceId: currentService.id, requirements },
            };
            const result = (await paymentApi.initiate(payload)) as {
                payment: { id: number; providerReference: string };
                checkoutUrl?: string;
            };
            setPaymentResult({
                paymentId: result.payment.id,
                providerReference: result.payment.providerReference,
                checkoutUrl: result.checkoutUrl,
            });
            setIsProcessing(false);
            setIsSuccess(true);

            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
                return;
            }

            setTimeout(() => {
                setStep(1);
                setSelectedService(null);
                setIsSuccess(false);
                setRequirements("");
                setPaymentResult(null);
            }, 6000);
        } catch (err: any) {
            setIsProcessing(false);
            setPaymentError(err.message || "Payment failed. Please try again.");
        }
    };

    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">Payment Confirmed!</h3>
                <p className="text-charcoal-500 text-center max-w-md">Your {currentService?.title} request has been successfully created. We've sent a receipt to your email and WhatsApp.</p>
                <div className="mt-8 p-4 bg-charcoal-50 border border-charcoal-200 rounded-sm w-full max-w-sm">
                    <p className="text-sm font-bold text-charcoal-900 flex justify-between"><span>Amount Paid:</span> <span className="text-brand-700">{currentService?.price}</span></p>
                    <p className="text-sm font-bold text-charcoal-900 flex justify-between mt-2"><span>Tracking ID:</span> <span className="font-mono">{paymentResult?.providerReference ?? "N/A"}</span></p>
                    {paymentMethod === "momo" && (
                        <p className="text-xs text-charcoal-500 mt-2 text-center">Please check your phone to approve the Mobile Money prompt.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-heading font-bold text-charcoal-950 tracking-tight">Service Marketplace</h2>
                <p className="text-charcoal-500 font-medium mt-1">Hire verified TEPS Agents for on-the-ground professional assistance.</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between relative mb-8">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-charcoal-200 z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-600 z-0 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                
                {[
                    { num: 1, label: "Select Service" },
                    { num: 2, label: "Booking Details" },
                    { num: 3, label: "Checkout" }
                ].map((s) => (
                    <div key={s.num} className="relative z-10 flex flex-col items-center bg-charcoal-50 px-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${step >= s.num ? "bg-brand-600 text-white" : "bg-white border-2 border-charcoal-300 text-charcoal-400"}`}>
                            {step > s.num ? <CheckCircle2 className="h-5 w-5" /> : s.num}
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold mt-2 absolute -bottom-6 whitespace-nowrap ${step >= s.num ? "text-brand-800" : "text-charcoal-400"}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Step 1: Select Service */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                    {services.map(service => (
                        <Card 
                            key={service.id} 
                            onClick={() => setSelectedService(service.id)}
                            className={`cursor-pointer transition-all border-2 relative overflow-hidden ${selectedService === service.id ? "border-brand-600 shadow-md bg-brand-50/20" : "border-charcoal-200 hover:border-brand-300"}`}
                        >
                            <CardContent className="p-6 flex flex-col h-full">
                                <div className="h-12 w-12 bg-charcoal-50 rounded-full flex items-center justify-center mb-4 border border-charcoal-100">
                                    {service.icon}
                                </div>
                                <h3 className="font-bold text-lg text-charcoal-900 mb-2">{service.title}</h3>
                                <p className="text-sm text-charcoal-600 mb-6 flex-1">{service.description}</p>
                                
                                <div className="pt-4 border-t border-charcoal-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">{service.feeLabel}</span>
                                    <span className="font-bold text-lg text-brand-700">{service.price}</span>
                                </div>
                            </CardContent>
                            {selectedService === service.id && (
                                <div className="absolute top-4 right-4 text-brand-600 animate-in zoom-in duration-200">
                                    <CheckCircle2 className="h-6 w-6 fill-brand-100" />
                                </div>
                            )}
                        </Card>
                    ))}

                    <div className="col-span-1 md:col-span-3 flex justify-end mt-4">
                        <Button 
                            disabled={!selectedService} 
                            onClick={() => setStep(2)}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 h-12 shadow-sm"
                        >
                            Continue to Booking <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Form */}
            {step === 2 && currentService && (
                <div className="pt-6 animate-in slide-in-from-right-8 duration-300">
                    <Card className="border-charcoal-200 shadow-sm">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-charcoal-100">
                                <div className="h-12 w-12 bg-brand-50 rounded-full flex items-center justify-center border border-brand-100">
                                    {currentService.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-charcoal-900">{currentService.title} Details</h3>
                                    <p className="text-sm text-charcoal-500">{currentService.feeLabel}: <strong className="text-brand-700">{currentService.price}</strong></p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-charcoal-900 mb-2">
                                        {currentService.fields}
                                    </label>
                                    <textarea 
                                        rows={4}
                                        value={requirements}
                                        onChange={(e) => setRequirements(e.target.value)}
                                        placeholder="Please provide as much detail as possible so our agents can best assist you..."
                                        className="w-full p-4 bg-charcoal-50 border border-charcoal-200 rounded-sm focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="flex justify-between items-center pt-4">
                                    <Button variant="ghost" onClick={() => setStep(1)} className="text-charcoal-600 font-bold hover:bg-charcoal-100">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button 
                                        disabled={requirements.length < 5}
                                        onClick={() => setStep(3)}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 h-12 shadow-sm disabled:opacity-50"
                                    >
                                        Proceed to Payment <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 3: Checkout Modal Sim */}
            {step === 3 && currentService && (
                <div className="pt-6 animate-in slide-in-from-right-8 duration-300">
                    <div className="max-w-2xl mx-auto">
                        <Card className="border-brand-200 border-2 shadow-lg overflow-hidden">
                            {/* "Paystack/Hubtel" Header simulation */}
                            <div className="bg-charcoal-950 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold tracking-tight text-lg">Secure Checkout</h3>
                                    <p className="text-charcoal-400 text-xs">Powered by Hubtel & Paystack</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-charcoal-400 uppercase tracking-widest font-bold mb-1">Total</p>
                                    <p className="font-bold text-2xl text-accent-400">{currentService.price}</p>
                                </div>
                            </div>

                            <CardContent className="p-8 bg-charcoal-50">
                                <h4 className="font-bold text-charcoal-900 mb-4 text-sm uppercase tracking-wide">Select Payment Method</h4>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div 
                                        onClick={() => setPaymentMethod("momo")}
                                        className={`p-4 border-2 rounded-sm cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors ${paymentMethod === "momo" ? "border-green-500 bg-green-50/50" : "border-charcoal-200 hover:border-green-300 bg-white"}`}
                                    >
                                        <Smartphone className={`h-8 w-8 ${paymentMethod === "momo" ? "text-green-600" : "text-charcoal-400"}`} />
                                        <span className={`font-bold text-sm ${paymentMethod === "momo" ? "text-green-800" : "text-charcoal-600"}`}>Mobile Money</span>
                                    </div>
                                    <div 
                                        onClick={() => setPaymentMethod("card")}
                                        className={`p-4 border-2 rounded-sm cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors ${paymentMethod === "card" ? "border-brand-600 bg-brand-50/50" : "border-charcoal-200 hover:border-brand-300 bg-white"}`}
                                    >
                                        <CreditCard className={`h-8 w-8 ${paymentMethod === "card" ? "text-brand-600" : "text-charcoal-400"}`} />
                                        <span className={`font-bold text-sm ${paymentMethod === "card" ? "text-brand-800" : "text-charcoal-600"}`}>Credit / Debit Card</span>
                                    </div>
                                </div>

                                {paymentMethod === "momo" && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div>
                                            <label className="block text-xs font-bold text-charcoal-600 uppercase tracking-wider mb-2">Mobile Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 024 XXX XXXX"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full p-4 bg-white border border-charcoal-200 rounded-sm font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-charcoal-600 uppercase tracking-wider mb-2">Network</label>
                                            <select
                                                value={network}
                                                onChange={(e) => setNetwork(e.target.value)}
                                                className="w-full p-4 bg-white border border-charcoal-200 rounded-sm font-bold text-charcoal-900 focus:ring-2 focus:ring-green-500 outline-none"
                                            >
                                                <option>MTN MoMo</option>
                                                <option>Telecel Cash</option>
                                                <option>AT Money</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === "card" && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div>
                                            <label className="block text-xs font-bold text-charcoal-600 uppercase tracking-wider mb-2">Card Number</label>
                                            <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-4 bg-white border border-charcoal-200 rounded-sm font-mono text-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-charcoal-600 uppercase tracking-wider mb-2">Expiry</label>
                                                <input type="text" placeholder="MM/YY" className="w-full p-4 bg-white border border-charcoal-200 rounded-sm font-mono text-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-charcoal-600 uppercase tracking-wider mb-2">CVV</label>
                                                <input type="password" placeholder="***" className="w-full p-4 bg-white border border-charcoal-200 rounded-sm font-mono text-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {paymentError && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm text-sm font-bold text-red-700">{paymentError}</div>
                                )}

                                <div className="mt-8 flex gap-4">
                                    <Button variant="outline" onClick={() => setStep(2)} disabled={isProcessing} className="w-1/3 h-14 font-bold border-charcoal-200 hover:bg-white text-charcoal-600">
                                        Cancel
                                    </Button>
                                    <Button onClick={handleCheckout} disabled={isProcessing} className={`w-2/3 h-14 font-bold text-white shadow-lg transition-all ${paymentMethod === 'momo' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-600 hover:bg-brand-700'}`}>
                                        {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : `Pay ${currentService.price}`}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
