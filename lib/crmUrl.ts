// CRM dashboard URL resolution.
//
// The admin portal is served by the separate `crm_dashboard` app (Vite). Before
// its removal, teps-crm ran on Next.js port 3000 and the fallback below pointed
// there. With teps-crm gone, the dev fallback is the crm_dashboard Vite dev
// server (:5173), and production MUST set NEXT_PUBLIC_CRM_URL to the deployed
// crm_dashboard URL — otherwise admin login silently redirects to localhost.

const CRM_URL_DEV_FALLBACK = "http://localhost:5173";

export function getCrmUrl(): string {
    const url = process.env.NEXT_PUBLIC_CRM_URL;
    if (url) return url;
    if (process.env.NODE_ENV === "production") {
        // eslint-disable-next-line no-console
        console.warn(
            "NEXT_PUBLIC_CRM_URL is not set. Admin login will redirect to a localhost fallback. Set it to the deployed crm_dashboard URL."
        );
    }
    return CRM_URL_DEV_FALLBACK;
}