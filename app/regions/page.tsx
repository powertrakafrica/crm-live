"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ChevronRight, Loader2 } from "lucide-react";
import InteractiveMap from "@/components/InteractiveMap";
import { Card } from "@/components/ui/Card";
import { propertiesApi } from "@/lib/api";
import { useGeoRegions } from "@/lib/hooks/geo";

interface PropertyListResponse {
  pagination?: { total: number };
}

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function RegionsPage() {
  const router = useRouter();
  const { data: regions, loading: regionsLoading, error, retry } = useGeoRegions();
  const [regionCounts, setRegionCounts] = useState<Record<number, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);

  // name → numeric id, for resolving the map's region-name clicks.
  const regionByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of regions) m.set(normalizeName(r.name), r.id);
    return m;
  }, [regions]);

  useEffect(() => {
    if (regions.length === 0) return;
    Promise.all(
      regions.map((r) =>
        propertiesApi
          .list({ regionId: String(r.id), status: "Live", limit: "1" })
          .then((res: unknown) => {
            const r2 = res as PropertyListResponse;
            return [r.id, r2.pagination?.total ?? 0] as [number, number];
          })
          .catch(() => [r.id, 0] as [number, number]),
      ),
    ).then((results) => {
      const map: Record<number, number> = {};
      for (const [id, count] of results) map[id] = count;
      setRegionCounts(map);
      setCountsLoading(false);
    });
  }, [regions]);

  const handleMapRegionSelect = (rawCode: string) => {
    const id = regionByName.get(normalizeName(rawCode));
    if (id != null) router.push(`/region/${id}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-slate-950 mb-2">
                Explore by <span className="text-brand-600">Region</span>
              </h1>
              <p className="text-lg text-slate-600 font-medium max-w-2xl">
                Click any region on the map or select from the list to browse
                verified listings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout: Map + Region List */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-150">
          {/* Left: Map */}
          <div className="lg:col-span-2 bg-white rounded-xl p-2 sm:p-4 shadow-sm border border-slate-200 flex flex-col h-full">
            <InteractiveMap
              height="flex-1 min-h-[400px]"
              onRegionSelect={handleMapRegionSelect}
            />
          </div>

          {/* Right: Selectable Region List */}
          <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-heading font-bold text-slate-900">
                  Select a Region
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {regions.length} regions across Ghana
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-slate-500 font-medium mb-3">{error}</p>
                    <button
                      onClick={retry}
                      className="text-sm font-bold text-brand-600 hover:text-brand-700"
                    >
                      Try again
                    </button>
                  </div>
                ) : regionsLoading || countsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600 mb-2" />
                    <p className="text-sm text-slate-500 font-medium">
                      Loading region data...
                    </p>
                  </div>
                ) : (
                  regions.map((region) => {
                    const count = regionCounts[region.id] ?? 0;
                    const isHovered = hoveredRegion === region.id;
                    return (
                      <Link
                        key={region.id}
                        href={`/region/${region.id}`}
                        onMouseEnter={() => setHoveredRegion(region.id)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        className="block group"
                      >
                        <Card
                          className={`p-4 border transition-all ${
                            isHovered
                              ? "border-brand-300 shadow-md bg-brand-50/40"
                              : "border-slate-200 hover:border-brand-300 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`inline-flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
                                  isHovered
                                    ? "bg-brand-100 text-brand-700"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
                                }`}
                              >
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div>
                                <h3
                                  className={`font-heading font-bold text-sm transition-colors ${
                                    isHovered
                                      ? "text-brand-800"
                                      : "text-slate-900 group-hover:text-brand-700"
                                  }`}
                                >
                                  {region.name}
                                </h3>
                              </div>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 transition-colors ${
                                isHovered
                                  ? "text-brand-500"
                                  : "text-slate-300 group-hover:text-brand-500"
                              }`}
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="bg-brand-50 text-brand-700 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
                              {count.toLocaleString()} listings
                            </span>
                          </div>
                        </Card>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
