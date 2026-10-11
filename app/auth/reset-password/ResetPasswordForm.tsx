"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

// Matches the backend resetPasswordSchema (newPassword: 8–128 chars).
const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm({ token }: { token: string }) {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await api.resetPassword(token, password);
            // The token is spent; drop it from the address bar and history entry.
            window.history.replaceState(null, "", "/auth/reset-password");
            setDone(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not reset your password");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all";

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                        <KeyRound className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                        Choose a new password
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    {!token ? (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-slate-700">
                                This reset link is missing its token. Open the link from your WhatsApp message again, or
                                request a new one.
                            </p>
                            <Link href="/auth/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                                Request a new link
                            </Link>
                        </div>
                    ) : done ? (
                        <div className="space-y-4 text-center">
                            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <p className="text-sm text-slate-700">Your password has been reset.</p>
                            <Link href="/auth/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
                                Sign in
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 border border-red-100">
                                    {error}{" "}
                                    {error === "Invalid or expired token" && (
                                        <Link href="/auth/forgot-password" className="underline">
                                            Request a new link
                                        </Link>
                                    )}
                                </div>
                            )}
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                    New password
                                </label>
                                <div className="relative">
                                    <input
                                        id="new-password"
                                        name="new-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        minLength={MIN_PASSWORD_LENGTH}
                                        maxLength={128}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="At least 8 characters"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                    Confirm new password
                                </label>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    maxLength={128}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className={inputClass}
                                    placeholder="Repeat the password"
                                />
                            </div>
                            <Button type="submit" disabled={loading} size="lg" className="w-full">
                                {loading ? "Saving..." : "Reset password"}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
