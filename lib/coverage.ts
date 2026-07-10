// Pure transforms between the backend structured-coverage contract and UI state.
// No React — kept separate so it is unit-testable in principle and reusable
// across onboarding, AgentProfile, the portal header, and crm_dashboard.

export interface CoverageItem {
  regionId: number;
  constituencyIds: number[] | null; // null or [] = whole region
}

export interface Coverage {
  items: CoverageItem[];
}

export interface GeoRegion {
  id: number;
  name: string;
  centroid?: { lat: number; lng: number };
}

export interface GeoConstituency {
  id: number;
  regionId: number;
  name: string;
  code?: string;
  centroid?: { lat: number; lng: number };
}

/** Extract items from a GET /profile/agent `coverage` object (tolerant of null/undefined). */
export function coverageToItems(coverage: unknown): CoverageItem[] {
  if (!coverage || typeof coverage !== "object") return [];
  const items = (coverage as Coverage).items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (it): it is CoverageItem =>
        !!it && typeof (it as CoverageItem).regionId === "number",
    )
    .map((it) => ({
      regionId: it.regionId,
      constituencyIds: Array.isArray(it.constituencyIds) ? it.constituencyIds : null,
    }));
}

/** Build the PUT /profile/agent `coverage` body from UI state. */
export function itemsToCoverage(items: CoverageItem[]): Coverage {
  return { items };
}

export interface CoverageDisplayRow {
  regionName: string;
  constituencyNames: string[] | null; // null = whole region
}

/** Resolve items to human-readable rows using geo reference data. Ids that miss
 *  (e.g. a deleted region) fall back to `Region #<id>` / `Constituency #<id>`. */
export function resolveCoverageDisplay(
  items: CoverageItem[],
  regions: GeoRegion[],
  allConstituencies: GeoConstituency[],
): CoverageDisplayRow[] {
  const regionName = (id: number) =>
    regions.find((r) => r.id === id)?.name ?? `Region #${id}`;
  const constituencyName = (id: number) =>
    allConstituencies.find((c) => c.id === id)?.name ?? `Constituency #${id}`;
  return items.map((it) => ({
    regionName: regionName(it.regionId),
    constituencyNames:
      it.constituencyIds && it.constituencyIds.length > 0
        ? it.constituencyIds.map(constituencyName)
        : null,
  }));
}

/** Short label for the portal header: first region name, "Name +N Regions",
 *  or "Ghana" fallback. Only needs regions (not constituencies). */
export function coverageHeaderLabel(
  items: CoverageItem[],
  regions: GeoRegion[],
): string {
  if (items.length === 0) return "Ghana";
  const names = items.map(
    (it) =>
      regions.find((r) => r.id === it.regionId)?.name ?? `Region #${it.regionId}`,
  );
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} Regions`;
}