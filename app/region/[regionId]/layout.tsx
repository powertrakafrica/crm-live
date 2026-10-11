import type { Metadata } from "next";
import type { ReactNode } from "react";

import type { GeoRegionDetail } from "@/lib/coverage";
import { fetchPublic } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ regionId: string }> }): Promise<Metadata> {
    const { regionId } = await params;
    const id = Number(regionId);
    if (!Number.isInteger(id)) return { title: "Region" };

    const region = await fetchPublic<GeoRegionDetail>(`/geo/regions/${id}`);
    if (!region?.name) return { title: "Region" };

    return {
        alternates: { canonical: `/region/${id}` },
        description: `Verified properties for rent and sale in ${region.name}, Ghana.`,
        title: `Properties in ${region.name}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
