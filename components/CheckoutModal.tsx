'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, CreditCard, HelpCircle, Loader2, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';
import { paymentApi } from '@/lib/api';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    purpose: string;
    reference: string;
    propertyId?: number;
    provider?: 'Hubtel' | 'Paystack';
    phoneNumber?: string;
    email?: string;
    onSuccess?: () => void;
}

export default function CheckoutModal({
    isOpen,
    onClose,
    amount,
    purpose,
    reference,
    propertyId,
    provider = 'Hubtel',
    phoneNumber: initialPhone,
    email: initialEmail,
    onSuccess,
}: CheckoutModalProps) {
    const [status, setStatus] = useState<'idle' | 'processing' | 'prompt' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(initialPhone ?? '');
    const [email, setEmail] = useState(initialEmail ?? '');
    const [selectedProvider, setSelectedProvider] = useState(provider);

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setError('');
            setPhoneNumber(initialPhone ?? '');
            setEmail(initialEmail ?? '');
            setSelectedProvider(provider);
        }
    }, [isOpen, initialPhone, initialEmail, provider]);

    if (!isOpen) return null;

    const handlePayment = async () => {
        if (!phoneNumber.trim()) {
            setError('Please enter your mobile money number.');
            return;
        }
        if (selectedProvider === 'Paystack' && !email.trim()) {
            setError('Please enter your email for Paystack.');
            return;
        }

        setStatus('processing');
        setError('');

        try {
            const res = await paymentApi.initiate({
                amount: Math.round(amount * 100),
                currency: 'GHS',
                purpose,
                propertyId,
                provider: selectedProvider,
                paymentMethod: selectedProvider === 'Hubtel' ? 'MTN_MoMo' : undefined,
                phoneNumber: phoneNumber.trim(),
                email: email.trim() || undefined,
                metadata: { reference },
            });

            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
                return;
            }
            setStatus('prompt');
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Payment initiation failed. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl relative flex flex-col items-center text-center">
                    <CheckCircle className="h-16 w-16 text-brand-500 mb-4" />
                    <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">Payment Successful</h2>
                    <p className="text-slate-500 mb-6">
                        Your payment for {purpose} has been processed.
                    </p>
                    <Button
                        onClick={() => {
                            setStatus('idle');
                            onSuccess?.();
                            onClose();
                        }}
                        size="lg"
                        className="w-full"
                    >
                        Return to Platform
                    </Button>
                </div>
            </div>
        );
    }

    if (status === 'prompt') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl relative flex flex-col items-center text-center">
                    <Smartphone className="h-16 w-16 text-brand-500 mb-4" />
                    <h2 className="text-2xl font-heading font-bold text-slate-900 mb-2">Approve on Your Phone</h2>
                    <p className="text-slate-500 mb-6">
                        A mobile money prompt has been sent to <strong>{phoneNumber}</strong>. Please approve the payment of <strong>GH₵ {amount.toFixed(2)}</strong>.
                    </p>
                    <Button
                        onClick={() => {
                            setStatus('idle');
                            onSuccess?.();
                            onClose();
                        }}
                        size="lg"
                        className="w-full"
                    >
                        Done
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-50 p-6 flex items-center justify-between border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-heading font-bold text-slate-900">Secure Payment</h2>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <ShieldIcon className="h-3.5 w-3.5" />
                            Secured by TEPS Trust Layer
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <p className="text-sm text-slate-500 mb-0.5">Paying for</p>
                            <p className="font-semibold text-slate-900">{purpose}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500 mb-0.5">Amount</p>
                            <p className="font-heading font-bold text-2xl text-brand-700">GH₵ {amount.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        {/* Provider selection */}
                        <div className="space-y-2">
                            <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${selectedProvider === 'Hubtel' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                <input
                                    type="radio"
                                    name="provider"
                                    className="text-brand-600 focus:ring-brand-500 w-5 h-5 rounded-md accent-brand-600"
                                    checked={selectedProvider === 'Hubtel'}
                                    onChange={() => setSelectedProvider('Hubtel')}
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">Mobile Money / Hubtel</p>
                                    <p className="text-xs text-slate-500">MTN, Vodafone, Telecel</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${selectedProvider === 'Paystack' ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300 opacity-60'}`}>
                                <input
                                    type="radio"
                                    name="provider"
                                    className="text-brand-600 focus:ring-brand-500 w-5 h-5 rounded-md accent-brand-600"
                                    checked={selectedProvider === 'Paystack'}
                                    onChange={() => setSelectedProvider('Paystack')}
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">Credit / Debit Card</p>
                                    <p className="text-xs text-slate-500">Visa, Mastercard (Beta)</p>
                                </div>
                                <CreditCard className="h-6 w-6 text-slate-400" />
                            </label>
                        </div>

                        {/* Contact inputs */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. 0244 123 456"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
                                />
                            </div>
                            {selectedProvider === 'Paystack' && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
                                    />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-medium text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handlePayment}
                        disabled={status === 'processing'}
                        size="lg"
                        className="w-full"
                    >
                        {status === 'processing' ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            `Pay GH₵ ${amount.toFixed(2)}`
                        )}
                    </Button>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 text-center border-t border-slate-100 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Payments are encrypted and safely held in escrow.
                </div>
            </div>
        </div>
    );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
    );
}
