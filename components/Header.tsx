"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, UserCircle, LogOut, ChevronDown, LayoutDashboard, X, Home, MapPin, Users, Bell } from "lucide-react";
import { Button } from "./ui/Button";
import { api, propertiesApi } from "@/lib/api";

interface AuthUser {
    id: number;
    fullName: string;
    email: string;
    role: string;
}

// A minimal live-property shape for the search typeahead. The full Property
// wire type lives in the portals; here we only need enough to render a result
// row (title + location) and route to its detail page.
interface SearchSuggestion {
    id: number;
    title: string;
    location: string;
}

export default function Header() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    // Debounce timer for the search typeahead (spec gap #11). Kept in a ref so
    // each keystroke resets the pending fetch rather than stacking requests.
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Determine login state from the backend (cookies, no JS-readable token).
    // A 401 on /me may just mean the 15m access cookie expired while the 7d
    // refresh cookie is still valid — so attempt one refresh+retry before
    // concluding logged-out. We go through api.me() (lib/api's fetchMe) so the
    // refresh is serialized through the shared refreshAccessToken singleton —
    // the same path every other API call uses. Issuing a *separate* refresh
    // here (as this used to) raced the singleton refresh that portal data
    // calls fire on the same page load: both hit /auth/refresh, the backend
    // rotated the refresh token, the losing refresh presented the now-deleted
    // token, got 401 "Session expired", and logged the user out ~15m in.
    //
    // fetchMe does ONE silent refresh and rethrows on failure (it does NOT
    // redirect like fetchJson's 401 handler), so genuinely logged-out visitors
    // on public pages still just see the logged-out header — no bounce.
    async function fetchUser(): Promise<AuthUser | null> {
        try {
            return (await api.me()) as AuthUser | null;
        } catch {
            return null;
        }
    }

    async function syncAuth() {
        const u = await fetchUser();
        setIsLoggedIn(!!u);
        setUser(u);
    }

    useEffect(() => {
        void syncAuth();
        const onAuthChanged = () => void syncAuth();
        window.addEventListener("teps-auth-changed", onAuthChanged);
        return () => window.removeEventListener("teps-auth-changed", onAuthChanged);
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

    async function handleLogout() {
        // Revokes the server session + clears both HttpOnly cookies.
        await api.logout().catch(() => {});
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
            default: return "/";
        }
    }

    function getDashboardLabel(role: string): string {
        switch (role) {
            case "agent": return "Agent Dashboard";
            case "client": return "My Dashboard";
            case "owner": return "Owner Dashboard";
            default: return "Dashboard";
        }
    }

    // Header search → public /properties listing page with the term as a query
    // param. The listing page owns the full filter UI + server-side `search`
    // (case-insensitive across title/location/description/district). Enter or
    // clicking the icon submits; empty query just goes to the browse page.
    function submitSearch() {
        const q = searchQuery.trim();
        router.push(q ? `/properties?search=${encodeURIComponent(q)}` : "/properties");
        setMobileMenuOpen(false);
        setShowSuggestions(false);
    }

    // Debounced typeahead (spec gap #11): ~300ms after the user stops typing,
    // ask the public listing endpoint for up to 5 live properties matching the
    // term (server-side case-insensitive search across title/location/
    // description/district). The same `GET /properties?search=` the browse page
    // uses — no new API. Below 2 chars we clear the dropdown (too noisy).
    useEffect(() => {
        const q = searchQuery.trim();
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (q.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        searchDebounceRef.current = setTimeout(() => {
            propertiesApi
                .list({ search: q, limit: "5", status: "Live" })
                .then((res: any) => {
                    const rows: any[] = res.data ?? [];
                    setSuggestions(rows.map((r) => ({ id: r.id, title: r.title, location: r.location })));
                    setShowSuggestions(true);
                })
                .catch(() => {
                    setSuggestions([]);
                    setShowSuggestions(false);
                });
        }, 300);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery]);

    function selectSuggestion(id: number) {
        setShowSuggestions(false);
        setSearchQuery("");
        setSuggestions([]);
        setMobileMenuOpen(false);
        router.push(`/property/${id}`);
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") submitSearch();
                                if (e.key === "Escape") setShowSuggestions(false);
                            }}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => {
                                // Delay so a mousedown on a suggestion row
                                // registers before the dropdown unmounts.
                                setTimeout(() => setShowSuggestions(false), 150);
                            }}
                            placeholder="Search properties..."
                            className="w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-10 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }}
                                className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                aria-label="Clear search"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={submitSearch}
                            aria-label="Search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                            <Search className="h-4 w-4" />
                        </button>

                        {/* Typeahead dropdown (spec gap #11). Renders up to 5
                            live-property matches; clicking one routes to its
                            detail page. Enter/clicking the search icon still
                            goes to the full filtered /properties page. */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50">
                                {suggestions.map((s) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        // mousedown fires before the input's
                                        // blur hides the dropdown.
                                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s.id); }}
                                        className="flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-slate-900 truncate">{s.title}</span>
                                            <span className="block text-xs text-slate-500 truncate">{s.location}</span>
                                        </span>
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); submitSearch(); }}
                                    className="w-full border-t border-slate-100 px-4 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors text-left"
                                >
                                    See all results for &ldquo;{searchQuery.trim()}&rdquo;
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {isLoggedIn && user ? (
                        <>
                            {/* Notifications — global navbar bell (moved here from
                                the agent portal header). Placeholder until a real
                                notifications feed exists; no badge dot to avoid
                                implying unread items that don't exist. */}
                            <button
                                type="button"
                                aria-label="Notifications"
                                title="Notifications"
                                className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            >
                                <Bell className="h-5 w-5" />
                            </button>
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
                                        {user.role !== "admin" && (
                                            <Link
                                                href={getDashboardPath(user.role)}
                                                onClick={() => setMenuOpen(false)}
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <LayoutDashboard className="h-4 w-4 text-slate-400" />
                                                {getDashboardLabel(user.role)}
                                            </Link>
                                        )}
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
                        </>
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
                            <div className="relative mt-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
                                    placeholder="Search properties..."
                                    className="w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all"
                                />
                            </div>
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
