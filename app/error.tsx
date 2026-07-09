"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Catches errors in the public site segments (home, properties, regions,
// property detail). Renders inside the root layout, so Header/Footer stay.
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    if (typeof console !== "undefined") {
        console.error("Route error:", error.digest ?? error.message);
    }
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-100 text-red-600 mb-5">
                    <AlertTriangle className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-heading font-bold text-slate-900">This page hit a snag</h1>
                <p className="mt-2 text-slate-500">
                    We couldn&apos;t load this page. Try again, or head back home.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <Button onClick={reset} variant="primary" size="lg">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try again
                    </Button>
                    <Link href="/">
                        <Button variant="outline" size="lg">
                            <Home className="h-4 w-4 mr-2" />
                            Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}