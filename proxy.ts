import { jwtVerify, decodeJwt, errors as joseErrors } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
    "/",
    "/auth/forgot-password",
    "/auth/login",
    "/auth/reset-password",
    "/auth/signup",
    "/properties",
    "/regions",
];

// Public browsing routes with a dynamic segment (property / region /
// constituency detail pages). These only call public API endpoints, so they
// must be reachable — and indexable — without an account.
const PUBLIC_PREFIXES = ["/properties/", "/property/", "/region/", "/constituency/"];

// Server-only secret (NOT NEXT_PUBLIC_, so it never reaches the browser). Must
// match the backend's JWT_SECRET. When unset, we fall back to a presence-only
// cookie check — convenient for local dev where the secret may not be wired up,
// but it means a forged/tampered cookie would pass the gate. Production should
// always set JWT_SECRET so the signature is actually verified.
const jwtSecret = process.env.JWT_SECRET;
// jose needs a CryptoKey/Uint8Array for HS256, not a raw string. TextEncoder
// works in the edge runtime (no node:crypto import required).
const secretKey = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;

// Role-exclusive portals. Each portal may only be entered by its owning role;
// RBAC here is a UX routing layer that stops a client from wandering into
// /agent, etc. The backend enforces the real per-route role checks on every
// API call, so even a tampered role cookie can't exfiltrate data — it just
// lands the user on an empty portal whose API calls 401/403.
const PORTAL_PREFIXES = ["/agent", "/owner", "/client", "/onboarding"] as const;

const ROLE_ALLOWED_PORTALS: Record<string, readonly string[]> = {
    client: ["/client"],
    owner: ["/owner"],
    agent: ["/agent", "/onboarding"],
    admin: [],
};

const ROLE_HOME: Record<string, string> = {
    client: "/client",
    owner: "/owner",
    agent: "/agent",
    admin: "/",
};

function matchingPortal(pathname: string): string | null {
    for (const prefix of PORTAL_PREFIXES) {
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return prefix;
    }
    return null;
}

// Unverified decode for the role claim — used in the dev presence-only fallback
// and for expired access tokens (whose refresh cookie is still live). Routing
// only; never a security boundary.
function decodeRole(token: string): string {
    try {
        const payload = decodeJwt<{ role?: string }>(token);
        return payload.role ?? "";
    } catch {
        return "";
    }
}

// Sign-in pages a user with a live session has no reason to see.
const SIGNED_OUT_ONLY_PATHS = ["/auth/login", "/auth/signup"];

// Where to send an already-signed-in visitor who opens a sign-in page, or null
// to show the page. Only acts on a cookie whose signature AND expiry verify:
// an expired or unverifiable cookie must still reach the login form, otherwise
// a dead session could never sign in again. Admins are left alone — their home
// is the separate CRM app, which the login page itself redirects to.
async function signedInHome(request: NextRequest): Promise<null | string> {
    if (!secretKey) return null;
    const token = request.cookies.get("teps_access_token")?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify<{ role?: string }>(token, secretKey, { algorithms: ["HS256"] });
        const role = payload.role ?? "";
        return role !== "admin" && role in ROLE_HOME ? ROLE_HOME[role] : null;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (SIGNED_OUT_ONLY_PATHS.includes(pathname)) {
        const home = await signedInHome(request);
        if (home) return NextResponse.redirect(new URL(home, request.url));
    }

    // Allow public paths and static assets
    if (
        PUBLIC_PATHS.includes(pathname) ||
        PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
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

    // Resolve the user's role from the token. In verified mode we use the
    // verified payload; in the dev presence-only fallback (and for expired
    // access tokens, which the silent-refresh flow re-mints) we decode
    // unverified for routing only.
    let role = "";
    if (!secretKey) {
        // No secret configured → presence-only fallback (dev). A cookie exists,
        // so let the request through; the backend re-checks the real signature.
        role = decodeRole(token);
    } else {
        // Verify the signature (and pin the algorithm to prevent alg-confusion).
        // Expiry is handled leniently below — see comment in the catch block.
        try {
            const { payload } = await jwtVerify<{ role?: string }>(token, secretKey, { algorithms: ["HS256"] });
            role = payload.role ?? "";
        } catch (err) {
            // An expired access token is NOT a security problem: the token was once
            // valid and the refresh cookie (7d) is still live, so the client's
            // silent-refresh flow will mint a fresh access token on the first 401.
            // Redirecting here would kick idle users to login every 15m for no real
            // gain — the backend rejects expired tokens on actual API calls anyway.
            // Let the request through; decode the role unverified for RBAC routing.
            if (err instanceof joseErrors.JWTExpired) {
                role = decodeRole(token);
            } else {
                // Anything else (bad signature, malformed, wrong-secret, alg mismatch)
                // means the cookie is forged or tampered — drop it and re-authenticate.
                return NextResponse.redirect(loginUrl);
            }
        }
    }

    // Role-based access control: a user may only enter their own portal. A
    // cross-portal attempt is redirected to the user's role home (matching the
    // post-login redirect map in app/auth/login/page.tsx).
    const portal = matchingPortal(pathname);
    if (portal) {
        const allowed = ROLE_ALLOWED_PORTALS[role];
        if (!allowed || !allowed.includes(portal)) {
            const home = ROLE_HOME[role] ?? "/";
            return NextResponse.redirect(new URL(home, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};