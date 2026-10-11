import type { MetadataRoute } from "next";

import type { GeoConstituency, GeoRegion } from "@/lib/coverage";
import { fetchPublic, SITE_URL } from "@/lib/site";

// Regenerate hourly rather than at build time, so new Live listings appear
// without a redeploy and a build never depends on the API being reachable.
export const revalidate = 3600;

const PROPERTY_PAGE_SIZE = 100;
// Safety cap on listing pages walked per regeneration (10k listings).
const MAX_PROPERTY_PAGES = 100;

interface PropertyListPage {
    data: { id: number; updatedAt?: string }[];
    pagination: { totalPages: number };
}

async function liveProperties(): Promise<PropertyListPage["data"]> {
    const all: PropertyListPage["data"] = [];
    for (let page = 1; page <= MAX_PROPERTY_PAGES; page++) {
        const res = await fetchPublic<PropertyListPage>(`/properties?status=Live&limit=${PROPERTY_PAGE_SIZE}&page=${page}`);
        if (!res || !Array.isArray(res.data)) break;
        all.push(...res.data);
        if (page >= (res.pagination?.totalPages ?? 0)) break;
    }
    return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [regions, constituencies, properties] = await Promise.all([
        fetchPublic<GeoRegion[]>("/geo/regions?countryCode=GH"),
        fetchPublic<GeoConstituency[]>("/geo/constituencies"),
        liveProperties(),
    ]);

    return [
        { changeFrequency: "daily", priority: 1, url: `${SITE_URL}/` },
        { changeFrequency: "hourly", priority: 0.9, url: `${SITE_URL}/properties` },
        { changeFrequency: "weekly", priority: 0.6, url: `${SITE_URL}/regions` },
        ...(Array.isArray(regions) ? regions : []).map((r) => ({
            changeFrequency: "weekly" as const,
            priority: 0.5,
            url: `${SITE_URL}/region/${r.id}`,
        })),
        ...(Array.isArray(constituencies) ? constituencies : []).map((c) => ({
            changeFrequency: "weekly" as const,
            priority: 0.4,
            url: `${SITE_URL}/constituency/${c.id}`,
        })),
        ...properties.map((p) => ({
            changeFrequency: "daily" as const,
            lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
            priority: 0.8,
            url: `${SITE_URL}/property/${p.id}`,
        })),
    ];
}
