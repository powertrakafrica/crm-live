"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Catches errors in the auth flow (login/signup). Offers a retry and a
// link back to the login page.
export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    if (typeof console !== "undefined") {
        console.error("Auth flow error:", error.digest ?? error.message);
    }
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-100 text-red-600 mb-5">
                    <AlertTriangle className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-heading font-bold text-slate-900">Authentication problem</h1>
                <p className="mt-2 text-slate-500">
                    Something went wrong during sign-in. Please try again.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <Button onClick={reset} variant="primary" size="lg">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try again
                    </Button>
                    <Link href="/auth/login">
                        <Button variant="outline" size="lg">
                            <LogIn className="h-4 w-4 mr-2" />
                            Back to login
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}