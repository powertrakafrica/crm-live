import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fetchPublic } from "@/lib/site";

interface PropertySummary {
    description?: null | string;
    images?: { url?: string }[];
    location?: null | string;
    title?: string;
}

// The page is a client component, so per-listing metadata (title, description,
// share image) is generated here from the public property endpoint.
export async function generateMetadata({ params }: { params: Promise<{ propertyId: string }> }): Promise<Metadata> {
    const { propertyId } = await params;
    const id = Number(propertyId);
    if (!Number.isInteger(id)) return { title: "Property" };

    const property = await fetchPublic<PropertySummary>(`/properties/${id}`);
    if (!property?.title) return { title: "Property" };

    const title = property.location ? `${property.title} in ${property.location}` : property.title;
    const description = property.description?.trim().slice(0, 160) || undefined;
    const image = property.images?.find((i) => i.url)?.url;
    return {
        alternates: { canonical: `/property/${id}` },
        description,
        openGraph: { description, images: image ? [image] : undefined, title, type: "website" },
        title,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
