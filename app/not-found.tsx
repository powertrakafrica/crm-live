import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";

// Rendered by Next for unmatched routes and for notFound() calls. It renders
// inside the root layout, so the site Header/Footer stay present.
export default function NotFound() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-100 text-brand-600 mb-5">
                    <Compass className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                    404
                </p>
                <h1 className="mt-1 text-2xl font-heading font-bold text-slate-900">
                    We can&apos;t find this page
                </h1>
                <p className="mt-2 text-slate-500">
                    The page may have moved or never existed. Try browsing properties,
                    or head back home.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <Link href="/">
                        <Button variant="primary" size="lg">
                            <Home className="h-4 w-4 mr-2" />
                            Home
                        </Button>
                    </Link>
                    <Link href="/properties">
                        <Button variant="outline" size="lg">
                            <Search className="h-4 w-4 mr-2" />
                            Browse properties
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}