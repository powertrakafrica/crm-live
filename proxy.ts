import { jwtVerify, errors as joseErrors } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/signup", "/properties", "/about", "/contact"];

// Server-only secret (NOT NEXT_PUBLIC_, so it never reaches the browser). Must
// match the backend's JWT_SECRET. When unset, we fall back to a presence-only
// cookie check — convenient for local dev where the secret may not be wired up,
// but it means a forged/tampered cookie would pass the gate. Production should
// always set JWT_SECRET so the signature is actually verified.
const jwtSecret = process.env.JWT_SECRET;
// jose needs a CryptoKey/Uint8Array for HS256, not a raw string. TextEncoder
// works in the edge runtime (no node:crypto import required).
const secretKey = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;

export async function proxy(request: NextRequest) {
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

    // Check for the HttpOnly access cookie. Next middleware runs server-side,
    // so it can read HttpOnly cookies (httpOnly only blocks client JS).
    const token = request.cookies.get("teps_access_token")?.value;
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    if (!token) {
        return NextResponse.redirect(loginUrl);
    }

    // No secret configured → presence-only fallback (dev). A cookie exists, so
    // let the request through; the backend re-checks the real signature.
    if (!secretKey) {
        return NextResponse.next();
    }

    // Verify the signature (and pin the algorithm to prevent alg-confusion).
    // Expiry is handled leniently below — see comment in the catch block.
    try {
        await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
        return NextResponse.next();
    } catch (err) {
        // An expired access token is NOT a security problem: the token was once
        // valid and the refresh cookie (7d) is still live, so the client's
        // silent-refresh flow will mint a fresh access token on the first 401.
        // Redirecting here would kick idle users to login every 15m for no real
        // gain — the backend rejects expired tokens on actual API calls anyway.
        // Let the request through; the client refresh handles the rest.
        if (err instanceof joseErrors.JWTExpired) {
            return NextResponse.next();
        }
        // Anything else (bad signature, malformed, wrong-secret, alg mismatch)
        // means the cookie is forged or tampered — drop it and re-authenticate.
        return NextResponse.redirect(loginUrl);
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};