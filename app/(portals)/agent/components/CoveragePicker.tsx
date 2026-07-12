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
  const setRegion = (index: number, regionId: number) => {
    if (value.some((it, i) => i !== index && it.regionId === regionId)) return;
    update(index, { regionId, constituencyIds: null });
  };
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
          usedRegionIds={value.map((it) => it.regionId)}
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
  usedRegionIds: number[];
  onRegionChange: (regionId: number) => void;
  onToggleWhole: (whole: boolean) => void;
  onToggleConstituency: (id: number) => void;
  onRemove: () => void;
}

function CoverageRow({
  item,
  regions,
  usedRegionIds,
  onRegionChange,
  onToggleWhole,
  onToggleConstituency,
  onRemove,
}: CoverageRowProps) {
  const isWhole = item.constituencyIds === null;
  const { data: constituencies, loading, error, retry } = useConstituencies(
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
          {regions.find((r) => r.id === item.regionId) ? null : (
            <option value={item.regionId} disabled>
              Region #{item.regionId} (deleted)
            </option>
          )}
          {regions.map((r) => (
            <option
              key={r.id}
              value={r.id}
              disabled={usedRegionIds.includes(r.id) && r.id !== item.regionId}
            >
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
        ) : error ? (
          <div className="text-xs text-red-700">
            {error}{" "}
            <button type="button" onClick={retry} className="underline font-bold">
              Retry
            </button>
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