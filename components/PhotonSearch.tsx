"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_id?: number;
    osm_type?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface PhotonSearchProps {
  value: string;
  onChange: (value: string, feature?: PhotonFeature) => void;
  placeholder?: string;
  className?: string;
  limit?: number;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

export function PhotonSearch({
  value,
  onChange,
  placeholder = "Search location...",
  className = "",
  limit = 5,
}: PhotonSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => fetchResults(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchResults = async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      // Bias around Ghana center to prioritize Ghana results
      const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${limit}&lat=6.5&lon=-1.5`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("Photon error");
      const data = await res.json();
      const features: PhotonFeature[] = (data.features ?? []).slice(0, limit);
      setResults(features);
      setOpen(features.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (f: PhotonFeature) => {
    const { name, street, city, state, country } = f.properties;
    const parts = [name, street, city, state].filter(Boolean);
    if (country && country !== "Ghana") parts.push(country);
    return parts.join(", ") || "Unknown location";
  };

  const handleSelect = (f: PhotonFeature) => {
    const label = formatLabel(f);
    setQuery(label);
    setOpen(false);
    onChange(label, f);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value, undefined);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white border border-charcoal-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm rounded-sm pl-9 pr-9 py-3s outline-none font-medium text-charcoal-900"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-charcoal-200 rounded-sm shadow-lg max-h-60 overflow-y-auto">
          {results.map((f, i) => {
            const label = formatLabel(f);
            return (
              <button
                key={`${f.properties.osm_type}-${f.properties.osm_id}-${i}`}
                onClick={() => handleSelect(f)}
                className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors flex items-start gap-2 ${
                  i === activeIndex
                    ? "bg-brand-50 text-brand-800"
                    : "text-charcoal-700 hover:bg-charcoal-50"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { PhotonFeature };
