// Real geo resolution for the public site.
//
// Public pages use SEO-friendly slug URLs (/region/greater-accra,
// /constituency/ayawaso-west) but the backend properties filter keys off the
// NUMERIC geo id (region_id / constituency_id). Passing the slug straight to
// `propertiesApi.list({ regionId })` made the backend do Number("greater-accra")
// → NaN → empty results, so every region/constituency page showed zero listings.
//
// These helpers bridge that gap: they fetch the real /api/geo/* reference data
// (public, cached for the page lifetime) and resolve a URL slug to the numeric
// geo record. Identity comes from the backend; the mock REGIONS/CONSTITUENCIES
// in lib/data.ts are only a fallback for display fields the geo API doesn't
// expose (capital city, district list) and a name-bridge for old slug URLs.

import { geoApi } from "./api";
import { CONSTITUENCIES, REGIONS } from "./data";

export type { GeoConstituency, GeoRegion } from "./coverage";
import type { GeoConstituency, GeoRegion } from "./coverage";

/** Lowercase, dash-separated, ASCII-only slug — the canonical URL form for names. */
export function slugify(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function ciEquals(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
}

let regionsCache: GeoRegion[] | null = null;
let constituenciesCache: GeoConstituency[] | null = null;

export async function fetchRegions(): Promise<GeoRegion[]> {
    if (regionsCache) return regionsCache;
    regionsCache = await geoApi.regions();
    return regionsCache;
}

export async function fetchAllConstituencies(): Promise<GeoConstituency[]> {
    if (constituenciesCache) return constituenciesCache;
    constituenciesCache = await geoApi.allConstituencies();
    return constituenciesCache;
}

/** Constituencies for a region, by numeric region id. */
export async function getConstituenciesForRegion(regionId: number): Promise<GeoConstituency[]> {
    return geoApi.constituencies(regionId);
}

/** Look up a real region by its numeric id. */
export async function getRegionById(id: number): Promise<GeoRegion | null> {
    const regions = await fetchRegions();
    return regions.find((r) => r.id === id) ?? null;
}

/**
 * Resolve a URL slug (or raw name) to the real geo region.
 *
 * Match order, most specific first:
 *  1. a real region whose slugified name equals the slug,
 *  2. a real region whose name equals the (decoded) slug verbatim,
 *  3. a mock REGIONS entry whose id/name matches the slug, bridged to a real
 *     region by name — covers the hand-authored slug URLs the home/regions
 *     pages still emit ("greater-accra") even when the real name slugifies
 *     differently.
 */
export async function getRegionBySlug(slug: string): Promise<GeoRegion | null> {
    const decoded = decodeURIComponent(slug);
    const regions = await fetchRegions();

    let match = regions.find((r) => slugify(r.name) === slug);
    if (!match) match = regions.find((r) => ciEquals(r.name, decoded));
    if (!match) {
        const mock = REGIONS.find(
            (r) => r.id === slug || slugify(r.name) === slug || ciEquals(r.name, decoded),
        );
        if (mock) match = regions.find((r) => ciEquals(r.name, mock.name));
    }
    return match ?? null;
}

/**
 * Resolve a URL slug (raw name, code, or numeric id) to the real constituency.
 * Same match-order strategy as getRegionBySlug, plus a code/id exact match.
 */
export async function getConstituencyBySlug(slug: string): Promise<GeoConstituency | null> {
    const decoded = decodeURIComponent(slug);
    const all = await fetchAllConstituencies();

    let match = all.find((c) => slugify(c.name) === slug);
    if (!match) match = all.find((c) => ciEquals(c.name, decoded));
    if (!match) match = all.find((c) => (c.code ?? "") === slug || String(c.id) === slug);
    if (!match) {
        const mock = CONSTITUENCIES.find(
            (c) => c.id === slug || slugify(c.name) === slug || ciEquals(c.name, decoded),
        );
        if (mock) match = all.find((c) => ciEquals(c.name, mock.name));
    }
    return match ?? null;
}

/**
 * Find the mock Region entry (lib/data.ts) for a real region — used to surface
 * display-only fields the geo API doesn't provide (capital city). Returns
 * undefined when no mock entry matches the real region name.
 */
export function mockRegionFor(real: GeoRegion | null) {
    if (!real) return undefined;
    return REGIONS.find((r) => ciEquals(r.name, real.name));
}

/** Find the mock Constituency entry for a real constituency (district list). */
export function mockConstituencyFor(real: GeoConstituency | null) {
    if (!real) return undefined;
    return CONSTITUENCIES.find((c) => ciEquals(c.name, real.name));
}