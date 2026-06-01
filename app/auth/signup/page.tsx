"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCheck, Home, Key, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export default function SignupPage() {
    const router = useRouter();
    const [role, setRole] = useState("client");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await api.register({ email, password, fullName, phone, role });
            router.push("/auth/login");
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    const roles = [
        { id: "client", label: "Client", description: "Looking for properties", icon: UserCheck },
        { id: "owner", label: "Landlord", description: "Listing my property", icon: Home },
        { id: "agent", label: "Agent", description: "Managing properties", icon: Key },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="w-full max-w-xl">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-brand-100 text-brand-600 mb-4">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
                        Create your account
                    </h1>
                    <p className="mt-2 text-slate-500">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
                            Sign in
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Role Selection */}
                        <fieldset>
                            <legend className="block text-sm font-semibold text-slate-900 mb-3">
                                I am joining as a...
                            </legend>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {roles.map((r) => (
                                    <label
                                        key={r.id}
                                        className={`relative flex cursor-pointer rounded-xl border p-4 transition-all ${
                                            role === r.id
                                                ? "border-brand-400 bg-brand-50 ring-1 ring-brand-400"
                                                : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={r.id}
                                            className="sr-only"
                                            checked={role === r.id}
                                            onChange={() => setRole(r.id)}
                                        />
                                        <div className="flex flex-col items-center text-center w-full gap-2">
                                            <r.icon className={`h-5 w-5 ${role === r.id ? "text-brand-600" : "text-slate-400"}`} />
                                            <span className={`font-semibold text-sm ${role === r.id ? "text-brand-700" : "text-slate-900"}`}>
                                                {r.label}
                                            </span>
                                            <span className="text-xs text-slate-500">{r.description}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div className="space-y-5">
                            <div>
                                <label htmlFor="fullname" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="fullname"
                                    id="fullname"
                                    placeholder="Kwame Adams"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                                    />
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                        Phone Number
                                    </label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-900 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
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
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Must be at least 8 characters.
                                </p>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            size="lg"
                            className="w-full"
                        >
                            {loading ? "Creating account..." : "Create Account"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
