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

  // `setLoading`/`setError` here run in an event handler (allowed) — the effect
  // itself no longer calls setState synchronously (react-hooks/set-state-in-effect).
  // On first mount `loading` starts `true` via the initializer; on retry we set it
  // here before bumping the nonce that re-triggers the effect.
  const retry = () => {
    regionsPromise = null;
    setLoading(true);
    setError("");
    setNonce((n) => n + 1);
  };
  return { data, loading, error, retry };
}

export function useConstituencies(regionId: number | null) {
  const [data, setData] = useState<GeoConstituency[]>([]);
  const [loading, setLoading] = useState<boolean>(regionId != null);
  const [error, setError] = useState("");
  const [prevRegionId, setPrevRegionId] = useState<number | null>(regionId);

  // React-blessed "adjust state during render" when the prop changes: clears
  // stale data and sets loading for the new region WITHOUT calling setState
  // synchronously inside the effect (react-hooks/set-state-in-effect). The guard
  // (regionId !== prevRegionId) plus the immediate setPrevRegionId prevents a
  // render loop. The effect below only fetches; all its setState calls are in
  // async callbacks (then/catch/finally), which the rule allows.
  if (regionId !== prevRegionId) {
    setPrevRegionId(regionId);
    setData([]);
    setError("");
    setLoading(regionId != null);
  }

  useEffect(() => {
    if (regionId == null) return;
    let alive = true;
    fetchConstituencies(regionId)
      .then((c) => {
        if (alive) {
          setData(c);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load constituencies");
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