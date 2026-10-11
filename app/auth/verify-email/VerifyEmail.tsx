"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

type Status = "failed" | "resend" | "verified" | "verifying";

export function VerifyEmail({ token }: { token: string }) {
    const [status, setStatus] = useState<Status>(token ? "verifying" : "resend");
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    // Confirm as soon as the link is opened. Verifying is idempotent on the
    // backend, so a repeated call (React StrictMode, a refresh, an email
    // scanner pre-opening the link) is harmless.
    useEffect(() => {
        if (!token) return;
        let alive = true;
        api.verifyEmail(token)
            .then(() => {
                if (!alive) return;
                // The token is spent; drop it from the address bar.
                window.history.replaceState(null, "", "/auth/verify-email");
                setStatus("verified");
            })
            .catch(() => {
                if (alive) setStatus("failed");
            });
        return () => {
            alive = false;
        };
    }, [token]);

    async function handleResend(e: FormEvent) {
        e.preventDefault();
        setSending(true);
        setError("");
        try {
            await api.resendVerification(email.trim());
            setSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not send the link");
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                        <MailCheck className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                        Confirm your email
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    {status === "verifying" && (
                        <div className="flex flex-col items-center gap-3 text-sm text-slate-600">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            Confirming your email address...
                        </div>
                    )}

                    {status === "verified" && (
                        <div className="space-y-4 text-center">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <p className="text-sm text-slate-700">Your email address is confirmed. You can now sign in.</p>
                            <Link href="/auth/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
                                Sign in
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}

                    {(status === "failed" || status === "resend") && (
                        <div className="space-y-5">
                            {status === "failed" && (
                                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 border border-red-100">
                                    This link is invalid or has expired. Enter your email to get a new one.
                                </div>
                            )}
                            {sent ? (
                                <p className="text-sm text-slate-700 text-center">
                                    If <span className="font-semibold">{email.trim()}</span> has an account waiting to be confirmed,
                                    a new link is on its way. It expires in 24 hours.
                                </p>
                            ) : (
                                <form className="space-y-5" onSubmit={handleResend}>
                                    {status === "resend" && (
                                        <p className="text-sm text-slate-600">
                                            Enter the email you signed up with and we&apos;ll send the confirmation link again.
                                        </p>
                                    )}
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
                                    <Button type="submit" disabled={sending} size="lg" className="w-full">
                                        {sending ? "Sending..." : "Send confirmation link"}
                                    </Button>
                                </form>
                            )}
                            <div className="text-center">
                                <Link href="/auth/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
