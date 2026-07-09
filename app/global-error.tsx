"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

// Catches errors thrown in the root layout itself. Per Next.js convention,
// this file owns the entire document (it replaces app/layout.tsx while active),
// so it must render its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    if (typeof console !== "undefined") {
        console.error("Global error boundary:", error.digest ?? error.message);
    }
    return (
        <html lang="en">
            <body>
                <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
                    <div className="w-full max-w-md text-center">
                        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-100 text-red-600 mb-5">
                            <AlertTriangle className="h-7 w-7" />
                        </div>
                        <h1 className="text-2xl font-heading font-bold text-slate-900">Something went wrong</h1>
                        <p className="mt-2 text-slate-500">
                            An unexpected error occurred while loading the application. Please try again.
                        </p>
                        <button
                            type="button"
                            onClick={reset}
                            className="mt-6 inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-brand-600 text-white text-base font-semibold hover:bg-brand-700 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}