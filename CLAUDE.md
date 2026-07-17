# CLAUDE.md — TEPS Web (teps-web)

Agent instructions for working in this repo. Read before editing.

## Gates (must be green before declaring a task done)

1. `npx tsc --noEmit` — **0 errors**.
2. `npm run lint` — no new problems vs the current baseline (~137 problems: 105 errors / 32 warnings).
   Do not add to the error count. If a new lint error appears, fix it — do not disable the rule.
3. There is **no test runner** in this repo — do not claim tests pass; verify via tsc + lint + manual
   read. (Backend and crm_dashboard have vitest; this repo does not.)

## Hard constraints (from project rules — do not violate)

- **Never print `DATABASE_URL` / connection strings.** (You rarely touch DB code here, but the rule holds.)
- **Never write to the shared remote DB during e2e.**
- Git: local commits on `dev` are permitted; **push / merge / deploy require explicit go-ahead.**

## Lint traps (these are ERRORS)

- `@typescript-eslint/no-explicit-any` is an **error** — use `unknown` + type guards, or proper types.
  `err: any` → `err: unknown`; API response types come from `lib/api.ts` generics.
- `react-hooks/set-state-in-effect` is active — don't call a state setter synchronously inside
  `useEffect` in a way that causes an extra render loop; structure effects to set state from
  async/event-driven paths.
- New JSX transform is in use — **do not** `import React` or reference `React.ReactNode`; import named
  types instead (`import type { ReactNode } from "react"`).

## Architecture notes that bite

- **Route guard is `proxy.ts`** (Next 16 renamed `middleware.ts` → `proxy.ts`, function `middleware` →
  `proxy`). It guards `/admin`, `/agent`, `/owner`, `/client`, `/onboarding` via the auth cookie.
  **RBAC here is UX-only** — the backend is the real authority. Non-portal routes (e.g.
  `/agent-application`) are reachable by any authenticated user; no proxy change is needed for a new
  top-level authenticated route. See the `teps-web-proxy-rbac` memory.
- **All API calls go through `lib/api.ts`** (`fetchJson`). `fetchJson` throws `new Error(data.error)`
  with the backend message; a 401 triggers `refreshAccessToken` then a retry. Add new endpoints as
  methods on the relevant `*Api` object (e.g. `agentApi.submitVerification`), not as ad-hoc `fetch` calls.
- **Uploads:** `uploadApi.presign` returns `{ url, publicUrl, key }` — `url` is the S3 PUT target,
  `publicUrl` is the stored CDN URL. PUT the file to `url`, then persist `publicUrl`. For private docs,
  render via `fileProxyUrl` (converts Spaces URLs to `${API_BASE}/files/<key>`).
- **Verification wiring:** the agent field-verification toggles must use the backend check enum
  (`OwnershipDocument`, `GPSLocation`, `LandCommissionSearch`, `PhotosMatch`, `BoundaryWall`,
  `UtilitiesConnected`) — not invented keys. Submitting a verification report calls
  `POST /api/agent/verifications/:id/submit` (no Pending checks may remain).

## Conventions

- Match the surrounding file's style (tailwind class ordering, component structure, named imports).
- Portals live under `app/(portals)/<role>/` with a `components/` subfolder; cross-portal shared UI goes
  in top-level `components/`.
- The TEPS Master Plan (in agent memory) is the authoritative roadmap; this repo's feature work is
  tracked there and in the backend `docs/superpowers/{specs,plans}/`.