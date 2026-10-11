import type { Metadata } from "next";
import type { ReactNode } from "react";

import type { GeoConstituencyDetail } from "@/lib/coverage";
import { fetchPublic } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ constituencyId: string }> }): Promise<Metadata> {
    const { constituencyId } = await params;
    const id = Number(constituencyId);
    if (!Number.isInteger(id)) return { title: "Constituency" };

    const constituency = await fetchPublic<GeoConstituencyDetail>(`/geo/constituencies/${id}`);
    if (!constituency?.name) return { title: "Constituency" };

    const place = constituency.regionName ? `${constituency.name}, ${constituency.regionName}` : constituency.name;
    return {
        alternates: { canonical: `/constituency/${id}` },
        description: `Verified properties for rent and sale in ${place}, Ghana.`,
        title: `Properties in ${place}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
