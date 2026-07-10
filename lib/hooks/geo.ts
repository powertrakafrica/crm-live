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