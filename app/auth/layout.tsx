import type { Metadata } from "next";
import type { ReactNode } from "react";

// Sign-in / sign-up / password-reset flows have nothing worth indexing.
export const metadata: Metadata = {
    robots: { index: false },
};

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
