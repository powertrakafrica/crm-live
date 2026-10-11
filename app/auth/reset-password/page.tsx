import type { Metadata } from "next";

import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
    robots: { index: false },
    title: "Reset password",
};

// Server component: reads the `token` query param (from the WhatsApp reset
// link) and hands it to the client form. Doing this here avoids a
// useSearchParams Suspense boundary in the client component.
export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string | string[] }>;
}) {
    const { token } = await searchParams;
    return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}
