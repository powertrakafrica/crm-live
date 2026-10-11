import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Public browsing pages are crawlable; the role portals and account flows are
// not (they are login-gated by proxy.ts and have no indexable content).
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            allow: "/",
            disallow: ["/agent", "/agent-application", "/auth/", "/become-agent", "/client", "/onboarding", "/owner"],
            userAgent: "*",
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
