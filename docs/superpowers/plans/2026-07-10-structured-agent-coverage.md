# Structured Agent Coverage — teps-web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace teps-web's freeform `coverageAreas` CSV contract with the backend's structured coverage contract (`coverage: {items:[{regionId, constituencyIds}]}`) via a multi-region repeatable-rows `CoveragePicker` backed by `/api/geo/*`, and make the agent portal header/overview read structured coverage back.

**Architecture:** New `geoApi` + geo hooks + pure coverage transforms in `lib/`; one shared `CoveragePicker` component consumed by onboarding + `AgentProfile`; `agent/page.tsx` header + `AgentOverview.tsx` read coverage back. No backend changes, no auth changes (httpOnly cookies already wired in `lib/api.ts`).

**Tech Stack:** Next.js (app router, client components), React, TypeScript, lucide-react, Tailwind. **No test runner** — per-task gate is `npx tsc --noEmit`; final task adds `npm run build && npm run lint` + manual verification.

**Spec:** `/Volumes/apps/teps/backend/docs/superpowers/specs/2026-07-10-ghana-regions-frontend-coverage-design.md` (companion to the backend spec §7.2/§10).

## Global Constraints

- `CoverageItem = { regionId:number; constituencyIds:number[] | null }`; `null` or `[]` = whole region. (backend spec §7.2)
- `PUT /profile/agent` body: `coverage: { items: CoverageItem[] }`; backend validates region existence, constituency existence + membership, row cap (50), whole-region uniqueness → 400 on violation. Other body fields (`languages`, `specialties`, `momoNumber`, `momoNetwork`, `isOnboardingComplete`) unchanged.
- `GET /profile/agent` → `{ ...profile, coverage: { items: CoverageItem[] } }`; **no `coverageAreas`**.
- `/api/geo/regions?countryCode=GH` → `[{id, name, centroid:{lat,lng}}]`; `/api/geo/regions/:regionId/constituencies` → `[{id, name, code, centroid}]`; `/api/geo/constituencies` → `[{id, regionId, name, code, centroid}]` (flat).
- No new test runner (YAGNI). No backend or auth changes.
- Match each file's existing indent style: `AgentProfile.tsx` + `lib/api.ts` use 2-space; `onboarding/page.tsx` + `agent/page.tsx` + `AgentOverview.tsx` use 4-space.
- Commit after every task. Branch `feat/structured-agent-coverage` (already created off `dev`). Do NOT push (deploy gated on user confirmation).

---

### Task 1: `geoApi` + `CoverageItem` type + pure coverage transforms

**Files:**
- Create: `lib/coverage.ts`
- Modify: `lib/api.ts` (add `geoApi` + import the geo response types)

**Interfaces:**
- Produces: `CoverageItem`, `Coverage`, `GeoRegion`, `GeoConstituency` types and `coverageToItems` / `itemsToCoverage` / `resolveCoverageDisplay` / `coverageHeaderLabel` pure functions (`lib/coverage.ts`); `geoApi` (`lib/api.ts`). Later tasks import these.

- [ ] **Step 1: Create `lib/coverage.ts`** with exactly:

```ts
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
```

- [ ] **Step 2: Add `geoApi` to `lib/api.ts`.** At the top of `lib/api.ts`, add an import for the geo response types (after line 1):
```ts
import type { GeoRegion, GeoConstituency } from "./coverage";
```
Then add a new API section immediately after the `profileApi` block (after line 274, before the `// ─── Verifications ───` comment):
```ts
// ─── Geo ─────────────────────────────────────────────

export const geoApi = {
  regions: (countryCode = "GH") => {
    const qs = countryCode
      ? `?countryCode=${encodeURIComponent(countryCode)}`
      : "";
    return fetchJson<GeoRegion[]>(`/geo/regions${qs}`);
  },
  constituencies: (regionId: number) =>
    fetchJson<GeoConstituency[]>(`/geo/regions/${regionId}/constituencies`),
  allConstituencies: () => fetchJson<GeoConstituency[]>(`/geo/constituencies`),
};
```

- [ ] **Step 3: Type-gate**

Run: `npx tsc --noEmit`
Expected: pass with no errors (the new file + `geoApi` compile; nothing else changed).

- [ ] **Step 4: Commit**
```bash
git add lib/coverage.ts lib/api.ts
git commit -m "feat(coverage): geoApi + pure coverage transforms"
```

---

### Task 2: Geo hooks (`useGeoRegions`, `useConstituencies`)

**Files:**
- Create: `lib/hooks/geo.ts`

**Interfaces:**
- Consumes: `geoApi` (`lib/api.ts`), `GeoRegion`/`GeoConstituency` (`lib/coverage.ts`).
- Produces: `useGeoRegions()` → `{ data: GeoRegion[]; loading: boolean; error: string; retry: () => void }`; `useConstituencies(regionId: number | null)` → `{ data: GeoConstituency[]; loading: boolean; error: string }`. Module-level promise caches (regions once per session; constituencies once per region) — no SWR/React Query in the repo.

- [ ] **Step 1: Create `lib/hooks/geo.ts`** with exactly:
```ts
"use client";

import { useEffect, useState } from "react";
import { geoApi } from "@/lib/api";
import type { GeoConstituency, GeoRegion } from "@/lib/coverage";

// Module-level promise caches: regions load once per session; constituencies
// load once per region and are reused. (No SWR/React Query in the repo.)
let regionsPromise: Promise<GeoRegion[]> | null = null;
const constituenciesCache = new Map<number, Promise<GeoConstituency[]>>();

function fetchRegions(): Promise<GeoRegion[]> {
  if (!regionsPromise) {
    regionsPromise = geoApi.regions().catch((err) => {
      regionsPromise = null; // allow retry on failure
      throw err;
    });
  }
  return regionsPromise;
}

function fetchConstituencies(regionId: number): Promise<GeoConstituency[]> {
  let p = constituenciesCache.get(regionId);
  if (!p) {
    p = geoApi.constituencies(regionId).catch((err) => {
      constituenciesCache.delete(regionId);
      throw err;
    });
    constituenciesCache.set(regionId, p);
  }
  return p;
}

export function useGeoRegions() {
  const [data, setData] = useState<GeoRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchRegions()
      .then((r) => {
        if (alive) {
          setData(r);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load regions");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  const retry = () => {
    regionsPromise = null;
    setNonce((n) => n + 1);
  };
  return { data, loading, error, retry };
}

export function useConstituencies(regionId: number | null) {
  const [data, setData] = useState<GeoConstituency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (regionId == null) {
      setData([]);
      setLoading(false);
      setError("");
      return;
    }
    let alive = true;
    setLoading(true);
    fetchConstituencies(regionId)
      .then((c) => {
        if (alive) {
          setData(c);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (alive)
          setError(e instanceof Error ? e.message : "Failed to load constituencies");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [regionId]);

  return { data, loading, error };
}
```

- [ ] **Step 2: Type-gate**

Run: `npx tsc --noEmit`
Expected: pass.

- [ ] **Step 3: Commit**
```bash
git add lib/hooks/geo.ts
git commit -m "feat(coverage): useGeoRegions + useConstituencies hooks"
```

---

### Task 3: `CoveragePicker` component (repeatable rows)

**Files:**
- Create: `app/(portals)/agent/components/CoveragePicker.tsx`

**Interfaces:**
- Consumes: `useGeoRegions` / `useConstituencies` (`lib/hooks/geo.ts`), `CoverageItem` (`lib/coverage.ts`).
- Produces: `CoveragePicker` — props `{ value: CoverageItem[]; onChange: (items: CoverageItem[]) => void; errors?: string[] }`. Controlled, stateless. One row per item; "Add another region" appends `{regionId, constituencyIds:null}`; duplicate regions disallowed; region change resets that row's `constituencyIds` to `null`; whole-region checkbox sets `constituencyIds=null`; unchecked → `[]` (then constituency chips toggle ids in/out).

- [ ] **Step 1: Create `app/(portals)/agent/components/CoveragePicker.tsx`** with exactly:
```tsx
"use client";

import { Loader2, MapPin, X } from "lucide-react";
import { useConstituencies, useGeoRegions } from "@/lib/hooks/geo";
import type { CoverageItem, GeoConstituency, GeoRegion } from "@/lib/coverage";

interface CoveragePickerProps {
  value: CoverageItem[];
  onChange: (items: CoverageItem[]) => void;
  errors?: string[];
}

export function CoveragePicker({ value, onChange, errors }: CoveragePickerProps) {
  const { data: regions, loading, error, retry } = useGeoRegions();

  const update = (index: number, patch: Partial<CoverageItem>) =>
    onChange(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => {
    const used = new Set(value.map((it) => it.regionId));
    const next = regions.find((r) => !used.has(r.id));
    if (next) onChange([...value, { regionId: next.id, constituencyIds: null }]);
  };
  const setRegion = (index: number, regionId: number) =>
    update(index, { regionId, constituencyIds: null });
  const toggleWhole = (index: number, whole: boolean) =>
    update(index, { constituencyIds: whole ? null : [] });
  const toggleConstituency = (index: number, id: number) =>
    update(index, {
      constituencyIds: (() => {
        const cur = value[index].constituencyIds ?? [];
        return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      })(),
    });

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-charcoal-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading regions…
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-sm text-red-700">
        {error}{" "}
        <button type="button" onClick={retry} className="underline font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <CoverageRow
          key={item.regionId}
          item={item}
          regions={regions}
          onRegionChange={(rid) => setRegion(i, rid)}
          onToggleWhole={(w) => toggleWhole(i, w)}
          onToggleConstituency={(id) => toggleConstituency(i, id)}
          onRemove={() => remove(i)}
        />
      ))}
      <button
        type="button"
        onClick={add}
        disabled={value.length >= regions.length}
        className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800 disabled:text-charcoal-300"
      >
        <MapPin className="h-4 w-4" /> + Add another region
      </button>
      {errors && errors.length > 0 && (
        <ul className="text-xs text-red-700 list-disc pl-4">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface CoverageRowProps {
  item: CoverageItem;
  regions: GeoRegion[];
  onRegionChange: (regionId: number) => void;
  onToggleWhole: (whole: boolean) => void;
  onToggleConstituency: (id: number) => void;
  onRemove: () => void;
}

function CoverageRow({
  item,
  regions,
  onRegionChange,
  onToggleWhole,
  onToggleConstituency,
  onRemove,
}: CoverageRowProps) {
  const isWhole = item.constituencyIds === null;
  const { data: constituencies, loading } = useConstituencies(
    isWhole ? null : item.regionId,
  );
  return (
    <div className="border border-charcoal-200 rounded-sm p-3 space-y-2 bg-white">
      <div className="flex items-center gap-2">
        <select
          value={item.regionId}
          onChange={(e) => onRegionChange(Number(e.target.value))}
          className="flex-1 bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm px-3 py-2 outline-none font-bold text-charcoal-900"
        >
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs font-bold text-charcoal-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isWhole}
            onChange={(e) => onToggleWhole(e.target.checked)}
          />
          Whole region
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="text-charcoal-400 hover:text-red-500"
          aria-label="Remove region"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!isWhole &&
        (loading ? (
          <div className="text-xs text-charcoal-400 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading constituencies…
          </div>
        ) : constituencies.length === 0 ? (
          <p className="text-xs text-charcoal-400">
            No constituencies available for this region.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {constituencies.map((c: GeoConstituency) => {
              const sel = (item.constituencyIds ?? []).includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleConstituency(c.id)}
                  className={`text-xs font-bold px-2 py-1 rounded-sm border ${
                    sel
                      ? "bg-brand-50 border-brand-300 text-brand-800"
                      : "bg-white border-charcoal-200 text-charcoal-600 hover:border-charcoal-300"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-gate**

Run: `npx tsc --noEmit`
Expected: pass.

- [ ] **Step 3: Commit**
```bash
git add "app/(portals)/agent/components/CoveragePicker.tsx"
git commit -m "feat(coverage): multi-region repeatable-rows CoveragePicker"
```

---

### Task 4: Wire `AgentProfile.tsx` to structured coverage

**Files:**
- Modify: `app/(portals)/agent/components/AgentProfile.tsx`

**Interfaces:**
- Consumes: `CoveragePicker` (Task 3), `coverageToItems`/`itemsToCoverage`/`CoverageItem` (`lib/coverage.ts`).
- Removes: `ALL_CONSTITUENCIES`, `primaryRegion` state, `selectedConstituencies` state, `toggleConstituency`. Keeps `splitCsv` for languages/specialties.

- [ ] **Step 1: Update imports + interface.** Replace the `AgentProfile` interface (lines 39-48) `coverageAreas: string | null;` field (line 41) with `coverage?: { items: CoverageItem[] };`. Add to the existing `@/lib/api` import line (line 25) nothing extra; add a new import after line 25:
```ts
import { CoveragePicker } from "./CoveragePicker";
import { coverageToItems, itemsToCoverage, type CoverageItem } from "@/lib/coverage";
```

- [ ] **Step 2: Remove dead constants.** Delete the `ALL_CONSTITUENCIES` array (lines 66-73).

- [ ] **Step 3: Replace coverage state.** Delete the `primaryRegion` state (line 105) and the `selectedConstituencies` state (lines 106-108). Add in their place:
```ts
  const [coverageItems, setCoverageItems] = useState<CoverageItem[]>([]);
  const [coverageErrors, setCoverageErrors] = useState<string[]>([]);
```

- [ ] **Step 4: Load structured coverage.** In the `.then(([user, agent]) => { ... })` block (lines 140-147), replace `setSelectedConstituencies(splitCsv(agent.coverageAreas));` (line 144) with:
```ts
          setCoverageItems(coverageToItems(agent.coverage));
```
(leave the `setSelectedLanguages` / `setSelectedSpecialties` lines as-is).

- [ ] **Step 5: Remove `toggleConstituency`.** Delete the `toggleConstituency` function (lines 153-157).

- [ ] **Step 6: Update save.** In `handleSave` (lines 171-188), replace the `profileApi.updateAgentProfile({ ... })` body (lines 175-180) with:
```ts
      await profileApi.updateAgentProfile({
        coverage: itemsToCoverage(coverageItems),
        languages: selectedLanguages.join(","),
        specialties: selectedSpecialties.join(","),
        isOnboardingComplete: true,
      });
      setCoverageErrors([]);
```
And in the `catch` block, if the error is a coverage validation 400, surface it: replace `setError(err.message || "Save failed");` with:
```ts
      const msg = err?.message || "Save failed";
      setError(msg);
      if (err?.status === 400) setCoverageErrors([msg]);
```

- [ ] **Step 7: Replace the Coverage Area card body.** Replace the entire `<CardContent className="p-6 space-y-4"> … </CardContent>` content for the Coverage Area card (lines 514-580 — the `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">` block with the Primary Region select and Active Constituencies chips) with:
```tsx
            <CardContent className="p-6 space-y-4">
              <CoveragePicker
                value={coverageItems}
                onChange={setCoverageItems}
                errors={coverageErrors}
              />
            </CardContent>
```
(Leave the surrounding `<Card>…<CardHeader>…</CardHeader>` and closing `</Card>` exactly as-is; only the `CardContent` children change.)

- [ ] **Step 8: Type-gate**

Run: `npx tsc --noEmit`
Expected: pass. (If `splitCsv` is now flagged as unused because the only remaining callers are languages/specialties — it is still used there, so it stays. `coverageAreas` no longer referenced anywhere — confirm no lingering references.)

- [ ] **Step 9: Commit**
```bash
git add "app/(portals)/agent/components/AgentProfile.tsx"
git commit -m "feat(coverage): AgentProfile uses structured coverage + CoveragePicker"
```

---

### Task 5: Wire `app/onboarding/page.tsx` to structured coverage

**Files:**
- Modify: `app/onboarding/page.tsx`

**Interfaces:**
- Consumes: `CoveragePicker` (Task 3), `coverageToItems`/`itemsToCoverage`/`CoverageItem` (`lib/coverage.ts`).
- Removes: `ALL_CONSTITUENCIES`, `selectedConstituencies` state, `toggleConstituency`. Fresh-start flow (no preload) is preserved.

- [ ] **Step 1: Update imports + remove dead constant.** After the existing `import { api, profileApi } from "@/lib/api";` (line 17), add:
```ts
import { CoveragePicker } from "@/app/(portals)/agent/components/CoveragePicker";
import { itemsToCoverage, type CoverageItem } from "@/lib/coverage";
```
Delete the `ALL_CONSTITUENCIES` array (lines 27-34).

- [ ] **Step 2: Replace coverage state.** Replace `const [selectedConstituencies, setSelectedConstituencies] = useState<string[]>([]);` (line 43) with:
```ts
    const [coverageItems, setCoverageItems] = useState<CoverageItem[]>([]);
```

- [ ] **Step 3: Remove `toggleConstituency`.** Delete the `toggleConstituency` function (lines 56-60).

- [ ] **Step 4: Update `canProceed` step 1.** Replace `if (step === 1) return selectedConstituencies.length > 0;` (line 75) with:
```ts
        if (step === 1) return coverageItems.length > 0;
```

- [ ] **Step 5: Update `handleComplete` PUT body.** In `handleComplete` (lines 81-99), replace the `profileApi.updateAgentProfile({ … })` body (lines 85-92) with:
```ts
            await profileApi.updateAgentProfile({
                coverage: itemsToCoverage(coverageItems),
                languages: selectedLanguages.join(","),
                specialties: selectedSpecialties.join(","),
                momoNumber,
                momoNetwork,
                isOnboardingComplete: true,
            });
```

- [ ] **Step 6: Replace the step-1 coverage UI.** Replace the step-1 card body — the `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> {ALL_CONSTITUENCIES.map(…)} </div>` block (lines 155-182) — with:
```tsx
                            <CoveragePicker
                                value={coverageItems}
                                onChange={setCoverageItems}
                            />
```
Also update the step-1 subheading (line 151) from `Select the constituencies you want to cover` to `Select the regions and constituencies you want to cover`. Leave the surrounding card markup (the header with the MapPin icon, lines 144-154) and the closing `</div>` (line 183) as-is.

- [ ] **Step 7: Type-gate**

Run: `npx tsc --noEmit`
Expected: pass.

- [ ] **Step 8: Commit**
```bash
git add app/onboarding/page.tsx
git commit -m "feat(coverage): onboarding uses multi-region CoveragePicker"
```

---

### Task 6: Agent portal header + overview read structured coverage

**Files:**
- Modify: `app/(portals)/agent/page.tsx`
- Modify: `app/(portals)/agent/components/AgentOverview.tsx`

**Interfaces:**
- Consumes: `useGeoRegions` (`lib/hooks/geo.ts`), `coverageToItems`/`coverageHeaderLabel` (`lib/coverage.ts`).
- Fixes: the header currently always shows "Ghana Territory" (the optional-chained `coverageAreas` read is always falsy now); `AgentOverview` shows a hardcoded "Greater Accra".

- [ ] **Step 1: `agent/page.tsx` imports + state.** After `import { agentApi, profileApi } from "@/lib/api";` (line 16), add:
```ts
import { useGeoRegions } from "@/lib/hooks/geo";
import { coverageHeaderLabel, coverageToItems, type CoverageItem } from "@/lib/coverage";
```
Change the `agentProfile` state type (line 22) from `{ coverageAreas?: string | null; fullName?: string }` to `{ coverage?: { items: CoverageItem[] }; fullName?: string }`.

- [ ] **Step 2: `agent/page.tsx` resolve region label.** Inside `AgentPortal()`, after the `useEffect` (line 31), add:
```ts
    const { data: regions } = useGeoRegions();
```
Replace the `assignedRegion` derivation (lines 37-39):
```ts
    const assignedRegion = agentProfile?.coverageAreas
        ? agentProfile.coverageAreas.split(",")[0]?.trim() ?? "Ghana"
        : "Ghana";
```
with:
```ts
    const assignedRegion = coverageHeaderLabel(
        coverageToItems(agentProfile?.coverage),
        regions,
    );
```

- [ ] **Step 3: `agent/page.tsx` pass label to overview.** Change the overview render (line 105) from `<AgentOverview />` to:
```tsx
                        {activeTab === "overview" && <AgentOverview regionLabel={assignedRegion} />}
```

- [ ] **Step 4: `AgentOverview.tsx` accept + use the label.** Change the component signature (line 16) from `export function AgentOverview() {` to:
```ts
export function AgentOverview({ regionLabel }: { regionLabel?: string }) {
```
Replace the hardcoded `Greater Accra` (line 61) with:
```tsx
                        {regionLabel ?? "Ghana"}
```

- [ ] **Step 5: Type-gate**

Run: `npx tsc --noEmit`
Expected: pass.

- [ ] **Step 6: Commit**
```bash
git add "app/(portals)/agent/page.tsx" "app/(portals)/agent/components/AgentOverview.tsx"
git commit -m "fix(coverage): portal header + overview read structured coverage"
```

---

### Task 7: Full build, lint, manual verification

**Files:**
- None modified (verification only; commit only if lint surfaces fixable issues).

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: Next.js build succeeds (tsc + build). No type errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no NEW errors or warnings versus the pre-branch baseline. (Capture the baseline count on `dev` first if needed: `git stash && npm run lint` then `git stash pop` — or just confirm no errors reference the files this branch touched: `lib/coverage.ts`, `lib/hooks/geo.ts`, `lib/api.ts`, `CoveragePicker.tsx`, `AgentProfile.tsx`, `onboarding/page.tsx`, `agent/page.tsx`, `AgentOverview.tsx`.) If the new files introduce any lint error, fix it and amend the relevant task commit.

- [ ] **Step 3: Manual verification (run `npm run dev`, log in as an agent)**

Checklist:
1. Onboarding (`/onboarding`) step 1 shows the multi-region picker; add a region, toggle "Whole region" off, pick constituencies; Continue is enabled only once ≥1 region is added; Complete Setup persists (no 400).
2. Reload onboarding — note it starts fresh (no preload), by design.
3. Agent profile (`/agent` → Profile tab): picker shows the saved regions/constituencies; edit and Save shows "Saved"; a re-load shows the same items (round-trip).
4. Agent portal header shows the actual region name (e.g. `Greater Accra Territory`), not `Ghana Territory`; with 2 regions it shows `Greater Accra +1 Regions Territory`.
5. Overview "Territory Coverage" label matches the header region.
6. Force a backend 400 (e.g. via devtools, send a coverage item with a bogus `regionId`): the error message surfaces under the picker.

- [ ] **Step 4: Commit any lint fixes**
```bash
git add -A
git commit -m "chore(coverage): lint cleanup"  # only if needed
```

- [ ] **Step 5: Report**
Report: branch `feat/structured-agent-coverage` ready; `npm run build` green; `npm run lint` no new issues; manual checklist results. **Do NOT push** — deploy is gated on explicit user confirmation (teps-web likely deploys via the `live/dev` remote).