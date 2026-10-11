import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
    alternates: { canonical: "/properties" },
    description: "Browse verified homes, land and commercial spaces for rent and sale across Ghana.",
    title: "Properties",
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
