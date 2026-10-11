import type { Metadata } from "next";

import { VerifyEmail } from "./VerifyEmail";

export const metadata: Metadata = {
    title: "Confirm your email",
};

// Server component: reads the `token` query param from the signup email link
// and hands it to the client component (no useSearchParams Suspense boundary).
// Without a token the page is the "send the link again" form.
export default async function VerifyEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string | string[] }>;
}) {
    const { token } = await searchParams;
    return <VerifyEmail token={typeof token === "string" ? token : ""} />;
}
