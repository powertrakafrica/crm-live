import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/signup", "/properties", "/about", "/contact"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths and static assets
    if (
        PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/properties/")) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/img") ||
        pathname.startsWith("/api")
    ) {
        return NextResponse.next();
    }

    // Check for auth cookie
    const token = request.cookies.get("teps_auth")?.value;
    if (!token) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
