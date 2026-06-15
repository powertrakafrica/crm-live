"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, UserCircle, LogOut, ChevronDown, LayoutDashboard, Building2, X, Home, MapPin, Users } from "lucide-react";
import { Button } from "./ui/Button";

interface AuthUser {
    id: number;
    fullName: string;
    email: string;
    role: string;
}

export default function Header() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    function checkAuth() {
        const token = localStorage.getItem("teps_access_token");
        const wasLoggedIn = isLoggedIn;
        const nowLoggedIn = !!token;
        if (wasLoggedIn !== nowLoggedIn) {
            setIsLoggedIn(nowLoggedIn);
            if (nowLoggedIn) fetchUser();
            else setUser(null);
        }
    }

    useEffect(() => {
        checkAuth();
        window.addEventListener("storage", checkAuth);
        window.addEventListener("focus", checkAuth);
        window.addEventListener("teps-auth-changed", checkAuth);
        return () => {
            window.removeEventListener("storage", checkAuth);
            window.removeEventListener("focus", checkAuth);
            window.removeEventListener("teps-auth-changed", checkAuth);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchUser() {
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9001/api";
            const token = localStorage.getItem("teps_access_token");
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data as AuthUser);
            }
        } catch {
            // ignore
        }
    }

    function handleLogout() {
        localStorage.removeItem("teps_access_token");
        localStorage.removeItem("teps_refresh_token");
        document.cookie = "teps_auth=; path=/; max-age=0; SameSite=Lax";
        window.dispatchEvent(new Event("teps-auth-changed"));
        setIsLoggedIn(false);
        setUser(null);
        setMenuOpen(false);
        router.push("/auth/login");
    }

    function getDashboardPath(role: string): string {
        switch (role) {
            case "agent": return "/agent";
            case "client": return "/client";
            case "owner": return "/owner";
            case "admin": return process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3000";
            default: return "/";
        }
    }

    function getDashboardLabel(role: string): string {
        switch (role) {
            case "agent": return "Agent Dashboard";
            case "client": return "My Dashboard";
            case "owner": return "Owner Dashboard";
            case "admin": return "Admin Console";
            default: return "Dashboard";
        }
    }

    const navLinks = [
        { href: "/", label: "Home", icon: Home },
        { href: "/properties", label: "Properties", icon: MapPin },
        { href: "/regions", label: "Regions", icon: MapPin },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <span className="text-2xl font-heading font-bold tracking-tight text-brand-600">TEPS</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Search */}
                <div className="hidden lg:flex flex-1 items-center justify-center px-8 max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search properties..."
                            className="w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {isLoggedIn && user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center gap-2 rounded-full border border-slate-200 pl-3 pr-1.5 py-1 hover:bg-slate-50 transition-colors"
                            >
                                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user.fullName}</span>
                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
                                    <UserCircle className="h-5 w-5 text-brand-600" />
                                </div>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden z-50 animate-scale-in">
                                    <div className="p-4 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                                        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{user.role}</span>
                                    </div>
                                    <div className="py-1">
                                        <Link
                                            href={getDashboardPath(user.role)}
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            <LayoutDashboard className="h-4 w-4 text-slate-400" />
                                            {getDashboardLabel(user.role)}
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/auth/login" className="hidden sm:block">
                                <Button variant="ghost" size="sm">Sign In</Button>
                            </Link>
                            <Link href="/auth/signup">
                                <Button variant="primary" size="sm" className="hidden sm:flex">Get Started</Button>
                            </Link>
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm animate-fade-in"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl animate-slide-in-right">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <span className="text-lg font-heading font-bold text-brand-600">Menu</span>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <nav className="p-4 space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <link.icon className="h-4 w-4 text-slate-400" />
                                    {link.label}
                                </Link>
                            ))}
                            <hr className="my-3 border-slate-100" />
                            <Link
                                href="/auth/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Users className="h-4 w-4 text-slate-400" />
                                Sign In
                            </Link>
                            <Link
                                href="/auth/signup"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                            >
                                <Users className="h-4 w-4" />
                                Get Started
                            </Link>
                        </nav>
                    </div>
                </>
            )}
        </header>
    );
}
