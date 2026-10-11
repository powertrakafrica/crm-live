"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            // The backend answers identically whether or not the account exists
            // (no account enumeration), so success here only means "request accepted".
            await api.forgotPassword(email.trim());
            setSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not send the reset link");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                        <KeyRound className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                        Forgot your password?
                    </h1>
                    <p className="mt-2 text-slate-500">
                        Enter your account email and we&apos;ll send you a reset link.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    {sent ? (
                        <div className="space-y-4 text-center">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600">
                                <MailCheck className="h-6 w-6" />
                            </div>
                            <p className="text-sm text-slate-700">
                                If an account exists for <span className="font-semibold">{email.trim()}</span>, a reset link
                                has been sent to that email address, and by WhatsApp if the account has a phone number. The
                                link expires in 1 hour.
                            </p>
                            <p className="text-xs text-slate-500">
                                Nothing arrived? Check your spam folder, or try again.
                            </p>
                            <Button type="button" variant="outline" className="w-full" onClick={() => setSent(false)}>
                                Send again
                            </Button>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 border border-red-100">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <Button type="submit" disabled={loading} size="lg" className="w-full">
                                {loading ? "Sending..." : "Send reset link"}
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/auth/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
