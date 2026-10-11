// One canonical key for a Ghana region name, whatever vocabulary it came from.
//
// Three sources name the same 16 regions differently:
//   - the map GeoJSON (public/json/gh.json):  "Greater Accra", "Northern East"
//   - the backend geo API (/api/geo/regions): "Greater Accra Region", "North East Region"
//   - URL slugs / the mock REGIONS list:      "greater-accra", "north-east"
// Comparing those strings directly never matches, which broke map clicks,
// region highlighting and slug URLs. Everything that matches a region by name
// must go through `regionKey` / `findRegionByName`.
//
// Dependency-free on purpose (no imports) so it is safe in server and client code.

// GeoJSON spellings that differ from the official region name by more than the
// "Region" suffix. Keys and values are already in `regionKey` form.
const ALIASES: Record<string, string> = {
    "northern east": "north east",
};

/** Lowercase, punctuation-free, without the trailing "Region" — e.g. "greater accra". */
export function regionKey(name: string): string {
    const key = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+region$/, "");
    return ALIASES[key] ?? key;
}

/** Find the region whose name matches a map feature name, API name or URL slug. */
export function findRegionByName<T extends { name: string }>(regions: readonly T[], nameOrSlug: string): T | undefined {
    const key = regionKey(nameOrSlug);
    if (!key) return undefined;
    return regions.find((r) => regionKey(r.name) === key);
}
