# TEPS Web (teps-web)

Next.js 16 public site + role portals for **TEPS — Estates & Property Services (Ghana)**.

- Public property marketplace (search, map, property detail, enquiries)
- Role portals under `app/(portals)/`: **admin**, **owner**, **agent**, **client**
- Auth pages under `app/auth/`; agent enlistment wizard at `app/agent-application/`; agent onboarding
  at `app/onboarding/`

## Stack

- **Next.js 16.1.6** (App Router) + **React 19** + Tailwind CSS
- `jose` for JWT cookie handling, `leaflet` / `react-leaflet` for maps, `lucide-react` icons
- `@aws-sdk/s3-request-presigner` for direct-to-S3 presigned uploads
- **No test runner** — quality gate is `tsc --noEmit` + ESLint (see below)

## Prerequisites

- Node.js (see `package.json`), a running TEPS backend, a `.env` (copy from `.env.example`).
- Env vars: `NEXT_PUBLIC_API_URL` (backend base, e.g. `http://localhost:3001`), `JWT_SECRET`
  (shared with backend for cookie verification), `NEXT_PUBLIC_CRM_URL` (link to the CRM dashboard).

## Common scripts

| Script | Command | Notes |
|---|---|---|
| `npm run dev` | `next dev` | Dev server |
| `npm run build` | `next build` | Production build |
| `npm start` | `next start` | Run the production build |
| `npm run lint` | `eslint` | ESLint (keep ≤ baseline) |

## Quality gate (must pass before a task is done)

1. `npx tsc --noEmit` — **0 errors**.
2. `npm run lint` — no new problems vs the current baseline (~137 problems: 105 errors / 32 warnings).
   Do not add to the error count.

## Project layout

- `app/` — App Router pages. Portals under `app/(portals)/{admin,owner,agent,client}/`; public pages at
  the root and under `app/property/[propertyId]/`, `app/region/…`, `app/constituency/…`.
- `proxy.ts` — the Next 16 route guard (renamed from `middleware.ts`; the function is `proxy`).
- `lib/api.ts` — the backend API surface (`fetchJson` wrapper + per-domain `authApi`/`propertiesApi`/
  `ownerApi`/`agentApi`/`clientApi`/`adminApi`/`profileApi`/`uploadApi`/…). All API calls go through here.
- `components/` — shared UI (cards, badges, buttons, `PropertyCard`, `InteractiveMap`, modals).
- `app/(portals)/*/components/` — portal-specific components.

## Route guarding

`proxy.ts` guards the portal prefixes (`/admin`, `/agent`, `/owner`, `/client`, `/onboarding`) by
checking the auth cookie. **This is UX-only** — the backend (`requireRole` /
`requireVerifiedAgent`) is the real RBAC authority. Non-portal routes (e.g. `/agent-application`) are
reachable by any authenticated user.