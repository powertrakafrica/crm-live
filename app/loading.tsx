// Route-level loading UI. Next wraps each route segment in a Suspense boundary
// and renders the nearest loading.tsx while that segment is loading. Kept
// intentionally lightweight (no data fetching, no client JS) so it paints fast.
export default function Loading() {
    return (
        <div
            className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50"
            role="status"
            aria-live="polite"
        >
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-100 mb-5">
                    <span className="h-7 w-7 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                </div>
                <h1 className="text-xl font-heading font-bold text-slate-900">
                    Loading
                </h1>
                <p className="mt-2 text-slate-500">Just a moment…</p>
                {/* Skeleton lines hint at upcoming content without layout shift. */}
                <div className="mt-6 space-y-3 max-w-sm mx-auto">
                    <div className="h-3 rounded-full bg-slate-200 animate-pulse" />
                    <div className="h-3 rounded-full bg-slate-200 animate-pulse w-5/6 mx-auto" />
                    <div className="h-3 rounded-full bg-slate-200 animate-pulse w-2/3 mx-auto" />
                </div>
                <span className="sr-only">Loading content…</span>
            </div>
        </div>
    );
}