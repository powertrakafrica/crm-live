"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const result = await api.login({ email, password });
            localStorage.setItem("teps_access_token", result.accessToken);
            localStorage.setItem("teps_refresh_token", result.refreshToken);
            document.cookie = `teps_auth=${result.accessToken}; path=/; max-age=604800; SameSite=Lax`;
            window.dispatchEvent(new Event("teps-auth-changed"));

            const user = result.user as { role: string; isOnboardingComplete?: boolean } | undefined;
            const role = user?.role ?? "";
            const redirect = new URLSearchParams(window.location.search).get("redirect");

            if (redirect) {
                router.push(redirect);
            } else if (role === "admin") {
                const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3000";
                window.location.href = crmUrl;
            } else if (role === "agent" && user?.isOnboardingComplete === false) {
                router.push("/onboarding");
            } else if (role === "agent") {
                router.push("/agent");
            } else if (role === "client") {
                router.push("/client");
            } else if (role === "owner") {
                router.push("/owner");
            } else {
                router.push("/");
            }
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                        Welcome back
                    </h1>
                    <p className="mt-2 text-slate-500">
                        Sign in to your TEPS account to continue.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
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

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
                                    Password
                                </label>
                                <Link href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            size="lg"
                            className="w-full"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Don&apos;t have an account?{" "}
                            <Link href="/auth/signup" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
                                Create one
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
