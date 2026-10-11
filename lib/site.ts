// Server-side helpers for SEO surfaces (metadata, sitemap, robots). No
// "use client" — these run in server components / route handlers only.

import { API_BASE } from "./api";

// Canonical public origin of this app. Production MUST set NEXT_PUBLIC_SITE_URL,
// otherwise canonical/OG/sitemap URLs point at localhost.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "TEPS";

// Public (unauthenticated) GET against the backend, cached for an hour. Returns
// null on any failure so metadata/sitemap generation degrades to static
// defaults instead of failing the page or the build.
export async function fetchPublic<T>(path: string): Promise<null | T> {
    try {
        const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}
