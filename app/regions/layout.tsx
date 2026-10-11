import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
    alternates: { canonical: "/regions" },
    description: "Explore verified properties by region across Ghana.",
    title: "Regions",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
